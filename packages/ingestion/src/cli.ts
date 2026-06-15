/**
 * Ingestion CLI: `ingest [--source all|own|spec|dfe[,...]]`.
 *
 * Loads the permitted sources, embeds (OpenAI when keyed, else deterministic) and
 * idempotently writes chunks into the pgvector corpus. Re-runnable: re-running
 * upserts the same rows rather than duplicating them.
 */
import { prisma } from "@imaia/db";

import { selectEmbedder } from "./embed/index.js";
import { ingest } from "./pipeline.js";
import { resolveLoaders, SourceKey } from "./sources/registry.js";

function parseSources(argv: string[]): SourceKey[] | "all" {
  const idx = argv.indexOf("--source");
  if (idx === -1) return "all";
  const val = argv[idx + 1];
  if (!val || val === "all") return "all";
  return val.split(",").map((s) => s.trim()) as SourceKey[];
}

async function main(): Promise<void> {
  const loaders = resolveLoaders(parseSources(process.argv.slice(2)));
  const embedder = selectEmbedder();
  console.log(
    `[ingest] embedder=${embedder.name} sources=${loaders.map((l) => l.name).join(",")}`,
  );

  const result = await ingest({ loaders, embedder, prisma });
  console.log(
    `[ingest] written=${result.written} bySource=${JSON.stringify(result.bySource)}`,
  );

  if (result.rejected.length > 0) {
    console.error(`[ingest] REJECTED ${result.rejected.length} chunk(s) for provenance:`);
    for (const r of result.rejected) console.error(`  - ${r.sourceRef}: ${r.reason}`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
