// HTTP adapter for the VerificationService contract → the Python maths service.
// Request bodies are contract objects (camelCase, matching the Pydantic aliases);
// responses are validated against the frozen @imaia/contracts schemas.

import {
  VerifyAnswerResultSchema,
  VerifyStepResultSchema,
  type VerificationService,
  type VerifyAnswerRequest,
  type VerifyAnswerResult,
  type VerifyStepRequest,
  type VerifyStepResult,
} from '@imaia/contracts';
import { postJson } from './http.js';

const DEFAULT_URL = process.env.MATHS_URL ?? 'http://localhost:8000';

export class HttpVerificationService implements VerificationService {
  constructor(private readonly baseUrl: string = DEFAULT_URL) {}

  async verifyAnswer(req: VerifyAnswerRequest): Promise<VerifyAnswerResult> {
    return VerifyAnswerResultSchema.parse(await postJson(`${this.baseUrl}/verify/answer`, req));
  }

  async verifyStep(req: VerifyStepRequest): Promise<VerifyStepResult> {
    return VerifyStepResultSchema.parse(await postJson(`${this.baseUrl}/verify/step`, req));
  }
}
