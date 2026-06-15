# IMAIA Grounded-Tutor — Claude Code Prompt Library

A sequenced set of prompts for building the IMAIA A-Level / GCSE tutoring wrapper:
a system that **grounds** a frontier model in your curriculum and uses it freely
for explanation and pedagogy, while **never letting the model be the source of
mathematical truth**.

## The one rule everything is built around

> Route the model's output by **claim type**.
>
> - **Curriculum / explanatory / pedagogical** claims — what the spec covers,
>   how to approach a topic, conceptual explanation, hints, restating a method —
>   the model generates **freely**, grounded in retrieved spec text and **cited**.
> - **Correctness** claims — "this is the answer", "this step is right", "your
>   working earns these marks" — may **never** originate as an unverified model
>   assertion. They come from the verification / diagnosis services; the model
>   only **narrates the verified result**.

If you let Claude Code take the path of least resistance ("just ask the model if
the answer's right") you will rebuild the 92%-correct system this is meant to
beat. The whole library exists to make the split above structurally unavoidable.

## How to use this

1. Open Claude Code at the repo root.
2. The `context/` docs are **pre-written, read-only references**. Place them in
   the repo before you start. Every prompt instructs Claude Code to read them
   first and conform to them without modifying them.
3. Run the prompts in `prompts/` **in order**. One prompt = one branch / PR /
   commit. Do not start the next phase until the current phase's tests are green.
4. No prompt may span the grounding↔verification boundary. If a change seems to
   need that, stop — it's a sign the boundary is being eroded.

## Run order

| #  | Prompt                                | Phase         | Gate before moving on                          |
|----|---------------------------------------|---------------|------------------------------------------------|
| 00 | `00-scaffold-monorepo.md`             | Foundation    | repo builds, context docs in place             |
| 01 | `01-db-and-pgvector.md`               | Foundation    | migrations apply, schema review                |
| 02 | `02-contract-types.md`                | Contracts     | types compile, no logic present                |
| 03 | `03-verification-service.md`          | Truth layer   | golden set passes                              |
| 04 | `04-diagnosis-marking-service.md`     | Truth layer   | marking matches fixtures                       |
| 05 | `05-verification-eval-gate.md`        | Truth layer   | **all golden pass, all adversarial caught**    |
| 06 | `06-corpus-ingestion.md`              | Grounding     | every chunk has provenance, examples intact    |
| 07 | `07-retrieval-service.md`             | Grounding     | retrieval returns citations + tags             |
| 08 | `08-tutor-orchestrator.md`            | Orchestration | claim-type routing tests pass                  |
| 09 | `09-tutor-system-prompt.md`           | Orchestration | red-team prompts don't elicit unverified claims|
| 10 | `10-safety-guardrails.md`             | Safety        | refusal/redirect + mode tests pass             |
| 11 | `11-pii-and-gdpr.md`                  | Safety        | PII handling tests pass                         |
| 12 | `12-eval-harness.md`                  | Evals         | end-to-end suite runs, baseline recorded       |
| 13 | `13-regression-unverified-claims.md`  | Evals         | regression asserts zero unverified claims      |
| 14 | `later/14-teacher-oversight.md`       | Later         | — (product layer, after core proven)           |

## What's reused vs new

- **Reused / wrapped (not rebuilt):** SymPy verification, the checkpoint-based
  first-divergence + ECF diagnosis engine, the Mathpix two-pass marking path,
  the `Question[]` corpus, and your AADC / GDPR compliance work. Prompts 03, 04
  and 11 wrap these behind contracts — they do not reimplement them.
- **Genuinely new:** the corpus ingestion + hybrid retrieval layer (06, 07) and
  the claim-type orchestration + gating (08, 09).

See `context/PROMPT_CONVENTION.md` for the template every prompt follows.
