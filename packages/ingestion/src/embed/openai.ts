/**
 * OpenAI embedder — text-embedding-3-small, which is natively 1536-dim (an exact
 * fit for the vector(1536) column). Uses global fetch (Node >= 18), so no SDK
 * dependency. Selected only when OPENAI_API_KEY is set; otherwise the
 * DeterministicEmbedder runs. Batches are sent in one request.
 */
import { assertEmbeddingShape, Embedder, EMBEDDING_DIM } from "./embedder.js";

const ENDPOINT = "https://api.openai.com/v1/embeddings";
const MODEL = "text-embedding-3-small";

export interface OpenAIEmbedderOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export class OpenAIEmbedder implements Embedder {
  readonly name = "openai:text-embedding-3-small";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: OpenAIEmbedderOptions) {
    if (!opts.apiKey) throw new Error("OpenAIEmbedder requires an apiKey");
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? MODEL;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await this.fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        dimensions: EMBEDDING_DIM,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI embeddings failed: ${res.status} ${res.statusText} ${detail}`);
    }
    const body = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    // Order by `index` — the API may not preserve input order.
    const vectors = [...body.data]
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
    assertEmbeddingShape(vectors, texts.length);
    return vectors;
  }
}
