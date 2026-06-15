import Fastify from 'fastify';

const SERVICE = 'retrieval';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok', service: SERVICE }));

const port = Number(process.env.PORT ?? 4001);

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
