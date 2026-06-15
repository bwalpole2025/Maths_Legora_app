/**
 * Provenance guard.
 *
 * CORPUS_POLICY.md requires every stored CorpusChunk (and every Question that
 * seeds the corpus) to carry a licence and an ownership value, and ingestion
 * must REJECT anything missing them. This pure guard backs the Prisma client
 * extension in client.ts. It is deliberately dependency-free so it can be
 * unit-tested without a database or a generated Prisma client.
 */

export interface ProvenanceInput {
  licence?: string | null;
  ownership?: unknown;
}

export function assertProvenance(data: ProvenanceInput): void {
  if (!data.licence || data.licence.trim() === '') {
    throw new Error(
      'Provenance violation: a non-empty `licence` is required (CORPUS_POLICY.md).',
    );
  }
  if (data.ownership == null) {
    throw new Error(
      'Provenance violation: an `ownership` value is required (CORPUS_POLICY.md).',
    );
  }
}
