# 07 — Hybrid retrieval service (new)

## Deliverable
`packages/retrieval` implements `retrieve(query)` (per `INTERFACES.md`) with
hybrid search and reranking, returning chunks **with citations and curriculum
tags**.

## Read first
- `context/INTERFACES.md` (RetrievalService)
- `context/CORPUS_POLICY.md`
- `context/ARCHITECTURE.md` (grounding layer)

## Do this
1. Implement hybrid retrieval over `CorpusChunk`: semantic (pgvector) **plus**
   symbol / keyword matching, because maths needs literal matching of notation and
   identifiers alongside semantic similarity.
2. Apply `curriculumFilter` (board / level / spec / topic) before / within
   retrieval.
3. Rerank the merged candidate set; return the top `k` as `RetrievedChunk`s, each
   carrying its `citation`, `curriculumTags`, `provenance`, and `score`.
4. Never return a chunk without provenance / citation (it shouldn't exist
   post-06, but assert it).

## Out of scope / do not touch
- No model calls; retrieval returns context, it does not generate answers.
- Do not assert correctness of anything — retrieval is relevance, not truth.

## Tests (definition of done)
- A query with a curriculum filter returns only in-scope chunks.
- A query containing specific notation retrieves the symbol-matching chunk that
  pure semantic search misses.
- Every returned chunk has a citation + provenance.
