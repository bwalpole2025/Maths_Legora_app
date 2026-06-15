import { describe, expect, it } from 'vitest';
import pino from 'pino';
import { loggerOptions } from '../src/redactLog.js';
import { redactPii } from '../src/pii.js';

function capture() {
  const lines: string[] = [];
  const stream = { write: (s: string) => lines.push(s) };
  const logger = pino(loggerOptions, stream as unknown as pino.DestinationStream);
  return { logger, text: () => lines.join('') };
}

describe('loggerOptions — no PII reaches the logs', () => {
  it('drops client IP, auth and cookies from a request log line', () => {
    const { logger, text } = capture();
    logger.info(
      {
        req: {
          method: 'POST',
          url: '/turn',
          id: 'r1',
          remoteAddress: '203.0.113.7',
          remotePort: 5555,
          headers: { authorization: 'Bearer secret-token', cookie: 'sid=abc123' },
        },
      },
      'incoming request',
    );
    const out = text();
    expect(out).not.toContain('203.0.113.7'); // IP is personal data
    expect(out).not.toContain('secret-token');
    expect(out).not.toContain('abc123');
    expect(out).toContain('/turn'); // url is fine to log
  });

  it('redactPii scrubs student contact details before they could be logged', () => {
    const { logger, text } = capture();
    logger.info(redactPii('reach me at kid@example.com or 07700 900123'));
    const out = text();
    expect(out).not.toContain('kid@example.com');
    expect(out).not.toContain('900123');
    expect(out).toContain('[redacted]');
  });
});
