# ARCHITECTURE — IMAIA Grounded Tutor

**Status: canonical. Read before every prompt. Do not modify as part of a feature prompt.**

## The invariant

There is exactly one rule the whole system enforces, and every other decision is
downstream of it:

> The model may generate curriculum, explanatory and pedagogical content freely
> (grounded + cited). The model may **never** be the origin of a correctness
> claim. Correctness comes from the verification and diagnosis services; the
> model only narrates verified results.

**Non-negotiable:** there must be no code path in which the model decides whether
an answer or a step is correct, or how many marks a piece of working earns.

## Two claim types

Every response the tutor produces is classified into one of these, and the
classification determines how it is produced.

**Curriculum / explanatory (model-generated, grounded, cited):**
- "Is integration by parts on the Edexcel A-Level spec?"
- "What's the idea behind proof by contradiction?"
- "Give me a hint on how to start this."
- "Explain why we add a constant of integration."
- Restating a method, motivating a concept, adapting tone to the student.

**Correctness (service-produced, model only narrates):**
- "The answer is 3/2."
- "Your line 3 is where it goes wrong."
- "This working earns 4 of the 6 marks."
- "Yes, that simplification is valid."

The first kind is what "still using the AI for curriculum things" means. The
second kind is what "grounding the AI" protects.

## Layers

```
            +-----------------------------------------------+
  student ->|              tutor-orchestrator               |
            |   (claim-type routing - gating - trace)       |
            |   +-------------------------------------+     |
            |   |  model (Claude) = VOICE only        |     |
            |   |  explains, hints, narrates verified |     |
            |   +-------------------------------------+     |
            +---+---------------+----------------+----------+
                |               |                |
        +-------v------+ +------v-------+ +-------v------+
        |  retrieval   | | verification | |  diagnosis   |
        |  (grounding) | |   (truth)    | |  (marking)   |
        +-------+------+ +------+-------+ +-------+------+
                |               |                |
        +-------v------+ +------v-------+ +-------v------+
        |  pgvector    | |   SymPy      | | first-diverg |
        |  corpus      | |   verifier   | | + ECF engine |
        +--------------+ +--------------+ +--------------+
```

The model lives **inside** the orchestrator as the voice. It is handed retrieved
context and verified facts; it is never wired directly to a "decide correctness"
capability.

## Per-turn data flow

- **Curriculum question:** retrieval -> model answers from retrieved spec text ->
  attach citations. No verification needed; no correctness asserted.
- **Hint:** retrieval (topic / method) -> model produces a hint that does **not**
  reveal or assert the answer. If the hint references a result, that result must
  be verified first.
- **Full solution:** verification service produces / confirms the worked solution
  -> model narrates the **verified** steps -> citations attached. The model never
  authors maths it can't verify.
- **Mark my working:** diagnosis service marks the student's steps
  (first-divergence + ECF, optionally Mathpix OCR for handwriting) -> model
  explains the diagnosis in student-friendly language. The model never scores.

## Reuse map

| Layer                 | Source                                                            |
|-----------------------|-------------------------------------------------------------------|
| verification          | wrap existing SymPy verifier                                      |
| diagnosis / marking   | wrap existing checkpoint first-divergence + ECF engine; Mathpix   |
| corpus                | seed from existing `Question[]` bank + specs + DfE content store  |
| retrieval             | **new** (pgvector hybrid search)                                  |
| orchestration + gating| **new**                                                           |
| PII / GDPR            | reuse AADC compliance work                                        |

## Stack (pinned)

- Monorepo: pnpm workspaces.
- Web / API: Next.js 14, Fastify, TypeScript.
- Data: Postgres + Prisma, **pgvector** extension for embeddings.
- Maths services: Python, FastAPI, SymPy.
- Model access: Claude, via the orchestrator only.
