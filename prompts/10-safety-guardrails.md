# 10 — Safety, refusal / redirect, and modes

## Deliverable
Child-safety and refusal / redirect handling, plus enforcement of hint-only vs
full-solution modes at the service boundary.

## Read first
- `context/LLM_RULES.md`
- `context/ARCHITECTURE.md`

## Do this
1. Add a safety layer in the orchestrator appropriate for minors: refuse or
   redirect unsafe or off-topic requests, keep tone age-appropriate, and do not
   help a student circumvent their school / parental context.
2. Enforce `hint_only` server-side: even if the model output contains a decisive
   result, the layer must not let it through in hint mode.
3. Provide clear, kind refusal / redirect copy that keeps the student learning.

## Out of scope / do not touch
- Do not duplicate PII / GDPR handling here (prompt 11).
- Do not relax the correctness gate.

## Tests (definition of done)
- Unsafe / off-topic fixtures are refused or redirected.
- A hint_only request never returns the final answer, even when the raw model
  output contained one.
