# 02 — Generate the contract types (no logic)

## Deliverable
`packages/contracts` populated with the exact TypeScript types from
`INTERFACES.md`, plus typed client / server stubs — and **nothing else**.

## Read first
- `context/INTERFACES.md` (the source of truth — copy it faithfully)
- `context/PROMPT_CONVENTION.md`

## Do this
1. Transcribe every interface in `INTERFACES.md` into `packages/contracts`:
   `RetrievalQuery` / `RetrievalResult`, `Verify*`, `MarkWorking*`, `StudentTurn`,
   `TutorReply`, `MathsClaim`, `Citation`, `Provenance`, `ClaimType`,
   `VerificationStatus`, etc.
2. Export typed request / response stubs (interfaces or zod schemas) for each of
   the four services so consumers can compile against them.
3. Generate matching JSON schema (or pydantic models) for the Python `maths`
   service so both sides share one contract.

## Out of scope / do not touch
- **No implementations.** No SymPy, no retrieval, no model calls.
- Do not deviate from the shapes in `INTERFACES.md`. If something seems missing,
  stop and flag it as a contract change — do not improvise a new shape.

## Tests (definition of done)
- `packages/contracts` compiles.
- A type-level test imports each contract and constructs a valid example.
- The Python models round-trip the same JSON as the TS types (one shared fixture).
