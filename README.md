# IMAIA Grounded Tutor

An A-Level / GCSE maths tutoring wrapper that **grounds** a frontier model in a
curriculum corpus and uses it freely for explanation and pedagogy, while **never
letting the model be the source of mathematical truth**. Correctness comes from
the verification and diagnosis services; the model only narrates verified
results.

> This repository is the buildable monorepo scaffold produced by **prompt 00**.
> No business logic, model calls, or database are wired up yet — those arrive in
> the later prompts.

## The one rule everything is built around

The model generates **curriculum / explanatory / pedagogical** content freely
(grounded + cited). The model may **never** originate a **correctness** claim
("the answer is…", "this step is right", "this earns N marks") — those come from
services and the model only narrates them. See
[context/ARCHITECTURE.md](context/ARCHITECTURE.md).

## Reference docs (read-only, canonical)

The [`context/`](context/) directory holds the pre-written, **read-only**
references every prompt conforms to. Do not edit them in a feature change.

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](context/ARCHITECTURE.md)         | Stack, layers, the grounding↔verification invariant |
| [INTERFACES.md](context/INTERFACES.md)             | Frozen service contracts (types) |
| [LLM_RULES.md](context/LLM_RULES.md)               | The model's constitution (what it may / must not do) |
| [CORPUS_POLICY.md](context/CORPUS_POLICY.md)       | What may be ingested into the corpus |
| [PROMPT_CONVENTION.md](context/PROMPT_CONVENTION.md) | The shape of every prompt |

## Prompt library

The sequenced build prompts are vendored under [`prompts/`](prompts/) (run in
order, one prompt = one branch / PR / commit) with later/optional work in
[`later/`](later/). The run order and gates are in
[prompts/README.md](prompts/README.md).

## Workspace layout

```
packages/
  contracts/            @imaia/contracts          shared TS types (empty until prompt 02)
  tutor-orchestrator/   @imaia/tutor-orchestrator Fastify service stub  (port 4000)
  retrieval/            @imaia/retrieval          Fastify service stub  (port 4001)
apps/
  web/                  @imaia/web                Next.js 14 app stub   (port 3000)
services/
  maths/                Python + FastAPI stub     verification/diagnosis (port 8000)
```

## Prerequisites

- Node `>=20` and **pnpm** `11` (e.g. `corepack enable`)
- Python `>=3.9`

## Getting started

```bash
# 1. Node workspace
pnpm install
pnpm build            # tsc -b for TS packages + next build for the web app

# 2. Python maths service
python3 -m venv services/maths/.venv
services/maths/.venv/bin/pip install --upgrade pip
services/maths/.venv/bin/pip install -r services/maths/requirements.txt
```

### Run the services

```bash
# Fastify stubs
PORT=4000 pnpm --filter @imaia/tutor-orchestrator start
PORT=4001 pnpm --filter @imaia/retrieval start

# Web app
pnpm --filter @imaia/web dev          # http://localhost:3000

# FastAPI maths service
cd services/maths && .venv/bin/uvicorn app.main:app --port 8000
```

Each backend exposes `GET /health` → `200 {"status":"ok", ...}`.

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm build`        | Build all TS packages (`tsc -b`) + the web app (`next build`) |
| `pnpm typecheck`    | `tsc -b` across the project references |
| `pnpm lint`         | ESLint over the TS packages |
| `pnpm format`       | Prettier write (skips the read-only `context/`, `prompts/`, `later/` docs) |
| `pnpm clean`        | Remove TS build output |
