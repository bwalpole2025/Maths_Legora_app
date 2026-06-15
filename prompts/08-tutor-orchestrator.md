# 08 — Tutor orchestrator (the heart)

## Deliverable
`packages/tutor-orchestrator` implements `handleTurn(turn, sessionState)` (per
`INTERFACES.md`): claim-type routing, grounding, the correctness gate, and a
structured trace. **This is where "ground it but still use it" is enforced.**

## Read first
- `context/ARCHITECTURE.md` (the invariant + per-turn data flow)
- `context/INTERFACES.md` (TutorOrchestrator, MathsClaim, the gating rule)
- `context/LLM_RULES.md`
- `context/PROMPT_CONVENTION.md`

## Conform to (do not modify)
- The retrieval, verification, and diagnosis contracts in `INTERFACES.md`.

## Do this
1. **Classify** the turn into a `ClaimType`: `curriculum`, `hint`,
   `full_solution`, or `mark_working`.
2. **Always retrieve first.** Pass retrieved context + citations into the prompt
   and pin curriculum / spec claims to that context.
3. For `full_solution` and `mark_working`: get the result from the
   verification / diagnosis service **before** generation. The model is handed the
   verified result to narrate — it is never asked to produce or judge correctness.
4. **Tag and gate.** Decompose the model's reply into `MathsClaim`s. Any claim
   whose `verificationStatus` is a correctness value but which is **not** backed
   by a recorded service call is **stripped or re-routed** before returning. A
   correctness-shaped sentence tagged `not_a_correctness_claim` is a violation.
5. Honour `mode` (`hint_only` never reveals the answer or a decisive result).
6. Return `TutorReply` with the reply, `claimType`, tagged `claims`, `citations`,
   and a `trace` (retrieval hits, verification / diagnosis calls, routing
   decision) for the eval harness.

## Out of scope / do not touch
- The verification engine internals, the retrieval ranking, the `Question` schema.
- **Do not add any path where the model decides whether an answer is correct.**

## Tests (definition of done)
- A unit test per claim-type branch.
- A test proving an unverified correctness claim is stripped from the reply.
- An integration test on three golden problems showing the served solution matches
  the verified one, and that the trace records the verification call.
