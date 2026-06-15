// VerificationService (truth) — INTERFACES.md §2.
//
// These shapes mirror services/maths/app/models.py exactly so the Node and Python
// sides share one contract and round-trip the same JSON (see test/contracts.test.ts
// and services/maths/tests/test_contracts.py). Do not diverge without a version bump.
import { z } from "zod";
import { VerificationStatusSchema } from "./shared.js";

// "cas" is reserved in the contract for a future external CAS; the maths service
// currently only ever decides via "sympy" or its "numeric" tail.
export const VerifyMethodSchema = z.enum(["sympy", "numeric", "cas"]);
export type VerifyMethod = z.infer<typeof VerifyMethodSchema>;

export const VerifyAnswerRequestSchema = z.object({
  problemLatex: z.string(),
  candidateAnswerLatex: z.string(),
  domainHints: z.record(z.string(), z.unknown()).optional(), // assumptions, variable domains
});
export type VerifyAnswerRequest = z.infer<typeof VerifyAnswerRequestSchema>;

export const VerifyAnswerResultSchema = z.object({
  status: VerificationStatusSchema,
  canonicalAnswerLatex: z.string().optional(), // present when the service can produce it
  method: VerifyMethodSchema,
  detail: z.string().optional(), // internal only — never shown to students
});
export type VerifyAnswerResult = z.infer<typeof VerifyAnswerResultSchema>;

export const VerifyStepRequestSchema = z.object({
  problemLatex: z.string(),
  priorStepsLatex: z.array(z.string()),
  stepLatex: z.string(),
});
export type VerifyStepRequest = z.infer<typeof VerifyStepRequestSchema>;

export const VerifyStepResultSchema = z.object({
  status: VerificationStatusSchema,
  detail: z.string().optional(), // internal only
});
export type VerifyStepResult = z.infer<typeof VerifyStepResultSchema>;
