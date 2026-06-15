/**
 * Ingestion pipeline: load -> chunk -> validate provenance -> embed -> write.
 *
 * The Prisma client is injected (not imported), so this module stays hermetic and
 * the validation/chunking paths unit-test without a database. Writes go through
 * `prisma.corpusChunk.upsert` (the DB-side provenanceGuard runs there too), then
 * the embedding vector is backfilled via raw SQL — exactly the pattern the schema
 * prescribes. Idempotent via a deterministic id derived from each sourceRef.
 */
import type { DbClient, Ownership, SourceType } from "@imaia/db";

import { chunkDocuments } from "./chunk/chunker.js";
import type { Embedder } from "./embed/index.js";
import { chunkId } from "./ids.js";
import type { ChunkInput, SourceLoader } from "./types.js";
import { assertChunkProvenance } from "./validate.js";

export interface RejectedChunk {
  sourceRef: string;
  reason: string;
}

export interface IngestResult {
  written: number;
  rejected: RejectedChunk[];
  bySource: Record<string, number>;
}

export interface IngestOptions {
  loaders: SourceLoader[];
  embedder: Embedder;
  prisma: DbClient;
  /** Throw on the first provenance rejection instead of collecting them. */
  strict?: boolean;
}

export async function ingest(opts: IngestOptions): Promise<IngestResult> {
  const { loaders, embedder, prisma, strict = false } = opts;
  const rejected: RejectedChunk[] = [];
  const valid: ChunkInput[] = [];
  const bySource: Record<string, number> = {};

  for (const loader of loaders) {
    const docs = await loader.load();
    for (const chunk of chunkDocuments(docs)) {
      try {
        assertChunkProvenance(chunk);
        valid.push(chunk);
        bySource[loader.name] = (bySource[loader.name] ?? 0) + 1;
      } catch (err) {
        if (strict) throw err;
        rejected.push({
          sourceRef: chunk.sourceRef,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  const vectors = await embedder.embed(valid.map((c) => c.text));

  let written = 0;
  for (let i = 0; i < valid.length; i++) {
    await writeChunk(prisma, valid[i], vectors[i]);
    written++;
  }

  return { written, rejected, bySource };
}

async function writeChunk(prisma: DbClient, chunk: ChunkInput, embedding: number[]): Promise<void> {
  const id = chunkId(chunk.sourceRef);
  const data = {
    text: chunk.text,
    curriculumTags: chunk.curriculumTags,
    citationLabel: chunk.citationLabel,
    sourceRef: chunk.sourceRef,
    sourceType: chunk.provenance.sourceType as SourceType,
    sourceId: chunk.provenance.sourceId,
    licence: chunk.provenance.licence,
    ownership: chunk.provenance.ownership as Ownership,
  };

  // Insert/refresh the row through Prisma so the provenanceGuard runs.
  await prisma.corpusChunk.upsert({ where: { id }, create: { id, ...data }, update: data });

  // Backfill the pgvector column (Prisma has no native vector type).
  const literal = `[${embedding.join(",")}]`;
  await prisma.$executeRaw`UPDATE "CorpusChunk" SET embedding = ${literal}::vector WHERE id = ${id}`;
}
