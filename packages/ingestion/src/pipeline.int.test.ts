/**
 * Integration test: full ingest into the pgvector corpus. GATED — runs only when
 * RUN_DB_TESTS is set and Postgres (docker-compose, port 5433) is reachable with
 * the corpus migration applied. Skipped by default so `pnpm -r test` stays green
 * offline. Uses the deterministic embedder, so no API key is needed.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DeterministicEmbedder } from "./embed/deterministic.js";
import { ingest } from "./pipeline.js";
import { resolveLoaders } from "./sources/registry.js";

const RUN_DB = process.env.RUN_DB_TESTS === "1" || process.env.RUN_DB_TESTS === "true";

describe.skipIf(!RUN_DB)("ingest -> pgvector (integration)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeAll(async () => {
    ({ prisma } = await import("@imaia/db"));
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it("writes chunks with embeddings, every row provenanced, idempotent on re-run", async () => {
    const opts = {
      loaders: resolveLoaders("all"),
      embedder: new DeterministicEmbedder(),
      prisma,
    };

    const first = await ingest(opts);
    expect(first.written).toBeGreaterThan(0);
    expect(first.rejected).toHaveLength(0);

    const count1 = await prisma.corpusChunk.count();
    const embedded = await prisma.$queryRaw`SELECT count(*)::int AS n FROM "CorpusChunk" WHERE embedding IS NOT NULL`;
    expect(Number(embedded[0].n)).toBe(count1);

    // every stored row carries a licence + ownership
    const rows = await prisma.corpusChunk.findMany({ select: { licence: true, ownership: true } });
    for (const r of rows) {
      expect(r.licence.trim()).not.toBe("");
      expect(r.ownership).toBeTruthy();
    }

    // re-run: deterministic ids -> upsert, no duplicates
    await ingest(opts);
    const count2 = await prisma.corpusChunk.count();
    expect(count2).toBe(count1);
  });
});
