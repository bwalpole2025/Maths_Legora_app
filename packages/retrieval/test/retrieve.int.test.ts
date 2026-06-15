// Integration tests for hybrid retrieve() against the docker-compose pgvector DB.
// These are the prompt-07 definition-of-done tests. They SKIP gracefully if the
// DB is unreachable / unmigrated (run: docker compose up -d db && pnpm --filter
// @imaia/db migrate:deploy).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { retrieve } from '../src/retrieve.js';
import type { Embedder } from '../src/embedder.js';
import {
  basisVector,
  prisma,
  seedChunks,
  testDbAvailable,
  truncateCorpus,
  type SeedChunk,
} from './helpers/db.js';

const dbUp = await testDbAvailable();
if (!dbUp) {
  console.warn(
    '[retrieval] DB unreachable or unmigrated — skipping integration tests. ' +
      'Run: docker compose up -d db && pnpm --filter @imaia/db migrate:deploy',
  );
}

// Concept axes for the basis-vector embeddings.
const CALCULUS = 0;
const ALGEBRA = 1;
const INTEGRATION = 2;

const SEED: SeedChunk[] = [
  {
    id: 'C1',
    text: 'Differentiate using the chain rule: dy/dx = ...',
    curriculumTags: ['edexcel', 'alevel', '9MA0', 'differentiation'],
    citationLabel: 'Edexcel 9MA0 spec, 8.1',
    sourceRef: 'edexcel-9ma0#8.1',
    sourceType: 'spec',
    sourceId: 'edexcel-9ma0',
    licence: 'OGL-3.0',
    ownership: 'public',
    concept: CALCULUS,
  },
  {
    id: 'C2',
    text: 'Solve the quadratic by factorising x^2 + 5x + 6 = 0',
    curriculumTags: ['edexcel', 'gcse', 'factorising'],
    citationLabel: 'IMAIA authored: quadratics',
    sourceRef: 'imaia#quad-1',
    sourceType: 'own_authored',
    sourceId: 'imaia-bank',
    licence: 'proprietary',
    ownership: 'owned',
    concept: ALGEBRA,
  },
  {
    id: 'C3',
    text: 'The integral \\int_0^1 x^2 dx evaluates to 1/3',
    curriculumTags: ['edexcel', 'alevel', '9MA0', 'integration'],
    citationLabel: 'Edexcel 9MA0 spec, 8.3',
    sourceRef: 'edexcel-9ma0#8.3',
    sourceType: 'spec',
    sourceId: 'edexcel-9ma0',
    licence: 'OGL-3.0',
    ownership: 'public',
    concept: INTEGRATION,
  },
  {
    id: 'C4',
    text: 'General study skills and revision tips for exams',
    curriculumTags: ['aqa', 'gcse'],
    citationLabel: 'IMAIA authored: study skills',
    sourceRef: 'imaia#study-1',
    sourceType: 'own_authored',
    sourceId: 'imaia-bank',
    licence: 'proprietary',
    ownership: 'owned',
    concept: CALCULUS,
  },
  {
    id: 'C5',
    // Contains literal \int but is semantically FAR (algebra axis) from an
    // integration query — the chunk pure semantic search misses.
    text: 'Using \\int for definite integrals in mechanics problems',
    curriculumTags: ['edexcel', 'alevel', '9MA0', 'mechanics'],
    citationLabel: 'Edexcel 9MA0 spec, 9.2',
    sourceRef: 'edexcel-9ma0#9.2',
    sourceType: 'spec',
    sourceId: 'edexcel-9ma0',
    licence: 'OGL-3.0',
    ownership: 'public',
    concept: ALGEBRA,
  },
];

const fixedEmbedder = (concept: number): Embedder => {
  const v = basisVector(concept);
  return async () => v;
};

const sourceRefs = (chunks: { citation: { sourceRef: string } }[]): string[] =>
  chunks.map((c) => c.citation.sourceRef);

const d = dbUp ? describe : describe.skip;

d('retrieve (integration, pgvector)', () => {
  beforeEach(async () => {
    await truncateCorpus();
    await seedChunks(SEED);
  });

  afterAll(async () => {
    await truncateCorpus();
    await prisma.$disconnect();
  });

  it('curriculum filter returns only in-scope chunks', async () => {
    const res = await retrieve(
      {
        text: 'differentiate the integral',
        curriculumFilter: { board: 'edexcel', level: 'alevel', specCode: '9MA0' },
      },
      { db: prisma, embed: fixedEmbedder(CALCULUS) },
    );

    expect(res.chunks.length).toBeGreaterThan(0);
    for (const c of res.chunks) {
      expect(c.curriculumTags).toEqual(expect.arrayContaining(['edexcel', 'alevel', '9MA0']));
    }
    const refs = sourceRefs(res.chunks);
    expect(refs).not.toContain('imaia#quad-1'); // C2 is gcse
    expect(refs).not.toContain('imaia#study-1'); // C4 is aqa
  });

  it('surfaces the symbol-matching chunk that pure semantic search misses', async () => {
    // Query embeds to the INTEGRATION axis. C3 (integration) is the semantic
    // top-1. C1 and C5 are both semantically orthogonal (distance 1), so pure
    // semantic would pick C1 (id ASC) for the 2nd slot. But C5 literally contains
    // \int, so the keyword arm lifts it above C1 under fusion.
    const res = await retrieve(
      {
        text: 'evaluate \\int',
        curriculumFilter: { board: 'edexcel', level: 'alevel', specCode: '9MA0' },
        k: 2,
      },
      { db: prisma, embed: fixedEmbedder(INTEGRATION) },
    );

    const refs = sourceRefs(res.chunks);
    expect(refs).toContain('edexcel-9ma0#9.2'); // C5, found via the keyword arm
    expect(refs).not.toContain('edexcel-9ma0#8.1'); // C1, semantically tied but no \int
  });

  it('returns every chunk with a citation and provenance', async () => {
    const res = await retrieve(
      { text: 'integral \\int differentiate' },
      { db: prisma, embed: fixedEmbedder(INTEGRATION) },
    );

    expect(res.chunks.length).toBeGreaterThan(0);
    for (const c of res.chunks) {
      expect(c.citation.label.length).toBeGreaterThan(0);
      expect(c.citation.sourceRef.length).toBeGreaterThan(0);
      expect(c.provenance.licence.length).toBeGreaterThan(0);
      expect(c.provenance.sourceId.length).toBeGreaterThan(0);
      expect(['owned', 'licensed', 'public']).toContain(c.provenance.ownership);
      expect(['spec', 'dfe_content_store', 'own_question_bank', 'own_authored']).toContain(
        c.provenance.sourceType,
      );
    }
  });

  it('the corpus cannot store a chunk without a licence (guard)', async () => {
    await expect(
      prisma.corpusChunk.create({
        data: {
          text: 'no licence',
          curriculumTags: [],
          citationLabel: 'x',
          sourceRef: 'x',
          sourceType: 'spec',
          sourceId: 'x',
          licence: '',
          ownership: 'public',
        },
      }),
    ).rejects.toThrow(/licence/i);
  });

  it('returns an empty result for an empty corpus (no throw)', async () => {
    await truncateCorpus();
    const res = await retrieve(
      { text: 'anything \\int' },
      { db: prisma, embed: fixedEmbedder(INTEGRATION) },
    );
    expect(res.chunks).toEqual([]);
  });

  it('fails (no silent keyword-only fallback) when the embedder errors', async () => {
    const broken: Embedder = async () => {
      throw new Error('embedder down');
    };
    await expect(retrieve({ text: '\\int' }, { db: prisma, embed: broken })).rejects.toThrow();
  });

  it('returns a chunk hit by both arms only once', async () => {
    const res = await retrieve(
      { text: 'integral \\int' },
      { db: prisma, embed: fixedEmbedder(INTEGRATION) },
    );
    const c3 = sourceRefs(res.chunks).filter((r) => r === 'edexcel-9ma0#8.3');
    expect(c3).toHaveLength(1);
  });

  it('defaults k to 8 when omitted', async () => {
    const res = await retrieve(
      { text: 'integral \\int differentiate factorising' },
      { db: prisma, embed: fixedEmbedder(INTEGRATION) },
    );
    expect(res.chunks.length).toBeLessThanOrEqual(8);
  });
});
