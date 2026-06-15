# CORPUS_POLICY — What May Be Ingested

**Status: canonical. Read before the ingestion / retrieval prompts (06, 07).
Do not relax in a feature prompt.**

The grounding corpus is **legally clean by construction**. This is a hard
requirement, not a preference: the retrieval layer is only as safe as the worst
thing in the vector store.

## MAY be ingested

- **Exam-board specifications.** Published, intended for use. Best source for
  scope, terminology and assessment structure.
- **DfE content store** material (curriculum + mark-scheme data assembled for
  exactly this purpose).
- **Your own `Question[]` bank** and your own authored worked solutions. Owned
  outright; the cleanest corpus you have, and the one a competitor cannot
  lawfully copy from you.

## MUST NOT be ingested

- **Commercial textbooks** (Pearson / Edexcel, CGP, Oxford, Hodder, Collins, ...).
  Copyrighted; ingesting and serving near-verbatim passages is reproduction /
  derivative-work territory. Do not add them, even "just for testing".
- **Past papers / mark schemes** beyond what each board's licence permits and
  beyond the DfE content store. Flag for legal review before ingesting any
  board-copyright material for redistribution; reference-only use differs from
  redistribution and must be checked per board.

If a source's licence isn't known, it does **not** get ingested.

## Provenance is mandatory on every chunk

Every stored chunk carries, and retrieval returns, the `Provenance` record from
INTERFACES.md: `sourceType`, `sourceId`, `licence`, `ownership`.

Ingestion **rejects** any chunk lacking a licence / ownership value. This is what
lets the orchestrator cite sources and lets you prove the corpus is clean.

## Chunking rules

- **LaTeX-aware.** Never split inside a `$...$` / `\[...\]` block or mid-equation.
- **Keep worked examples whole.** A worked example is one chunk; do not fragment
  a derivation across chunks.
- Preserve curriculum tags (board / level / spec / topic) on each chunk for
  filtered retrieval.
