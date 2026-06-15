# @imaia/db

Data layer for the IMAIA grounded tutor: Prisma schema, the `pgvector` corpus,
and the provenance guard.

- `Question` and `CorpusChunk` carry the frozen `Provenance` fields from
  `context/INTERFACES.md` (`sourceType`, `sourceId`, `licence`, `ownership`).
- Provenance is mandatory (`context/CORPUS_POLICY.md`). Three layers enforce it:
  `NOT NULL` columns, a `*_licence_nonempty` CHECK constraint, and the
  `provenanceGuard` Prisma client extension (`src/provenance.ts`,
  `src/client.ts`), which rejects writes before they reach the database.
- `CorpusChunk.embedding` is `vector(1536)`. Prisma has no first-class vector
  type, so the column is `Unsupported(...)` in the schema and is read/written via
  `$queryRaw`/`$executeRaw` (ingestion/retrieval, prompts 06/07). It has an HNSW
  cosine index; `curriculumTags` has a GIN index.

## Local setup

```bash
cp ../../.env.example .env          # DATABASE_URL (host port 5433)
docker compose up -d db             # pgvector/pgvector:pg16 (from repo root)
pnpm --filter @imaia/db migrate:deploy
pnpm --filter @imaia/db test
```

## Changing the schema

The HNSW index and the licence CHECK constraints cannot be expressed in
`schema.prisma`, so they live as hand-written SQL in the migration. Because of
that, `prisma migrate dev` reports them as drift and will prompt. Workflow:

```bash
# 1. edit schema.prisma, then create (but don't apply) the migration
pnpm --filter @imaia/db exec prisma migrate dev --create-only --name <change>
# 2. re-add the HNSW index / CHECK constraints to the new migration.sql
# 3. apply with deploy (no drift detection, non-interactive)
pnpm --filter @imaia/db migrate:deploy
```
