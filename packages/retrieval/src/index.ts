import Fastify from 'fastify';
import { RetrievalQuerySchema } from '@imaia/contracts';
import { loggerOptions } from '@imaia/compliance';
import { prisma } from '@imaia/db';
import { retrieve } from './retrieve.js';
import { httpEmbedder } from './embedder.js';

const SERVICE = 'retrieval';

// Compliance logger options: the student query reaches this service as the
// retrieval text; client IP / auth / cookies and bodies stay out of the logs.
const app = Fastify({ logger: loggerOptions });

// The query embedder is wired to the embedding service (prompt 06) via HTTP.
// Retrieval itself holds no model SDK. Until EMBEDDING_URL is set, /retrieve
// returns 500 (the embedder throws) rather than degrading silently.
const embeddingUrl = process.env.EMBEDDING_URL ?? '';
if (!embeddingUrl) {
  app.log.warn('EMBEDDING_URL is not set; POST /retrieve will fail until the embedding service is configured.');
}
const embed = httpEmbedder({ endpoint: embeddingUrl });

app.get('/health', async () => ({ status: 'ok', service: SERVICE }));

app.post('/retrieve', async (request, reply) => {
  const parsed = RetrievalQuerySchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: 'invalid RetrievalQuery', issues: parsed.error.issues };
  }
  try {
    return await retrieve(parsed.data, { db: prisma, embed });
  } catch (err) {
    app.log.error(err);
    reply.code(500);
    return { error: 'retrieval failed' };
  }
});

const port = Number(process.env.PORT ?? 4001);

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
