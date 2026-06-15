// The correctness gate (pure) — where the architecture invariant is enforced.
//
// The model proposes claims; the gate is the authority. A claim that asserts a
// maths result survives ONLY if a verification/diagnosis call backs this turn,
// and its verificationStatus is stamped from the SERVICE result, never the
// model's opinion. Unbacked correctness claims — including correctness-shaped
// sentences the model mislabeled as "not_a_correctness_claim" — are stripped.
// The final reply is recomposed from the surviving claims, so stripping a claim
// cleanly excises its sentence.

import type {
  Citation,
  ClaimType,
  MarkWorkingResult,
  MathsClaim,
  RetrievedChunk,
  VerificationStatus,
} from '@imaia/contracts';
import type { ModelClaim, TurnMode, VerifiedFact } from './model.js';

export interface GateInput {
  modelClaims: ModelClaim[];
  claimType: ClaimType;
  verified?: VerifiedFact;
  mode: TurnMode;
  chunks: RetrievedChunk[];
}

export interface GateOutput {
  reply: string;
  claims: MathsClaim[];
}

// Conservative detector for sentences that assert a result/verdict. Used as a
// backstop against the model labeling a correctness claim as explanatory.
const CORRECTNESS_SHAPE =
  /\bthe (final )?answer is\b|\bis (correct|right|valid|wrong|incorrect)\b|\bthat(?:'s| is) (correct|right|valid|wrong)\b|earns?\s+\d+\s+(of\s+\d+\s+)?marks?|\bscores?\s+\d+\b/i;

export function gateClaims(input: GateInput): GateOutput {
  const { modelClaims, claimType, verified, mode, chunks } = input;
  const byRef = new Map<string, Citation>(chunks.map((c) => [c.citation.sourceRef, c.citation]));
  const verifiedStatus = verified ? statusOf(verified) : undefined;

  const claims: MathsClaim[] = [];
  for (const c of modelClaims) {
    const citations = c.citationRefs
      .map((r) => byRef.get(r))
      .filter((x): x is Citation => x !== undefined);

    if (c.assertsCorrectness) {
      // Allowed only when a service call backs this turn, and hint_only never
      // reveals a decisive result (except an explicit marking).
      const hidden = mode === 'hint_only' && claimType !== 'mark_working';
      if (verified === undefined || verifiedStatus === undefined || hidden) continue; // strip
      claims.push({ text: c.text, verificationStatus: verifiedStatus, citations });
      continue;
    }

    // Explanatory / curriculum / hint claim. It must NOT be correctness-shaped...
    if (CORRECTNESS_SHAPE.test(c.text)) continue; // mislabeled correctness sentence → strip
    // ...and a curriculum claim must cite a retrieved chunk, or it is not made.
    if (claimType === 'curriculum' && citations.length === 0) continue;
    claims.push({ text: c.text, verificationStatus: 'not_a_correctness_claim', citations });
  }

  return { reply: claims.map((c) => c.text).join(' ').trim(), claims };
}

function statusOf(v: VerifiedFact): VerificationStatus {
  return v.kind === 'markWorking' ? deriveMarkStatus(v.result) : v.result.status;
}

/** Collapse a marking result to a single status for the trace / claim stamp. */
export function deriveMarkStatus(r: MarkWorkingResult): VerificationStatus {
  if (r.marksAvailable > 0 && r.marksAwarded >= r.marksAvailable) return 'correct';
  if (r.firstDivergenceIndex !== null) return 'incorrect';
  return 'indeterminate';
}
