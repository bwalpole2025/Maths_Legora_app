// The core invariant, defined once and independently.
//
// ARCHITECTURE.md: the model is never the origin of a correctness claim. Every
// correctness-shaped statement served to a student must be backed by a recorded
// verification/diagnosis call. This module is the single, reusable definition of
// that invariant — used by the standing regression (prompt 13).
//
// The correctness-shape detector here is deliberately INDEPENDENT of (and at
// least as strict as) both gates — src/gate.ts (orchestrator) and
// src/prompt/gate.ts (reference). A standing guard must not trust the very code
// it guards: a bug in either gate's own detector must not also disable this one.

import type { MathsClaim, TutorReply, VerificationStatus } from '@imaia/contracts';
import type { TurnContext } from './prompt/systemPrompt.js';
import type { TurnTrace } from './types.js';

// Union of the orchestrator gate's CORRECTNESS_SHAPE and the reference gate's
// RESULT_PHRASES: a sentence that asserts a final answer, a verdict, or a mark.
const RESULT_PHRASES: RegExp[] = [
  /\bthe (?:final )?answer is\b/i,
  /\bis (?:correct|right|valid|wrong|incorrect)\b/i,
  /\bthat(?:'s| is) (?:correct|right|valid|wrong)\b/i,
  /\bequals\b/i,
  /[a-z]\s*=\s*[-0-9(]/i, // "x = 2"
  /=\s*[-0-9(]/, // "... = 4"
  /\b\d+\s*(?:of\s*\d+\s*)?marks?\b/i, // "4 marks", "4 of 6 marks"
  /\bscores?\s+\d+\b/i,
];

export function isCorrectnessShaped(text: string): boolean {
  return RESULT_PHRASES.some((re) => re.test(text));
}

const CORRECTNESS_VALUES: ReadonlySet<string> = new Set(['correct', 'incorrect', 'indeterminate']);

function isCorrectnessStatus(
  status: MathsClaim['verificationStatus'],
): status is VerificationStatus {
  return CORRECTNESS_VALUES.has(status);
}

export type InvariantViolationKind = 'unbacked_correctness' | 'mislabelled_correctness';

export interface InvariantViolation {
  kind: InvariantViolationKind;
  claimText: string;
  detail: string;
}

/** The core check. Given the set of statuses actually backed by recorded
 *  truth-layer calls this turn: no claim may assert correctness without a backing
 *  call, and no `not_a_correctness_claim` may be correctness-shaped. */
function findClaimViolations(
  claims: MathsClaim[],
  backedStatuses: ReadonlySet<VerificationStatus>,
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const claim of claims) {
    if (isCorrectnessStatus(claim.verificationStatus)) {
      if (!backedStatuses.has(claim.verificationStatus)) {
        violations.push({
          kind: 'unbacked_correctness',
          claimText: claim.text,
          detail: `correctness claim (status=${claim.verificationStatus}) has no matching recorded verification/diagnosis call`,
        });
      }
    } else if (isCorrectnessShaped(claim.text)) {
      violations.push({
        kind: 'mislabelled_correctness',
        claimText: claim.text,
        detail: `tagged not_a_correctness_claim but the text asserts a result: ${JSON.stringify(claim.text)}`,
      });
    }
  }
  return violations;
}

/** The served reply: correctness may only come from the recorded `trace`. */
export function findReplyViolations(reply: TutorReply): InvariantViolation[] {
  const trace = reply.trace as TurnTrace;
  const backed = new Set<VerificationStatus>(trace.verificationCalls.map((v) => v.status));
  return findClaimViolations(reply.claims, backed);
}

/** Throw if the served reply carries any unverified correctness. */
export function assertReplyInvariant(reply: TutorReply): void {
  const violations = findReplyViolations(reply);
  if (violations.length > 0) {
    throw new Error(
      'INVARIANT VIOLATION — unverified correctness reached the reply:\n' +
        violations.map((v) => `  [${v.kind}] ${v.detail}`).join('\n'),
    );
  }
}

/** Reference-gate layer (prompt-09 red-team data): backing is the set of verified
 *  results present in the turn context. */
export function findGateViolations(claims: MathsClaim[], ctx: TurnContext): InvariantViolation[] {
  const backed = new Set<VerificationStatus>(ctx.verifiedResults.map((r) => r.status));
  return findClaimViolations(claims, backed);
}
