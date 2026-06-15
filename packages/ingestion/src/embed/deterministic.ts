/**
 * Deterministic, offline embedder.
 *
 * Maps text -> a stable 1536-dim unit vector with NO network and NO API key, so
 * the whole pipeline (and its tests) runs hermetically. The vector is seeded from
 * a SHA-256 of the (normalised) text via a small xorshift PRNG, then L2-normalised
 * so cosine distance behaves. Identical text always yields the identical vector
 * (this is what makes re-runs reproducible); it carries no real semantic meaning,
 * so swap in a real provider for production retrieval quality.
 */
import { createHash } from "node:crypto";

import { Embedder, EMBEDDING_DIM } from "./embedder.js";

function seedFrom(text: string): number {
  // First 8 hex chars of the digest -> a 32-bit seed (never 0).
  const hex = createHash("sha256").update(text).digest("hex").slice(0, 8);
  return (parseInt(hex, 16) >>> 0) || 0x1a2b3c4d;
}

function* xorshift32(seed: number): Generator<number> {
  let x = seed >>> 0;
  for (;;) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    yield x / 0xffffffff; // [0, 1]
  }
}

function embedOne(text: string): number[] {
  const rng = xorshift32(seedFrom(text.trim()));
  const vec = new Array<number>(EMBEDDING_DIM);
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const v = rng.next().value * 2 - 1; // [-1, 1]
    vec[i] = v;
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < EMBEDDING_DIM; i++) vec[i] /= norm;
  return vec;
}

export class DeterministicEmbedder implements Embedder {
  readonly name = "deterministic";

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(embedOne);
  }
}
