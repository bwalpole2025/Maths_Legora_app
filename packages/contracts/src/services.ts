// Typed service stubs — the four service boundaries from INTERFACES.md, expressed
// as type-only interfaces so consumers can implement and call against them. No
// logic lives here. The contract's synchronous arrows (e.g.
// `retrieve(query) -> RetrievalResult`) are realised as async client/server
// boundaries (Promise-returning).
import type { RetrievalQuery, RetrievalResult } from "./retrieval.js";
import type {
  VerifyAnswerRequest,
  VerifyAnswerResult,
  VerifyStepRequest,
  VerifyStepResult,
} from "./verification.js";
import type { MarkWorkingRequest, MarkWorkingResult } from "./diagnosis.js";
import type { SessionState, StudentTurn, TutorReply } from "./tutor.js";

export interface RetrievalService {
  retrieve(query: RetrievalQuery): Promise<RetrievalResult>;
}

export interface VerificationService {
  verifyAnswer(req: VerifyAnswerRequest): Promise<VerifyAnswerResult>;
  verifyStep(req: VerifyStepRequest): Promise<VerifyStepResult>;
}

export interface DiagnosisService {
  markWorking(req: MarkWorkingRequest): Promise<MarkWorkingResult>;
}

export interface TutorOrchestrator {
  handleTurn(turn: StudentTurn, sessionState: SessionState): Promise<TutorReply>;
}
