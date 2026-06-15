/**
 * Provenance validation (CORPUS_POLICY.md). Every chunk MUST carry a valid
 * sourceType/ownership and a non-empty licence; anything else is rejected loudly
 * and never stored. This mirrors the DB-side `provenanceGuard` (which also runs on
 * write) using the frozen `ProvenanceSchema`, and is dependency-light so it unit
 * tests with no database.
 */
import { ProvenanceSchema } from "@imaia/contracts";

import type { ChunkInput } from "./types.js";

export class ProvenanceError extends Error {}

export function assertChunkProvenance(chunk: ChunkInput): void {
  const ref = chunk.sourceRef || "<no sourceRef>";
  const parsed = ProvenanceSchema.safeParse(chunk.provenance);
  if (!parsed.success) {
    const why = parsed.error.issues.map((i) => `${i.path.join(".") || "provenance"}: ${i.message}`).join("; ");
    throw new ProvenanceError(`Provenance violation for ${ref} (CORPUS_POLICY.md): ${why}`);
  }
  if (chunk.provenance.licence.trim() === "") {
    throw new ProvenanceError(`Provenance violation for ${ref} (CORPUS_POLICY.md): licence is empty`);
  }
}
