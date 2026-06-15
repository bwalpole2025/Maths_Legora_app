// Service resolution for the eval (auto-detect run mode).
//
// When the Python maths service is reachable at MATHS_URL we drive the REAL
// verification + diagnosis (the headline reflects the real SymPy/ECF truth
// layer). When it is down we fall back to hermetic doubles so the suite still
// runs and emits a scorecard — but the truth-dependent metrics are reported
// `measured:false`, never a circular 100%. Retrieval is ALWAYS a deterministic
// seeded fake.

import type {
  DiagnosisService,
  MarkWorkingResult,
  RetrievalQuery,
  RetrievalResult,
  RetrievalService,
  RetrievedChunk,
  VerificationService,
  VerifyAnswerResult,
  VerifyStepResult,
} from '@imaia/contracts';

import { HttpDiagnosisService } from '../clients/diagnosis.js';
import { HttpVerificationService } from '../clients/verification.js';
import type { ModelClaim, ModelClient } from '../model.js';
import type { RunMode } from './types.js';

export const MATHS_URL = process.env.MATHS_URL ?? 'http://localhost:8000';

/** Returns the seeded chunks for one case, deterministically. */
export class SeededRetrieval implements RetrievalService {
  constructor(private readonly chunks: RetrievedChunk[]) {}
  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    return { chunks: this.chunks, query };
  }
}

// Hermetic stand-ins: used only when the truth layer is unreachable, so the suite
// still runs the always-measured metrics (scope, hint). The truth-dependent
// metrics skip in hermetic mode, so these returns are never scored as correctness.
class HermeticVerification implements VerificationService {
  async verifyAnswer(): Promise<VerifyAnswerResult> {
    return { status: 'indeterminate', method: 'sympy' };
  }
  async verifyStep(): Promise<VerifyStepResult> {
    return { status: 'indeterminate' };
  }
}

class HermeticDiagnosis implements DiagnosisService {
  async markWorking(): Promise<MarkWorkingResult> {
    return { marksAwarded: 0, marksAvailable: 0, firstDivergenceIndex: null, perStep: [], ecfApplied: false };
  }
}

export interface ResolvedServices {
  mode: RunMode;
  verification: VerificationService;
  diagnosis: DiagnosisService;
}

async function reachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

/** Probe the maths service; pick live HTTP clients or hermetic doubles. */
export async function resolveServices(mathsUrl: string = MATHS_URL): Promise<ResolvedServices> {
  if (await reachable(mathsUrl)) {
    return {
      mode: 'live',
      verification: new HttpVerificationService(mathsUrl),
      diagnosis: new HttpDiagnosisService(mathsUrl),
    };
  }
  return { mode: 'hermetic', verification: new HermeticVerification(), diagnosis: new HermeticDiagnosis() };
}

/** A model that tries to reveal the answer even in a hint — used to prove the
 *  hint_only gate strips a decisive result. */
export function leakyHintModel(answer: string): ModelClient {
  return {
    async generate() {
      const claims: ModelClaim[] = [
        { text: `The final answer is $${answer}$.`, assertsCorrectness: true, citationRefs: [] },
      ];
      return { claims };
    },
  };
}
