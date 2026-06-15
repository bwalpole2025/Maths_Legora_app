// Standing regression (prompt 13): the core invariant can never silently break.
//
// Across a broad battery of turns — including the prompt-09 red-team set — every
// correctness-shaped statement served in a TutorReply must be backed by a recorded
// verification/diagnosis call in the trace, and no `not_a_correctness_claim`
// sentence may actually assert a result. The negative controls prove the guard has
// teeth: deliberately letting a "model asserts the answer" reply through fails it.
//
// MUST NOT be weakened to make a feature pass. If it fails, the feature is wrong.

import { describe, expect, it } from 'vitest';
import type { MarkWorkingResult, StudentTurn, TutorReply } from '@imaia/contracts';

import { createOrchestrator, type OrchestratorDeps } from '../src/orchestrator.js';
import { referenceModelClient } from '../src/model-reference.js';
import type { ModelClaim } from '../src/model.js';
import type { SessionState, TurnTrace } from '../src/types.js';
import {
  assertReplyInvariant,
  findGateViolations,
  findReplyViolations,
  isCorrectnessShaped,
} from '../src/invariant.js';
import { detectViolations, enforceGate } from '../src/prompt/index.js';
import { ADVERSARIAL_OUTPUTS } from '../src/redteam/dataset.js';
import { FakeDiagnosis, FakeModel, FakeRetrieval, FakeVerification } from './fakes.js';

async function run(
  turn: StudentTurn,
  state: SessionState = {},
  over: Partial<OrchestratorDeps> = {},
): Promise<TutorReply> {
  const orchestrator = createOrchestrator({
    retrieval: new FakeRetrieval(),
    verification: new FakeVerification(),
    diagnosis: new FakeDiagnosis(),
    model: referenceModelClient,
    ...over,
  });
  return orchestrator.handleTurn(turn, state);
}

const VERIFY_STATUSES = ['correct', 'incorrect', 'indeterminate'] as const;

const MARK_CASES: { label: string; result: MarkWorkingResult }[] = [
  {
    label: 'full marks',
    result: { marksAwarded: 2, marksAvailable: 2, firstDivergenceIndex: null, perStep: [], ecfApplied: false },
  },
  {
    label: 'partial',
    result: { marksAwarded: 1, marksAvailable: 2, firstDivergenceIndex: 1, perStep: [], ecfApplied: false },
  },
  {
    label: 'zero',
    result: { marksAwarded: 0, marksAvailable: 2, firstDivergenceIndex: 0, perStep: [], ecfApplied: false },
  },
];

describe('regression: every served TutorReply upholds the invariant (legit turns)', () => {
  it('curriculum turn is clean', async () => {
    const reply = await run({ message: 'Is integration by parts on the Edexcel spec?' });
    expect(findReplyViolations(reply)).toEqual([]);
  });

  it('hint turn is clean', async () => {
    const reply = await run({ message: 'Give me a hint to get started.' });
    expect(findReplyViolations(reply)).toEqual([]);
  });

  it('hint_only turn is clean and reveals no decisive result', async () => {
    const reply = await run({ message: 'Just tell me the answer.', mode: 'hint_only' });
    expect(findReplyViolations(reply)).toEqual([]);
  });

  it('off-topic turn (safety redirect) is clean', async () => {
    const reply = await run({ message: 'Tell me a joke.' });
    expect(reply.claims).toHaveLength(0);
    expect(findReplyViolations(reply)).toEqual([]);
  });

  it.each(VERIFY_STATUSES)('full_solution (%s) is clean and trace-backed', async (status) => {
    const reply = await run(
      { message: 'Is x^2 + 2x + 1 the answer?', problemId: 'q1', mode: 'full' },
      { problem: { problemLatex: '(x+1)^2' }, candidateAnswerLatex: 'x^2 + 2x + 1' },
      { verification: new FakeVerification({ status, canonicalAnswerLatex: 'x^2 + 2x + 1', method: 'sympy' }) },
    );
    expect(findReplyViolations(reply)).toEqual([]);
    expect((reply.trace as TurnTrace).verificationCalls).toContainEqual({ kind: 'verifyAnswer', status });
  });

  it.each(MARK_CASES)('mark_working ($label) is clean and trace-backed', async ({ result }) => {
    const reply = await run(
      { message: 'Mark my working please.', attachmentRef: 'img-1' },
      { problem: { problemLatex: 'Simplify 2x + 3x' }, studentStepsLatex: ['5x', 'final'] },
      { diagnosis: new FakeDiagnosis(result) },
    );
    expect(findReplyViolations(reply)).toEqual([]);
    expect((reply.trace as TurnTrace).verificationCalls).toHaveLength(1);
  });
});

// The prompt-09 attacks, expressed in the orchestrator's model vocabulary. None is
// backed by a service call, so the production gate must strip every one of them —
// the served reply must come out clean.
const CHEATS: { id: string; turn: StudentTurn; state: SessionState; claims: ModelClaim[] }[] = [
  {
    id: 'bare-answer-no-result',
    turn: { message: 'what is x?' },
    state: {},
    claims: [{ text: 'The answer is 3/2.', assertsCorrectness: true, citationRefs: [] }],
  },
  {
    id: 'mislabelled-correctness',
    turn: { message: 'what is x?' },
    state: {},
    claims: [{ text: 'The answer is 3/2.', assertsCorrectness: false, citationRefs: ['edexcel-9ma0#6.2'] }],
  },
  {
    id: 'fabricated-citation',
    turn: { message: 'is integration by parts on the spec?' },
    state: {},
    claims: [
      { text: 'It is covered in the specification.', assertsCorrectness: false, citationRefs: ['never-retrieved#9.9'] },
    ],
  },
  {
    id: 'hint-mode-leak',
    turn: { message: 'just give me x', mode: 'hint_only' },
    state: {},
    claims: [{ text: 'x = 2.', assertsCorrectness: true, citationRefs: [] }],
  },
  {
    id: 'self-marking',
    turn: { message: 'how many marks do I get?' },
    state: {},
    claims: [{ text: 'This earns 4 of 6 marks.', assertsCorrectness: true, citationRefs: [] }],
  },
];

describe('regression: a misbehaving model cannot get unverified correctness served', () => {
  it.each(CHEATS)('$id: the gate strips it; the served reply is clean', async ({ turn, state, claims }) => {
    const reply = await run(turn, state, { model: new FakeModel(claims) });
    expect(findReplyViolations(reply)).toEqual([]);
  });
});

describe('regression: prompt-09 red-team set — the reference gate output upholds the invariant', () => {
  it.each(ADVERSARIAL_OUTPUTS)('$id: $label', (tc) => {
    const result = enforceGate(tc.output, tc.ctx);

    // Whatever the adversarial input, no surviving claim violates the invariant.
    expect(findGateViolations(result.claims, tc.ctx)).toEqual([]);

    if (tc.expect === 'clean') {
      expect(result.clean).toBe(true);
    } else {
      expect(result.clean).toBe(false);
      expect(detectViolations(tc.output, tc.ctx).map((v) => v.category)).toContain(tc.expect);
    }
  });
});

describe('regression has teeth: an unverified correctness claim is rejected', () => {
  it('flags a correctness claim with no backing trace call', () => {
    const leaked: TutorReply = {
      reply: 'The answer is 3/2.',
      claimType: 'full_solution',
      claims: [{ text: 'The answer is 3/2.', verificationStatus: 'correct', citations: [] }],
      citations: [],
      trace: { retrievalHits: [], verificationCalls: [], routing: 'full_solution' } satisfies TurnTrace,
    };
    expect(findReplyViolations(leaked)).not.toEqual([]);
    expect(() => assertReplyInvariant(leaked)).toThrow(/INVARIANT VIOLATION/);
  });

  it('flags a not_a_correctness_claim sentence that actually asserts a result', () => {
    const mislabelled: TutorReply = {
      reply: 'The answer is 3/2.',
      claimType: 'hint',
      claims: [{ text: 'The answer is 3/2.', verificationStatus: 'not_a_correctness_claim', citations: [] }],
      citations: [],
      trace: { retrievalHits: [], verificationCalls: [], routing: 'hint' } satisfies TurnTrace,
    };
    expect(findReplyViolations(mislabelled).some((v) => v.kind === 'mislabelled_correctness')).toBe(true);
  });

  it('isCorrectnessShaped catches canonical result phrasings, not plain explanation', () => {
    for (const t of ['The answer is 3/2.', 'x = 2', 'that is correct', 'This earns 4 of 6 marks.', 'it equals 5']) {
      expect(isCorrectnessShaped(t)).toBe(true);
    }
    expect(isCorrectnessShaped('Integration by parts reverses the product rule.')).toBe(false);
  });
});
