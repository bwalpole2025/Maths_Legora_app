/**
 * Embedding provider abstraction.
 *
 * The CorpusChunk.embedding column is `vector(1536)`, so every embedder MUST emit
 * 1536-dimensional vectors. The embedder lives only in the ingestion / retrieval
 * layer — never the truth layer (verification / diagnosis).
 *
 * Two implementations:
 *   - DeterministicEmbedder — offline, no key, reproducible. The DEFAULT, so tests
 *     and CI run with no network. Vectors are stable per input text but carry no
 *     real semantic meaning.
 *   - OpenAIEmbedder — text-embedding-3-small (natively 1536-dim). Used when
 *     OPENAI_API_KEY is set.
 */

export const EMBEDDING_DIM = 1536;

export interface Embedder {
  /** Human-readable id recorded in ingestion logs. */
  readonly name: string;
  /** Embed a batch of texts. Each result has length EMBEDDING_DIM. */
  embed(texts: string[]): Promise<number[][]>;
}

export class EmbeddingDimError extends Error {}

/** Guard: a provider must return one EMBEDDING_DIM vector per input text. */
export function assertEmbeddingShape(vectors: number[][], expectedCount: number): void {
  if (vectors.length !== expectedCount) {
    throw new EmbeddingDimError(
      `embedder returned ${vectors.length} vectors for ${expectedCount} inputs`,
    );
  }
  for (const v of vectors) {
    if (v.length !== EMBEDDING_DIM) {
      throw new EmbeddingDimError(
        `embedder returned a vector of length ${v.length}, expected ${EMBEDDING_DIM}`,
      );
    }
  }
}
