# 04 — Diagnosis / marking service (wrap existing engine)

## Deliverable
The `maths` service exposes `markWorking` (per `INTERFACES.md`) by **wrapping your
existing checkpoint-based first-divergence + ECF engine**, with the Mathpix
two-pass OCR path feeding student steps.

## Read first
- `context/INTERFACES.md` (DiagnosisService)
- `context/ARCHITECTURE.md`
- `context/PROMPT_CONVENTION.md`

## Do this
1. Locate the existing first-divergence / ECF diagnosis engine. **Wrap it**
   behind the `markWorking` contract. Do not reimplement the divergence logic.
2. Populate `perStep` with `isFirstDivergence` and `carriedForward`, set
   `firstDivergenceIndex`, and compute `marksAwarded` / `marksAvailable` against
   the optional `markScheme`.
3. Wire the existing Mathpix two-pass OCR + student-confirmation path so a
   handwriting `attachmentRef` becomes `studentStepsLatex` **before** marking.
   Keep the confirmation step — do not mark unconfirmed OCR.
4. Respect `allowEcf`.

## Out of scope / do not touch
- No model calls. Marking is deterministic and must not consult the model.
- Do not change the answer-verification service (prompt 03).

## Tests (definition of done)
- Fixtures with a known first-divergence return the correct index and marks.
- An ECF case awards method marks after an earlier slip when `allowEcf` is true.
- A handwriting fixture flows OCR -> confirmation -> marking.
