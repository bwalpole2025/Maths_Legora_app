// HTTP adapter for the RetrievalService contract → the retrieval service.
//
// Retrieval is still a stub until prompt 07. Rather than fail the turn, an
// unreachable / not-yet-implemented retrieval endpoint degrades to empty
// grounding — the orchestrator still "retrieves first", it just gets no chunks.

import {
  RetrievalResultSchema,
  type RetrievalQuery,
  type RetrievalResult,
  type RetrievalService,
} from '@imaia/contracts';
import { postJson } from './http.js';

const DEFAULT_URL = process.env.RETRIEVAL_URL ?? 'http://localhost:4001';

export class HttpRetrievalService implements RetrievalService {
  constructor(private readonly baseUrl: string = DEFAULT_URL) {}

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    try {
      return RetrievalResultSchema.parse(await postJson(`${this.baseUrl}/retrieve`, query));
    } catch {
      return { chunks: [], query };
    }
  }
}
