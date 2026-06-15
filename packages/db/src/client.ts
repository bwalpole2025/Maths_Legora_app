import { Prisma, PrismaClient } from '@prisma/client';
import { assertProvenance } from './provenance.js';

/**
 * Client extension that enforces the CORPUS_POLICY provenance rule on writes to
 * the provenance-bearing models. The guard runs before the query reaches the
 * database, so a chunk without a licence/ownership is rejected at the
 * application boundary (in addition to the NOT NULL + CHECK constraints in the
 * migration).
 */
export const provenanceGuard = Prisma.defineExtension({
  name: 'provenanceGuard',
  query: {
    corpusChunk: {
      create({ args, query }) {
        assertProvenance(args.data);
        return query(args);
      },
      upsert({ args, query }) {
        assertProvenance(args.create);
        return query(args);
      },
      createMany({ args, query }) {
        const rows = Array.isArray(args.data) ? args.data : [args.data];
        for (const row of rows) assertProvenance(row);
        return query(args);
      },
    },
    question: {
      create({ args, query }) {
        assertProvenance(args.data);
        return query(args);
      },
      upsert({ args, query }) {
        assertProvenance(args.create);
        return query(args);
      },
      createMany({ args, query }) {
        const rows = Array.isArray(args.data) ? args.data : [args.data];
        for (const row of rows) assertProvenance(row);
        return query(args);
      },
    },
  },
});

// Reuse a single PrismaClient across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const base = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = base;

export const prisma = base.$extends(provenanceGuard);
export type DbClient = typeof prisma;
