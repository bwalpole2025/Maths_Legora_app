# 12 — End-to-end eval harness

## Deliverable
A repeatable end-to-end eval suite over the whole tutor, producing a scorecard.

## Read first
- `context/ARCHITECTURE.md`
- `context/INTERFACES.md` (uses `trace` and `MathsClaim`)

## Do this
1. Build an eval that drives `handleTurn` across realistic sessions and measures:
   - **Served-solution correctness** — served maths matches the verified result.
     The gate should push this toward ~100%; this number is your headline claim.
   - **Curriculum-scope adherence** — answers stay within retrieved scope and cite.
   - **Marking accuracy** — `markWorking` vs a human marker on a sample.
   - **Hint quality** — hints advance without revealing the answer.
2. Emit a scorecard and persist a baseline for comparison across runs.

## Out of scope / do not touch
- Do not modify services to make the eval pass; the eval measures, it doesn't
  patch.

## Tests (definition of done)
- The suite runs end-to-end and writes a scorecard.
- A baseline is recorded so regressions are visible.
