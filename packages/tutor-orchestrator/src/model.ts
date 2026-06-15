// The model seam.
//
// The orchestrator treats the model as the VOICE only: it is handed retrieved
// context and any verified fact, and returns decomposed claims. Prompt 08 ships
// a deterministic reference implementation (model-reference.ts); prompt 09
// replaces it with a Claude-backed client (claude-opus-4-8, structured output)
// carrying the LLM_RULES system prompt. The contract is this interface.

import type {
  ClaimType,
  MarkWorkingResult,
  RetrievedChunk,
  VerifyAnswerResult,
} from '@imaia/contracts';

export type TurnMode = 'hint_only' | 'full';

/** The verified fact handed to the model to narrate. The model never produces it. */
export type VerifiedFact =
  | { kind: 'verifyAnswer'; result: VerifyAnswerResult }
  | { kind: 'markWorking'; result: MarkWorkingResult };

export interface ModelGenerationRequest {
  claimType: ClaimType;
  studentMessage: string;
  mode: TurnMode;
  retrieved: RetrievedChunk[];
  verified?: VerifiedFact;
}

export interface ModelClaim {
  text: string;
  /** Model's self-label: does this sentence assert a maths *result*? This is a
   *  hint to the gate, never the authority — the gate decides what survives. */
  assertsCorrectness: boolean;
  /** Citation.sourceRef values this claim draws on. */
  citationRefs: string[];
}

export interface ModelGenerationResult {
  claims: ModelClaim[];
}

export interface ModelClient {
  generate(req: ModelGenerationRequest): Promise<ModelGenerationResult>;
}
