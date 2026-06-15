// The structured reply the model must emit, and the JSON schema the orchestrator
// pins it to via `output_config.format` on Claude Opus 4.8 (assistant prefill is
// removed on 4.8, so structured output is the supported way to force shape).
//
// The model NEVER writes a verificationStatus. It only:
//   - splits its reply into per-sentence `claims`,
//   - marks each as a correctness claim or not (`assertsCorrectness`),
//   - for a correctness claim, references the verified-result id it narrates
//     (`citesResultId`) — it may only reference a result present in its turn context,
//   - lists the retrieved-chunk sourceRefs that back a curriculum claim (`citationRefs`).
// The orchestrator (gate.ts / prompt 08) turns this into contract `MathsClaim`s and
// strips anything not backed by the turn context.

import { z } from "zod";
import { ClaimTypeSchema } from "@imaia/contracts";

export const ModelClaimSchema = z.object({
  text: z.string(),
  assertsCorrectness: z.boolean(),
  citesResultId: z.string().nullable(),
  citationRefs: z.array(z.string()),
});
export type ModelClaim = z.infer<typeof ModelClaimSchema>;

export const TutorModelOutputSchema = z.object({
  replyMarkdown: z.string(),
  claimType: ClaimTypeSchema,
  claims: z.array(ModelClaimSchema),
});
export type TutorModelOutput = z.infer<typeof TutorModelOutputSchema>;

/** Parse + validate raw model JSON. Returns null on malformed output (the
 *  orchestrator treats that as a hard failure, never as a passable reply). */
export function parseModelOutput(raw: unknown): TutorModelOutput | null {
  const result = TutorModelOutputSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** JSON Schema for Claude's `output_config.format`. Hand-written (not derived) so
 *  it stays within the structured-outputs subset: every object sets
 *  `additionalProperties: false` and only supported types/keywords are used. */
export const TUTOR_OUTPUT_FORMAT = {
  type: "json_schema" as const,
  name: "tutor_reply",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      replyMarkdown: { type: "string" },
      claimType: { type: "string", enum: ["curriculum", "hint", "full_solution", "mark_working"] },
      claims: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: { type: "string" },
            assertsCorrectness: { type: "boolean" },
            citesResultId: { type: ["string", "null"] },
            citationRefs: { type: "array", items: { type: "string" } },
          },
          required: ["text", "assertsCorrectness", "citesResultId", "citationRefs"],
        },
      },
    },
    required: ["replyMarkdown", "claimType", "claims"],
  },
} as const;
