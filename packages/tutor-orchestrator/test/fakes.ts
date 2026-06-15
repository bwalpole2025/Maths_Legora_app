// In-memory fakes for the contract services + a programmable model, so the
// orchestrator and gate test deterministically without network or an LLM.

import type {
  DiagnosisService,
  MarkWorkingRequest,
  MarkWorkingResult,
  RetrievalQuery,
  RetrievalResult,
  RetrievalService,
  RetrievedChunk,
  VerificationService,
  VerifyAnswerRequest,
  VerifyAnswerResult,
  VerifyStepRequest,
  VerifyStepResult,
} from '@imaia/contracts';
import type {
  ModelClaim,
  ModelClient,
  ModelGenerationRequest,
  ModelGenerationResult,
} from '../src/model.js';

export function chunk(partial: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    text: 'Integration by parts reverses the product rule; it is on the Edexcel 9MA0 spec.',
    citation: { label: 'Edexcel 9MA0 spec, section 6.2', sourceRef: 'edexcel-9ma0#6.2' },
    curriculumTags: ['edexcel', 'alevel', '9MA0', 'integration'],
    provenance: {
      sourceType: 'spec',
      sourceId: 'edexcel-9ma0',
      licence: 'OGL-3.0',
      ownership: 'licensed',
    },
    score: 0.9,
    ...partial,
  };
}

export class FakeRetrieval implements RetrievalService {
  public calls = 0;
  constructor(private readonly chunks: RetrievedChunk[] = [chunk()]) {}
  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    this.calls += 1;
    return { chunks: this.chunks, query };
  }
}

export class FakeVerification implements VerificationService {
  public answerCalls: VerifyAnswerRequest[] = [];
  public stepCalls: VerifyStepRequest[] = [];
  constructor(
    private readonly answer: VerifyAnswerResult = {
      status: 'correct',
      canonicalAnswerLatex: 'x^2 + 2x + 1',
      method: 'sympy',
    },
  ) {}
  async verifyAnswer(req: VerifyAnswerRequest): Promise<VerifyAnswerResult> {
    this.answerCalls.push(req);
    return this.answer;
  }
  async verifyStep(req: VerifyStepRequest): Promise<VerifyStepResult> {
    this.stepCalls.push(req);
    return { status: 'correct' };
  }
}

export class FakeDiagnosis implements DiagnosisService {
  public calls: MarkWorkingRequest[] = [];
  constructor(
    private readonly result: MarkWorkingResult = {
      marksAwarded: 2,
      marksAvailable: 2,
      firstDivergenceIndex: null,
      perStep: [],
      ecfApplied: false,
    },
  ) {}
  async markWorking(req: MarkWorkingRequest): Promise<MarkWorkingResult> {
    this.calls.push(req);
    return this.result;
  }
}

/** A model that returns preset claims (or a function of the request). */
export class FakeModel implements ModelClient {
  public requests: ModelGenerationRequest[] = [];
  constructor(
    private readonly claims: ModelClaim[] | ((req: ModelGenerationRequest) => ModelClaim[]) = [],
  ) {}
  async generate(req: ModelGenerationRequest): Promise<ModelGenerationResult> {
    this.requests.push(req);
    const claims = typeof this.claims === 'function' ? this.claims(req) : this.claims;
    return { claims };
  }
}
