// Integration: drive handleTurn over three golden problems against the REAL
// Python maths service (SymPy verifier), proving the served solution matches the
// verified one and the trace records the verification call.
//
// Run the service first:
//   cd services/maths && .venv/bin/uvicorn app.main:app --port 8000
// If it isn't reachable, these tests are skipped (not failed).

import { describe, expect, it } from 'vitest';
import { createOrchestrator } from '../src/orchestrator.js';
import { HttpVerificationService } from '../src/clients/verification.js';
import { referenceModelClient } from '../src/model-reference.js';
import type { SessionState, TurnTrace } from '../src/types.js';
import { FakeDiagnosis, FakeRetrieval } from './fakes.js';
import golden from '../fixtures/golden-problems.json' with { type: 'json' };

const MATHS_URL = process.env.MATHS_URL ?? 'http://localhost:8000';

async function reachable(): Promise<boolean> {
  try {
    const res = await fetch(`${MATHS_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

const serviceUp = await reachable();
if (!serviceUp) {
  console.warn(
    `[integration skipped] maths service unreachable at ${MATHS_URL}. Start it with: ` +
      `cd services/maths && .venv/bin/uvicorn app.main:app --port 8000`,
  );
}

describe('integration: golden problems vs the real maths service', () => {
  for (const g of golden) {
    it.skipIf(!serviceUp)(`serves the verified result for ${g.id} (${g.expectedStatus})`, async () => {
      const verification = new HttpVerificationService(MATHS_URL);
      const orchestrator = createOrchestrator({
        retrieval: new FakeRetrieval(),
        verification,
        diagnosis: new FakeDiagnosis(),
        model: referenceModelClient,
      });

      const state: SessionState = {
        problem: { problemLatex: g.problemLatex },
        candidateAnswerLatex: g.candidateAnswerLatex,
      };
      const reply = await orchestrator.handleTurn(
        { message: `Is $${g.candidateAnswerLatex}$ the answer to $${g.problemLatex}$?`, mode: 'full' },
        state,
      );

      // The truth comes straight from the SymPy verifier.
      const direct = await verification.verifyAnswer({
        problemLatex: g.problemLatex,
        candidateAnswerLatex: g.candidateAnswerLatex,
      });
      expect(direct.status).toBe(g.expectedStatus);

      // The trace records the verification call...
      expect((reply.trace as TurnTrace).verificationCalls).toContainEqual({
        kind: 'verifyAnswer',
        status: direct.status,
      });
      // ...the served correctness claim carries the verifier's status (served == verified)...
      expect(reply.claims.some((c) => c.verificationStatus === direct.status)).toBe(true);
      // ...and the served solution echoes the verified canonical answer.
      if (direct.canonicalAnswerLatex) {
        expect(reply.reply).toContain(direct.canonicalAnswerLatex);
      }
    });
  }
});
