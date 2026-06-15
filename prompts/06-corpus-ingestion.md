# 06 — Corpus ingestion (new)

## Deliverable
An ingestion pipeline that loads the **legally-clean** corpus into `CorpusChunk`
with provenance, LaTeX-aware chunking, and embeddings in pgvector.

## Read first
- `context/CORPUS_POLICY.md` (what may / may not be ingested — hard rules)
- `context/INTERFACES.md` (`Provenance`, `Citation`)
- `context/ARCHITECTURE.md`

## Do this
1. Build loaders for the permitted sources only: exam-board **specifications**,
   **DfE content store** material, and your **own `Question[]` bank / authored
   solutions**. No textbook loaders. No path that ingests unlicensed material.
2. Chunk LaTeX-aware: never split inside maths; keep each worked example whole;
   carry curriculum tags (board / level / spec / topic) onto every chunk.
3. Attach a full `Provenance` record to every chunk; **reject** any chunk without
   `licence` + `ownership` (fail loudly, don't silently store).
4. Embed chunks and write them with their `embedding` vector and a
   `citationLabel` / `sourceRef`.
5. Make ingestion idempotent and re-runnable.

## Out of scope / do not touch
- No retrieval query logic yet (prompt 07).
- Do not add textbook or unlicensed sources, even behind a flag.

## Tests (definition of done)
- Every ingested chunk has a licence and ownership; a chunk without them is
  rejected by a test.
- A worked-example fixture is stored as a single chunk with its maths intact.
