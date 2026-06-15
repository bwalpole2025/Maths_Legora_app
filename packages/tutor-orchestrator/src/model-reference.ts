// Deterministic reference ModelClient (no network).
//
// It narrates a verified fact (it never produces correctness itself) and grounds
// curriculum/hint claims in retrieved text. It lets the service run end-to-end
// now; prompt 09 replaces it with the Claude-backed client + LLM_RULES prompt.

import type {
  ModelClaim,
  ModelClient,
  ModelGenerationRequest,
  ModelGenerationResult,
} from './model.js';

export class ReferenceModelClient implements ModelClient {
  async generate(req: ModelGenerationRequest): Promise<ModelGenerationResult> {
    return { claims: buildClaims(req) };
  }
}

export const referenceModelClient = new ReferenceModelClient();

function buildClaims(req: ModelGenerationRequest): ModelClaim[] {
  const topRef = req.retrieved[0]?.citation.sourceRef;
  const refs = topRef ? [topRef] : [];

  if (req.verified?.kind === 'verifyAnswer') {
    const r = req.verified.result;
    const verdict =
      r.status === 'correct'
        ? 'matches'
        : r.status === 'incorrect'
          ? 'does not match'
          : 'could not be confirmed against';
    const canonical = r.canonicalAnswerLatex ? ` The verified answer is $${r.canonicalAnswerLatex}$.` : '';
    return [
      {
        text: `Your answer ${verdict} the verified result.${canonical}`.trim(),
        assertsCorrectness: true,
        citationRefs: refs,
      },
    ];
  }

  if (req.verified?.kind === 'markWorking') {
    const r = req.verified.result;
    const where =
      r.firstDivergenceIndex !== null
        ? ` Your working first diverges at step ${r.firstDivergenceIndex + 1}.`
        : '';
    return [
      {
        text: `This working earns ${r.marksAwarded} of ${r.marksAvailable} marks.${where}`,
        assertsCorrectness: true,
        citationRefs: refs,
      },
    ];
  }

  // curriculum / hint: explanatory, grounded, asserts no result.
  const grounded = req.retrieved[0]?.text;
  const text = grounded
    ? `Drawing on the retrieved material: ${firstSentence(grounded)}`
    : 'Here is some guidance to move you forward without giving away the answer.';
  return [{ text, assertsCorrectness: false, citationRefs: refs }];
}

function firstSentence(s: string): string {
  const m = s.match(/^[^.!?]*[.!?]/);
  return (m ? m[0] : s).trim();
}
