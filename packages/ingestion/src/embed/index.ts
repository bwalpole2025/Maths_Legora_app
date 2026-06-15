/** Embedder selection: OpenAI when keyed, else the deterministic offline default. */
import { DeterministicEmbedder } from "./deterministic.js";
import { Embedder } from "./embedder.js";
import { OpenAIEmbedder } from "./openai.js";

export * from "./embedder.js";
export { DeterministicEmbedder } from "./deterministic.js";
export { OpenAIEmbedder } from "./openai.js";

/**
 * Pick an embedder from the environment. Set `OPENAI_API_KEY` (and optionally
 * `EMBEDDINGS_PROVIDER=openai`) to use the real provider; with no key, or
 * `EMBEDDINGS_PROVIDER=deterministic`, the offline embedder is used so ingestion
 * runs anywhere.
 */
export function selectEmbedder(env: NodeJS.ProcessEnv = process.env): Embedder {
  const provider = (env.EMBEDDINGS_PROVIDER ?? "").toLowerCase();
  const key = env.OPENAI_API_KEY;

  if (provider === "deterministic") return new DeterministicEmbedder();
  if (provider === "openai" || (provider === "" && key)) {
    if (!key) throw new Error("EMBEDDINGS_PROVIDER=openai but OPENAI_API_KEY is not set");
    return new OpenAIEmbedder({ apiKey: key });
  }
  return new DeterministicEmbedder();
}
