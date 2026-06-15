import { defineConfig } from 'vitest/config';

// The integration tests talk to the docker-compose pgvector DB. @imaia/db reads
// DATABASE_URL from the environment (Prisma Client does not auto-load .env), so
// default it to the standard local URL from .env.example when not already set.
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://imaia:imaia@localhost:5433/imaia?schema=public';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    env: { DATABASE_URL },
  },
});
