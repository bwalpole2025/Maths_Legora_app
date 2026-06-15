# 05 — Verification eval gate (golden + adversarial)

## Deliverable
An eval that proves the truth layer is trustworthy **before** anything consumes
it. This is the gate for the whole project.

## Read first
- `context/INTERFACES.md`
- `context/ARCHITECTURE.md` (the invariant)

## Do this
1. Build two datasets:
   - **Golden:** problems with known-correct solutions and known mark outcomes.
   - **Adversarial:** plausible-looking solutions that are wrong — a slipped
     sign, a dropped constant of integration, an off-by-one, a wrong-but-
     internally-consistent ECF chain, an equivalent form that should be accepted,
     and a subtly non-equivalent form that should be rejected.
2. Run every golden case through `verifyAnswer` / `markWorking` and assert correct
   outcomes.
3. Run every adversarial case and assert each error is **caught** (or correctly
   accepted, for the equivalent-form cases).
4. Emit a single pass / fail summary and a per-case report.

## Out of scope / do not touch
- No model, no retrieval, no orchestration. This phase is the truth layer alone.

## Tests (definition of done)
- **All golden cases pass and all adversarial cases are caught.** Do not proceed
  to the grounding or orchestration phases until this is green.
