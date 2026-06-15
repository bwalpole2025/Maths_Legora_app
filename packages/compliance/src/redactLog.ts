// Shared pino logger options for the Fastify services.
//
// Client IP, auth, and cookies are personal data / secrets and must never reach
// logs; request/response BODIES are never logged (we do not enable body logging).
// A minimal `req` serializer emits method + url + id only, dropping the
// remoteAddress / remotePort / headers the default Fastify serializer would log.
// The redact paths are belt-and-braces for any object logged with those keys.
import type { LoggerOptions } from 'pino';

export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.remoteAddress',
  'req.remotePort',
  'headers.authorization',
  'headers.cookie',
];

interface MinimalReq {
  method?: string;
  url?: string;
  id?: string;
}

export const loggerOptions: LoggerOptions = {
  redact: { paths: REDACT_PATHS, censor: '[redacted]' },
  serializers: {
    // method + url + id only — no remoteAddress, no headers, no body.
    req(req: MinimalReq) {
      return { method: req.method, url: req.url, id: req.id };
    },
  },
};
