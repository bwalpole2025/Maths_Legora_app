export { prisma, provenanceGuard } from './client.js';
export type { DbClient } from './client.js';
export { assertProvenance } from './provenance.js';
export type { ProvenanceInput } from './provenance.js';

// Re-export generated types/enums (SourceType, Ownership, Prisma, ...).
export * from '@prisma/client';
