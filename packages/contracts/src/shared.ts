// Shared contract types — INTERFACES.md "Shared types", plus VerificationStatus
// (used by verification, diagnosis, and the orchestrator's gating rule).
//
// Transcribed faithfully from context/INTERFACES.md. The shapes are frozen —
// changing one requires a contract version bump recorded in INTERFACES.md.
import { z } from "zod";

export const CitationSchema = z.object({
  label: z.string(), // e.g. "Edexcel 9MA0 spec, section 6.2"
  sourceRef: z.string(), // machine id into the corpus
});
export type Citation = z.infer<typeof CitationSchema>;

export const ProvenanceSchema = z.object({
  sourceType: z.enum(["spec", "dfe_content_store", "own_question_bank", "own_authored"]),
  sourceId: z.string(),
  licence: z.string(), // must be present; gates ingestion
  ownership: z.enum(["owned", "licensed", "public"]),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const VerificationStatusSchema = z.enum(["correct", "incorrect", "indeterminate"]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
