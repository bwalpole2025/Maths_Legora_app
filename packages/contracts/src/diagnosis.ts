// DiagnosisService (marking) — INTERFACES.md §3.
//
// These shapes mirror services/maths/app/models.py exactly so the Node and Python
// sides share one contract and round-trip the same JSON.
//
// CONTRACT NOTE — MarkScheme: INTERFACES.md references `MarkScheme` from
// `MarkWorkingRequest.markScheme` but never defines it. The maths service
// (prompt 03) defines a concrete board-style shape (M/A/B marks with
// dependencies + follow-through); this file mirrors that definition verbatim so
// both sides agree. The frozen `MarkWorkingResult` output shape is unchanged —
// the scheme only enriches how `marksAwarded` is computed. If INTERFACES.md is
// later amended with a different MarkScheme, bump the contract version and update
// both sides together.
import { z } from "zod";
import { VerificationStatusSchema } from "./shared.js";

// M = method, A = accuracy (typically depends on its method mark), B = independent.
export const MarkTypeSchema = z.enum(["M", "A", "B"]);
export type MarkType = z.infer<typeof MarkTypeSchema>;

export const MarkSchemeMarkSchema = z.object({
  id: z.string(),
  type: MarkTypeSchema,
  maxMarks: z.number().int(), // maximum marks this line is worth (usually 1)
  stepIndex: z.number().int().optional(), // which student step (0-based) earns this mark
  dependsOn: z.array(z.string()).optional(), // ids of marks that must be awarded first
  ft: z.boolean(), // follow-through: earnable under ECF (e.g. "A1ft")
  description: z.string().optional(),
});
export type MarkSchemeMark = z.infer<typeof MarkSchemeMarkSchema>;

export const MarkSchemeSchema = z.object({
  marks: z.array(MarkSchemeMarkSchema),
});
export type MarkScheme = z.infer<typeof MarkSchemeSchema>;

export const MarkWorkingRequestSchema = z.object({
  problemLatex: z.string(),
  studentStepsLatex: z.array(z.string()), // direct, or produced by OCR upstream
  markScheme: MarkSchemeSchema.optional(), // optional board mark scheme
  // default true — applied by the diagnosis service (prompt 04), so this stays
  // optional rather than carrying a zod default.
  allowEcf: z.boolean().optional(),
});
export type MarkWorkingRequest = z.infer<typeof MarkWorkingRequestSchema>;

export const PerStepStatusSchema = z.object({
  index: z.number().int(),
  status: VerificationStatusSchema,
  isFirstDivergence: z.boolean(),
  carriedForward: z.boolean(), // accepted under ECF
});
export type PerStepStatus = z.infer<typeof PerStepStatusSchema>;

export const MarkWorkingResultSchema = z.object({
  marksAwarded: z.number().int(),
  marksAvailable: z.number().int(),
  firstDivergenceIndex: z.number().int().nullable(),
  perStep: z.array(PerStepStatusSchema),
  ecfApplied: z.boolean(),
});
export type MarkWorkingResult = z.infer<typeof MarkWorkingResultSchema>;
