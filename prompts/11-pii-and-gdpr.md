# 11 — PII and GDPR (reuse AADC work)

## Deliverable
PII handling and data-protection controls wired into the tutor flow, **reusing
your existing AADC / GDPR compliance work**.

## Read first
- `context/ARCHITECTURE.md` (reuse map)
- `context/PROMPT_CONVENTION.md` (working with existing code)

## Do this
1. Locate the existing AADC / ICO Age Appropriate Design Code compliance and
   data-handling logic. **Wire it in**; do not rebuild it.
2. Ensure student messages, attachments, and traces are handled per that policy
   (minimisation, retention, no PII in logs / citations, lawful basis).
3. Make the orchestrator's `trace` safe to persist (no PII), since the eval
   harness will consume it.

## Out of scope / do not touch
- Do not invent a new compliance regime; conform to the existing one.

## Tests (definition of done)
- A test asserts no PII is written to traces / logs.
- Retention / minimisation behaviour matches the existing policy fixtures.
