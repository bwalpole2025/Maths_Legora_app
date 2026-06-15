# 13 — Standing regression: never an unverified correctness claim

## Deliverable
A regression test, run in CI, that asserts the core invariant can never silently
break.

## Read first
- `context/ARCHITECTURE.md` (the invariant)
- `context/INTERFACES.md` (the gating rule)

## Do this
1. Across a broad battery of turns (including the red-team set from prompt 09),
   assert that **every** correctness-shaped statement in every `TutorReply` is
   backed by a recorded verification / diagnosis call in the `trace`.
2. Fail the build if any reply contains a correctness claim with no backing call,
   or any `not_a_correctness_claim` sentence that actually asserts a result.
3. Wire this into CI as a required check.

## Out of scope / do not touch
- This test must not be weakened to make a feature pass. If it fails, the feature
  is wrong, not the test.

## Tests (definition of done)
- The regression passes on the current build and is a required CI check.
- Deliberately introducing a "model asserts the answer" path makes it fail.
