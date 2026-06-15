# 01 — Database, pgvector, and schema

## Deliverable
Postgres + Prisma wired up, the `pgvector` extension enabled, and the schema
extended with the corpus and provenance tables.

## Read first
- `context/ARCHITECTURE.md`
- `context/INTERFACES.md` (the `Provenance` and `Citation` shapes)
- `context/CORPUS_POLICY.md` (provenance is mandatory)

## Do this
1. Add Prisma with a Postgres datasource; enable the `pgvector` extension via a
   migration.
2. Extend the existing `Question` model with provenance / licensing fields
   (`sourceType`, `sourceId`, `licence`, `ownership`) — additive, non-breaking.
   If the project already has a `Question` model, **extend** it; do not replace.
3. Add corpus tables:
   - `CorpusChunk` (text, `curriculumTags[]`, embedding `vector`, the
     `Provenance` fields, plus `citationLabel` and `sourceRef`).
   - Indexes: an IVFFlat / HNSW index on `embedding`, and a GIN index on
     `curriculumTags`.
4. Add a constraint or application-level guard so a `CorpusChunk` cannot be
   inserted without `licence` and `ownership`.

## Out of scope / do not touch
- No ingestion logic yet (that's prompt 06).
- Do not change the `Question` fields other code depends on.

## Tests (definition of done)
- Migrations apply cleanly on a fresh database.
- A unit test proves inserting a `CorpusChunk` without a licence is rejected.
