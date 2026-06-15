// Embedder port + production HTTP adapter.
//
// The semantic arm needs a query embedding, but retrieval must contain NO model
// SDK and make no generative model calls (ARCHITECTURE.md: retrieval is relevance,
// never correctness). The embedder is therefore an injected PORT: `retrieve()`
// depends on this function type, and the seam is wired in production to the
// embedding service stood up by the ingestion prompt (06) via a plain HTTP call.
// Tests inject a deterministic fake.

export const EMBEDDING_DIM = 1536; // matches CorpusChunk.embedding vector(1536)

export type Embedder = (text: string) => Promise<number[]>;

export class EmbedderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'EmbedderError';
  }
}

export interface HttpEmbedderOptions {
  endpoint: string; // prompt-06 embedding service URL
  fetchImpl?: typeof fetch; // injectable for testing the adapter itself
  expectedDim?: number; // default EMBEDDING_DIM
  timeoutMs?: number; // default 10_000
}

// Returns an Embedder that POSTs { text } and expects { embedding: number[] }.
// Validates length and finiteness; throws EmbedderError on any failure. No model
// SDK is imported here — only a generic HTTP call.
export function httpEmbedder(opts: HttpEmbedderOptions): Embedder {
  const {
    endpoint,
    fetchImpl = fetch,
    expectedDim = EMBEDDING_DIM,
    timeoutMs = 10_000,
  } = opts;

  return async (text: string): Promise<number[]> => {
    if (!endpoint) {
      throw new EmbedderError('No embedding endpoint configured (set EMBEDDING_URL).');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
    } catch (cause) {
      throw new EmbedderError(`Embedding request to ${endpoint} failed.`, { cause });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      throw new EmbedderError(`Embedding endpoint returned HTTP ${res.status}.`);
    }
    const body = (await res.json()) as { embedding?: unknown };
    const vec = body.embedding;
    if (
      !Array.isArray(vec) ||
      vec.length !== expectedDim ||
      !vec.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      throw new EmbedderError(
        `Embedding endpoint returned a malformed vector (expected ${expectedDim} finite numbers).`,
      );
    }
    return vec as number[];
  };
}
