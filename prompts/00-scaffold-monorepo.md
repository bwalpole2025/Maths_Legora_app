# 00 — Scaffold the monorepo

## Deliverable
A pnpm-workspace monorepo skeleton that builds, with the `context/` reference
docs placed at the repo root.

## Read first
- `context/ARCHITECTURE.md` (stack + layers)
- `context/PROMPT_CONVENTION.md`

## Do this
1. Initialise a pnpm workspace with packages:
   - `packages/contracts` — shared TypeScript types (empty for now).
   - `packages/tutor-orchestrator` — Fastify service (stub).
   - `packages/retrieval` — Fastify service (stub).
   - `apps/web` — Next.js 14 app (stub).
   - `services/maths` — Python + FastAPI project (stub) for verification and
     diagnosis.
2. Set up TypeScript project references, a root `tsconfig`, lint / format, and a
   `pnpm build` that compiles all TS packages.
3. Set up the Python service with a `pyproject` / requirements including
   `fastapi`, `uvicorn`, `sympy`, and a `/health` endpoint.
4. Add a root `README` pointing at `context/` and this prompt library.
5. Confirm the `context/` docs (`ARCHITECTURE.md`, `INTERFACES.md`,
   `LLM_RULES.md`, `CORPUS_POLICY.md`, `PROMPT_CONVENTION.md`) are present at the
   repo root. If not, stop and ask for them — do not rewrite them.

## Out of scope / do not touch
- No business logic, no model calls, no database yet.
- Do not author or edit the `context/` docs.

## Tests (definition of done)
- `pnpm build` succeeds.
- Both Fastify stubs and the FastAPI stub start and return `/health` 200.
