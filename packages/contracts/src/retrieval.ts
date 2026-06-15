// RetrievalService (grounding) — INTERFACES.md §1.
// Transcribed faithfully from context/INTERFACES.md.
import { z } from "zod";
import { CitationSchema, ProvenanceSchema } from "./shared.js";

export const RetrievalQuerySchema = z.object({
  text: z.string(),
  curriculumFilter: z
    .object({
      board: z.string().optional(), // e.g. "edexcel"
      level: z.enum(["gcse", "alevel"]).optional(),
      specCode: z.string().optional(), // e.g. "9MA0"
      topicTags: z.array(z.string()).optional(),
    })
    .optional(),
  // default 8 — the default is applied by the retrieval service (prompt 03), not
  // by the contract, so this stays optional rather than carrying a zod default.
  k: z.number().int().optional(),
});
export type RetrievalQuery = z.infer<typeof RetrievalQuerySchema>;

export const RetrievedChunkSchema = z.object({
  text: z.string(),
  citation: CitationSchema, // human-readable label + machine source ref
  curriculumTags: z.array(z.string()),
  provenance: ProvenanceSchema, // see CORPUS_POLICY.md
  score: z.number(),
});
export type RetrievedChunk = z.infer<typeof RetrievedChunkSchema>;

export const RetrievalResultSchema = z.object({
  chunks: z.array(RetrievedChunkSchema),
  query: RetrievalQuerySchema,
});
export type RetrievalResult = z.infer<typeof RetrievalResultSchema>;
