/**
 * Deterministic chunk id derived from the chunk's sourceRef. Re-running ingestion
 * with the same sources yields the same ids, so an upsert keyed on id makes the
 * pipeline idempotent (no duplicate rows) without a schema change.
 */
import { createHash } from "node:crypto";

export function chunkId(sourceRef: string): string {
  return createHash("sha256").update(sourceRef).digest("hex").slice(0, 32);
}
