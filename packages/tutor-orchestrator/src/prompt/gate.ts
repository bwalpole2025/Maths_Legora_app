// REFERENCE correctness gate. This is the enforcement contract the orchestrator
// (prompt 08) wires into handleTurn, and the standing regression (prompt 13) checks.
// It is NOT the production orchestrator — it is a pure, testable function so prompt
// 09's red-team set has something concrete to assert against before prompt 08 exists.
//
// The invariant it enforces (ARCHITECTURE.md): a correctness-shaped claim survives
// only if it references a verified result that was actually present in the turn
// context. Everything else is stripped or re-routed. The model is never trusted to
// self-certify correctness.

import type { Citation, MathsClaim } from "@imaia/contracts";
import type { TutorModelOutput, ModelClaim } from "./outputContract.js";
import type { TurnContext } from "./systemPrompt.js";

export type ViolationCategory =
  | "unverified_correctness" // asserts correctness with no backing verified result
  | "mislabelled_correctness" // tagged not_a_correctness_claim but the text asserts a result
  | "fabricated_citation" // cites a sourceRef not present in the turn context
  | "hint_mode_leak"; // reveals the answer / a decisive result in hint_only mode

export interface Violation {
  claimIndex: number;
  category: ViolationCategory;
  detail: string;
}

// Heuristic: does this sentence assert a mathematical RESULT (a final answer, a
// correctness verdict, a mark)? Used to catch correctness sneaked past as prose.
const RESULT_PHRASES: RegExp[] = [
  /\bthe answer is\b/i,
  /\bis (?:correct|right|valid|wrong|incorrect)\b/i,
  /\bthat'?s (?:correct|right)\b/i,
  /\bequals\b/i,
  /[a-z]\s*=\s*[-0-9(]/i, // "x = 2", "y = -3"
  /=\s*[-0-9(]/, // "... = 4"
  /\b\d+\s*(?:of\s*\d+\s*)?marks?\b/i, // "4 marks", "4 of 6 marks"
];

function assertsResultPhrase(text: string): boolean {
  return RESULT_PHRASES.some((re) => re.test(text));
}

/** Inspect a model output against its turn context and list every gate violation. */
export function detectViolations(output: TutorModelOutput, ctx: TurnContext): Violation[] {
  const verifiedIds = new Set(ctx.verifiedResults.map((r) => r.id));
  const knownRefs = new Set(ctx.retrievedChunks.map((c) => c.citation.sourceRef));
  const violations: Violation[] = [];

  output.claims.forEach((claim, i) => {
    if (claim.assertsCorrectness) {
      if (claim.citesResultId === null || !verifiedIds.has(claim.citesResultId)) {
        violations.push({
          claimIndex: i,
          category: "unverified_correctness",
          detail: `correctness claim cites ${claim.citesResultId ?? "no result"}, which is not a verified result this turn`,
        });
      }
    } else if (assertsResultPhrase(claim.text)) {
      violations.push({
        claimIndex: i,
        category: "mislabelled_correctness",
        detail: `claim tagged not_a_correctness_claim but the text asserts a result: ${JSON.stringify(claim.text)}`,
      });
    }

    for (const ref of claim.citationRefs) {
      if (!knownRefs.has(ref)) {
        violations.push({
          claimIndex: i,
          category: "fabricated_citation",
          detail: `cites ${JSON.stringify(ref)}, which was not in the retrieved context`,
        });
      }
    }

    if (ctx.mode === "hint_only" && (claim.assertsCorrectness || assertsResultPhrase(claim.text))) {
      violations.push({
        claimIndex: i,
        category: "hint_mode_leak",
        detail: `reveals a decisive result in hint_only mode: ${JSON.stringify(claim.text)}`,
      });
    }
  });

  return violations;
}

/** Map a single (already non-violating) model claim to a contract MathsClaim. */
function toMathsClaim(claim: ModelClaim, ctx: TurnContext): MathsClaim {
  const byRef = new Map(ctx.retrievedChunks.map((c) => [c.citation.sourceRef, c.citation] as const));
  const citations: Citation[] = claim.citationRefs
    .map((ref) => byRef.get(ref))
    .filter((c): c is Citation => c !== undefined);

  // The model never sets a verificationStatus; we read it from the result it cited.
  let verificationStatus: MathsClaim["verificationStatus"] = "not_a_correctness_claim";
  if (claim.assertsCorrectness && claim.citesResultId !== null) {
    const result = ctx.verifiedResults.find((r) => r.id === claim.citesResultId);
    if (result) verificationStatus = result.status;
  }

  return { text: claim.text, verificationStatus, citations };
}

export interface GateResult {
  /** Claims that survived the gate, as contract MathsClaims. */
  claims: MathsClaim[];
  /** Indices of stripped claims and why. */
  violations: Violation[];
  /** True when nothing had to be stripped. */
  clean: boolean;
}

/** Enforce the gate: strip every claim with a violation, keep the rest, and report.
 *  A correctness claim never survives unless it cited a real verified result. */
export function enforceGate(output: TutorModelOutput, ctx: TurnContext): GateResult {
  const violations = detectViolations(output, ctx);
  const offending = new Set(violations.map((v) => v.claimIndex));

  const claims: MathsClaim[] = [];
  output.claims.forEach((claim, i) => {
    if (!offending.has(i)) claims.push(toMathsClaim(claim, ctx));
  });

  return { claims, violations, clean: violations.length === 0 };
}
