// The tutor orchestrator: classify → retrieve → verify/diagnose → generate →
// gate → TutorReply. This is the one place that enforces "ground it but still
// use it": correctness comes only from the services (step 3, BEFORE generation);
// the model narrates; the gate (step 5) strips anything unbacked.

import type {
  Citation,
  RetrievalQuery,
  StudentTurn,
  TutorOrchestrator,
  TutorReply,
  RetrievalService,
  VerificationService,
  DiagnosisService,
} from '@imaia/contracts';
import { assertNoPii } from '@imaia/compliance';
import { classifyTurn } from './classify.js';
import { deriveMarkStatus, gateClaims } from './gate.js';
import type { ModelClient, TurnMode, VerifiedFact } from './model.js';
import { enforceHintOnly, screenTurn } from './safety.js';
import type { SessionState, TurnTrace } from './types.js';

export interface OrchestratorDeps {
  retrieval: RetrievalService;
  verification: VerificationService;
  diagnosis: DiagnosisService;
  model: ModelClient;
}

export function createOrchestrator(deps: OrchestratorDeps): TutorOrchestrator {
  return {
    async handleTurn(turn: StudentTurn, sessionState: SessionState): Promise<TutorReply> {
      const state = (sessionState ?? {}) as SessionState;
      const claimType = classifyTurn(turn);
      const mode: TurnMode = turn.mode ?? 'full';
      const trace: TurnTrace = { retrievalHits: [], verificationCalls: [], routing: claimType };

      // 0) Safety boundary: refuse/redirect unsafe, circumventing, or off-topic turns
      //    BEFORE any retrieval, service, or model call. Appropriate for minors.
      const decision = screenTurn(turn);
      if (decision.action !== 'allow') {
        trace.safety = { action: decision.action, category: decision.category };
        assertNoPii(trace, 'trace');
        return { reply: decision.reply, claimType: 'curriculum', claims: [], citations: [], trace };
      }

      // 1) Always retrieve first; pin grounding + citations.
      const retrieval = await deps.retrieval.retrieve(buildQuery(turn));
      const chunks = retrieval.chunks;
      trace.retrievalHits = chunks.map((c) => c.citation.sourceRef);

      // 2) Get truth from a service BEFORE generation, for answer/marking turns.
      let verified: VerifiedFact | undefined;
      const problemLatex = state.problem?.problemLatex;

      if (claimType === 'full_solution' && problemLatex && state.candidateAnswerLatex !== undefined) {
        const result = await deps.verification.verifyAnswer({
          problemLatex,
          candidateAnswerLatex: state.candidateAnswerLatex,
        });
        verified = { kind: 'verifyAnswer', result };
        trace.verificationCalls.push({ kind: 'verifyAnswer', status: result.status });
      } else if (claimType === 'mark_working' && problemLatex && state.studentStepsLatex) {
        const result = await deps.diagnosis.markWorking({
          problemLatex,
          studentStepsLatex: state.studentStepsLatex,
          markScheme: state.markScheme,
        });
        verified = { kind: 'markWorking', result };
        trace.verificationCalls.push({ kind: 'markWorking', status: deriveMarkStatus(result) });
      }

      // 3) Model is the voice (handed the verified fact to narrate).
      const modelOut = await deps.model.generate({
        claimType,
        studentMessage: turn.message,
        mode,
        retrieved: chunks,
        verified,
      });

      // 4) Gate: enforce the invariant and recompose the reply from survivors.
      const gated = gateClaims({
        modelClaims: modelOut.claims,
        claimType,
        verified,
        mode,
        chunks,
      });

      // 5) hint_only server-side enforcement: even if a decisive result slipped past
      //    the correctness gate (e.g. an equation in a non-correctness claim), it must
      //    not reach the student. Layered AFTER the gate; only removes claims.
      const claims = mode === 'hint_only' ? enforceHintOnly(gated.claims) : gated.claims;
      const reply = mode === 'hint_only' ? claims.map((c) => c.text).join(' ').trim() : gated.reply;

      // Reply-level citations = the sources actually used by surviving claims.
      const citations = dedupeCitations(claims.flatMap((c) => c.citations));

      // The trace is consumed by the eval harness and may be persisted; prove it
      // carries no PII before it leaves the orchestrator (AADC / UK-GDPR).
      assertNoPii(trace, 'trace');
      return { reply, claimType, claims, citations, trace };
    },
  };
}

function buildQuery(turn: StudentTurn): RetrievalQuery {
  return { text: turn.message };
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of citations) {
    if (!seen.has(c.sourceRef)) {
      seen.add(c.sourceRef);
      out.push(c);
    }
  }
  return out;
}
