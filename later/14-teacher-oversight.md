# 14 — Teacher oversight surface + logging (LATER)

## Deliverable
A teacher-facing dashboard and conversation-visibility layer. **Sequence this
after the core wrapper is proven (phases through 13 green).**

## Read first
- `context/ARCHITECTURE.md`
- `context/INTERFACES.md` (consumes the safe `trace`)
- `context/CORPUS_POLICY.md` (citations shown to teachers)

## Do this
1. Build a teacher view of student sessions: topics covered, where students
   struggled (first-divergence patterns), marks, and the citations behind
   curriculum answers.
2. Surface safety / monitoring signals for staff oversight.
3. Use only the PII-safe `trace` and stored results — do not log raw student PII.

## Out of scope / do not touch
- This is product layer, not core wrapper. Do not let it pull correctness
  authority back toward the UI or the model.

## Tests (definition of done)
- Dashboard renders from stored traces / results with no PII leakage.
- Teacher actions don't alter marks or verification outcomes.
