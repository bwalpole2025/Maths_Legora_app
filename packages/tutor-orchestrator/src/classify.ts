// Claim-type routing (pure, rule-based).
//
// Classification is NOT a correctness decision, so a deterministic rule-based
// classifier is appropriate and trivially testable. A model-assisted classifier
// can replace this later without changing the contract.

import type { ClaimType, StudentTurn } from '@imaia/contracts';

const MARK_WORKING = /\bmark (my|this|the)\b|how many marks|\bgrade\b|check my (working|steps)/i;
const HINT = /\bhint\b|\bstuck\b|how (do|can) i (start|begin)|get me started|give me a (nudge|hint)/i;
const FULL_SOLUTION =
  /\bsolve\b|full (worked )?solution|worked solution|show .*(steps|working)|step[- ]by[- ]step|what(?:'s| is) the answer|is .* the answer|check my answer/i;

export function classifyTurn(turn: StudentTurn): ClaimType {
  // 1. Marking the student's own working — a handwriting attachment or an
  //    explicit ask. Goes to the diagnosis service.
  if (turn.attachmentRef || MARK_WORKING.test(turn.message)) return 'mark_working';

  // 2. hint_only mode, or an explicit request for a hint, never reveals a result.
  if (turn.mode === 'hint_only' || HINT.test(turn.message)) return 'hint';

  // 3. A request to produce/confirm a full worked solution or a final answer.
  if (FULL_SOLUTION.test(turn.message) || (turn.problemId !== undefined && turn.mode === 'full'))
    return 'full_solution';

  // 4. Default: a curriculum / explanatory question, answered from retrieved spec text.
  return 'curriculum';
}
