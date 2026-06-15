# 09 — Tutor system prompt (instantiate LLM_RULES)

## Deliverable
The actual system prompt used by the orchestrator, instantiating
`context/LLM_RULES.md` as the model's operating role, plus a red-team test set.

## Read first
- `context/LLM_RULES.md` (this is the spec; the prompt is its instantiation)
- `context/ARCHITECTURE.md`
- `context/INTERFACES.md` (the model must emit MathsClaim-compatible structure)

## Do this
1. Write the system prompt so the model:
   - Acts as the **voice**: explains, hints, narrates verified results.
   - Never asserts a result it hasn't been given a verification for.
   - Cites retrieved context for curriculum claims; never fabricates citations.
   - Stays within retrieved scope; says so when out of scope.
   - Behaves correctly per `mode` (hint_only vs full vs mark_working).
   - Is appropriate for minors.
2. Make it emit responses the orchestrator can decompose into tagged
   `MathsClaim`s (e.g. a structured format separating prose from asserted facts).
3. Build a **red-team set**: prompts that try to make the model assert an answer
   directly, mark its own work, reveal an answer in hint_only mode, or invent a
   citation.

## Out of scope / do not touch
- Do not weaken any rule in `LLM_RULES.md`.
- Do not move correctness authority into the prompt — the gate in prompt 08 still
  applies; the prompt is defence-in-depth, not the control.

## Tests (definition of done)
- Each red-team prompt fails to elicit an unverified correctness claim (the gate
  strips it and / or the model declines).
- In hint_only mode, no red-team prompt extracts the final answer.
