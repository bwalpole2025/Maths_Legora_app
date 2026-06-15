-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('spec', 'dfe_content_store', 'own_question_bank', 'own_authored');

-- CreateEnum
CREATE TYPE "Ownership" AS ENUM ('owned', 'licensed', 'public');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "stem" TEXT NOT NULL,
    "answer" TEXT,
    "curriculumTags" TEXT[],
    "sourceType" "SourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "licence" TEXT NOT NULL,
    "ownership" "Ownership" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorpusChunk" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "curriculumTags" TEXT[],
    "embedding" vector(1536),
    "citationLabel" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "licence" TEXT NOT NULL,
    "ownership" "Ownership" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorpusChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorpusChunk_curriculumTags_idx" ON "CorpusChunk" USING GIN ("curriculumTags");

-- pgvector ANN index for similarity search (cosine distance). HNSW builds on an
-- empty, growing corpus and gives the best recall/latency trade-off. Not
-- expressible in the Prisma schema, so it is added here by hand.
CREATE INDEX "CorpusChunk_embedding_hnsw_idx"
    ON "CorpusChunk" USING hnsw ("embedding" vector_cosine_ops);

-- Provenance guard at the DB level (CORPUS_POLICY.md): a row must carry a
-- non-empty licence. NOT NULL already blocks NULLs; this rejects empty/whitespace.
ALTER TABLE "CorpusChunk"
    ADD CONSTRAINT "CorpusChunk_licence_nonempty" CHECK (length(btrim("licence")) > 0);

ALTER TABLE "Question"
    ADD CONSTRAINT "Question_licence_nonempty" CHECK (length(btrim("licence")) > 0);
