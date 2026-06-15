// Concrete shapes for the two contract gaps in INTERFACES.md.
//
// `SessionState` and `TurnTrace` are intentionally `z.unknown()` in
// @imaia/contracts (the orchestrator that produces them — this package — wasn't
// built yet). We define their concrete shapes here, internal to prompt 08,
// without touching the frozen contract.

import type { ClaimType, MarkScheme, VerificationStatus } from '@imaia/contracts';
import type { SafetyCategory } from './safety.js';

/** The problem + student inputs a turn operates on. The session/web layer (later
 *  prompts) populates this; it keeps the orchestrator off the Question schema. */
export interface SessionState {
  problem?: { id?: string; problemLatex: string };
  candidateAnswerLatex?: string; // the answer to confirm (full_solution)
  studentStepsLatex?: string[]; // confirmed steps from OCR upstream (mark_working)
  markScheme?: MarkScheme;
}

export type VerificationCallKind = 'verifyAnswer' | 'verifyStep' | 'markWorking';

export interface VerificationCallTrace {
  kind: VerificationCallKind;
  status: VerificationStatus;
}

/** Matches the trace shape exercised by contracts' fixtures/contract-examples.json. */
export interface TurnTrace {
  retrievalHits: string[]; // chunk sourceRefs
  verificationCalls: VerificationCallTrace[];
  routing: ClaimType; // the claim-type routing decision
  // Set when the safety layer refused/redirected the turn before generation (prompt 10).
  safety?: { action: 'refuse' | 'redirect'; category: SafetyCategory };
}
