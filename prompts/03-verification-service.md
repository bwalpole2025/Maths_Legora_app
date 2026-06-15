# 03 — Verification service (wrap existing SymPy verifier)

## Deliverable
The `maths` service exposes `verifyAnswer` and `verifyStep` (per `INTERFACES.md`)
by **wrapping your existing SymPy verifier**.

## Read first
- `context/INTERFACES.md` (VerificationService)
- `context/ARCHITECTURE.md` (truth layer; reuse map)
- `context/PROMPT_CONVENTION.md` (working with existing code)

## Do this
1. Locate the existing SymPy verification logic in the codebase. **Wrap it**
   behind FastAPI endpoints matching the `Verify*` contracts. Do not rewrite it.
2. Map its outputs to `VerificationStatus` (`correct` / `incorrect` /
   `indeterminate`). Return `canonicalAnswerLatex` when the verifier can produce
   one.
3. Handle the awkward cases explicitly: equivalent-but-different forms,
   domain / assumption sensitivity, and numeric fallback when symbolic comparison
   is inconclusive (-> `indeterminate`, never a guess).
4. Keep `detail` internal — it is debugging data, never shown to students.

## Out of scope / do not touch
- No model calls anywhere in this service. The model must never reach this code.
- No marking / ECF logic (that's prompt 04).

## Tests (definition of done)
- A golden fixture set of (problem, correct answer) pairs all return `correct`.
- Equivalent forms (e.g. factored vs expanded) are recognised as `correct`.
- Inconclusive symbolic cases return `indeterminate`, not `incorrect`.
