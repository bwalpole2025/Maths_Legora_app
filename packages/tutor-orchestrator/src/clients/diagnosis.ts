// HTTP adapter for the DiagnosisService contract → the Python maths service.

import {
  MarkWorkingResultSchema,
  type DiagnosisService,
  type MarkWorkingRequest,
  type MarkWorkingResult,
} from '@imaia/contracts';
import { postJson } from './http.js';

const DEFAULT_URL = process.env.MATHS_URL ?? 'http://localhost:8000';

export class HttpDiagnosisService implements DiagnosisService {
  constructor(private readonly baseUrl: string = DEFAULT_URL) {}

  async markWorking(req: MarkWorkingRequest): Promise<MarkWorkingResult> {
    return MarkWorkingResultSchema.parse(await postJson(`${this.baseUrl}/diagnose/mark-working`, req));
  }
}
