import { describe, expect, it } from "vitest";

import { DeterministicEmbedder } from "./deterministic.js";
import { EMBEDDING_DIM } from "./embedder.js";

describe("DeterministicEmbedder", () => {
  it("returns one EMBEDDING_DIM (1536) vector per input", async () => {
    const vecs = await new DeterministicEmbedder().embed(["alpha", "beta"]);
    expect(vecs).toHaveLength(2);
    for (const v of vecs) expect(v).toHaveLength(EMBEDDING_DIM);
  });

  it("is deterministic and unit-normalised", async () => {
    const e = new DeterministicEmbedder();
    const [a] = await e.embed(["same text"]);
    const [b] = await e.embed(["same text"]);
    expect(a).toEqual(b); // reproducible -> idempotent re-embeds
    const norm = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it("differs for different inputs", async () => {
    const e = new DeterministicEmbedder();
    const [a] = await e.embed(["foo"]);
    const [b] = await e.embed(["bar"]);
    expect(a).not.toEqual(b);
  });
});
