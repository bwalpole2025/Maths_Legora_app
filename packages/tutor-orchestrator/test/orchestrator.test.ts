import { describe, expect, it } from 'vitest';
import { createOrchestrator, type OrchestratorDeps } from '../src/orchestrator.js';
import { referenceModelClient } from '../src/model-reference.js';
import type { SessionState, TurnTrace } from '../src/types.js';
import { FakeDiagnosis, FakeModel, FakeRetrieval, FakeVerification } from './fakes.js';

function deps(over: Partial<OrchestratorDeps> = {}): OrchestratorDeps {
  return {
    retrieval: new FakeRetrieval(),
    verification: new FakeVerification(),
    diagnosis: new FakeDiagnosis(),
    model: referenceModelClient,
    ...over,
  };
}

describe('handleTurn — routing, always-retrieve-first, verify-before-generate', () => {
  it('curriculum: retrieves first, makes NO verification/diagnosis call', async () => {
    const d = deps();
    const o = createOrchestrator(d);
    const reply = await o.handleTurn({ message: 'Is integration by parts on the spec?' }, {});

    expect(reply.claimType).toBe('curriculum');
    expect((d.retrieval as FakeRetrieval).calls).toBe(1);
    expect((d.verification as FakeVerification).answerCalls).toHaveLength(0);
    expect((d.diagnosis as FakeDiagnosis).calls).toHaveLength(0);
    expect((reply.trace as TurnTrace).verificationCalls).toHaveLength(0);
    expect((reply.trace as TurnTrace).retrievalHits).toContain('edexcel-9ma0#6.2');
    expect(reply.reply.length).toBeGreaterThan(0);
  });

  it('hint: retrieves, never calls verification, reveals no answer', async () => {
    const d = deps();
    const o = createOrchestrator(d);
    const reply = await o.handleTurn({ message: 'Give me a hint.' }, {});

    expect(reply.claimType).toBe('hint');
    expect((d.verification as FakeVerification).answerCalls).toHaveLength(0);
    expect(reply.claims.every((c) => c.verificationStatus === 'not_a_correctness_claim')).toBe(true);
  });

  it('full_solution: verifies BEFORE generation and narrates the verified status', async () => {
    const verification = new FakeVerification({
      status: 'correct',
      canonicalAnswerLatex: 'x^2 + 2x + 1',
      method: 'sympy',
    });
    const o = createOrchestrator(deps({ verification }));
    const state: SessionState = {
      problem: { problemLatex: '(x+1)^2' },
      candidateAnswerLatex: 'x^2 + 2x + 1',
    };
    const reply = await o.handleTurn(
      { message: 'Is x^2 + 2x + 1 the answer?', problemId: 'q1', mode: 'full' },
      state,
    );

    expect(reply.claimType).toBe('full_solution');
    expect(verification.answerCalls).toHaveLength(1);
    expect((reply.trace as TurnTrace).verificationCalls).toEqual([{ kind: 'verifyAnswer', status: 'correct' }]);
    expect(reply.claims.some((c) => c.verificationStatus === 'correct')).toBe(true);
  });

  it('mark_working: calls diagnosis BEFORE generation and records the trace', async () => {
    const diagnosis = new FakeDiagnosis({
      marksAwarded: 1,
      marksAvailable: 2,
      firstDivergenceIndex: 1,
      perStep: [],
      ecfApplied: false,
    });
    const o = createOrchestrator(deps({ diagnosis }));
    const state: SessionState = {
      problem: { problemLatex: 'Simplify 2x + 3x' },
      studentStepsLatex: ['5x', 'wrong'],
    };
    const reply = await o.handleTurn({ message: 'Mark my working please.', attachmentRef: 'img1' }, state);

    expect(reply.claimType).toBe('mark_working');
    expect(diagnosis.calls).toHaveLength(1);
    expect((reply.trace as TurnTrace).verificationCalls[0]).toEqual({ kind: 'markWorking', status: 'incorrect' });
  });

  it('strips an unverified correctness claim end-to-end when the model misbehaves', async () => {
    const model = new FakeModel([{ text: 'The answer is 42.', assertsCorrectness: true, citationRefs: [] }]);
    const o = createOrchestrator(deps({ model }));
    const reply = await o.handleTurn({ message: 'Explain integration by parts.' }, {});

    expect(reply.claims).toHaveLength(0);
    expect(reply.reply).not.toContain('42');
  });
});
