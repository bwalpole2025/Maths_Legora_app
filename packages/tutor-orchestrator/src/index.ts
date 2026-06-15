import Fastify from 'fastify';
import { StudentTurnSchema } from '@imaia/contracts';
import { loggerOptions } from '@imaia/compliance';
import { createOrchestrator } from './orchestrator.js';
import { HttpRetrievalService } from './clients/retrieval.js';
import { HttpVerificationService } from './clients/verification.js';
import { HttpDiagnosisService } from './clients/diagnosis.js';
import { referenceModelClient } from './model-reference.js';
import type { SessionState } from './types.js';

const SERVICE = 'tutor-orchestrator';

// Compliance logger options: client IP / auth / cookies never reach logs, and
// request/response bodies are not logged (no PII in logs — AADC / UK-GDPR).
const app = Fastify({ logger: loggerOptions });

// The reference model lets the service run end-to-end now; prompt 09 swaps in the
// Claude-backed client (LLM_RULES system prompt).
const orchestrator = createOrchestrator({
  retrieval: new HttpRetrievalService(),
  verification: new HttpVerificationService(),
  diagnosis: new HttpDiagnosisService(),
  model: referenceModelClient,
});

app.get('/health', async () => ({ status: 'ok', service: SERVICE }));

app.post('/turn', async (request, reply) => {
  const body = (request.body ?? {}) as { turn?: unknown; sessionState?: unknown };
  const parsed = StudentTurnSchema.safeParse(body.turn);
  if (!parsed.success) {
    return reply.status(400).send({ error: 'invalid StudentTurn', issues: parsed.error.issues });
  }
  const sessionState = (body.sessionState ?? {}) as SessionState;
  return orchestrator.handleTurn(parsed.data, sessionState);
});

const port = Number(process.env.PORT ?? 4000);

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
