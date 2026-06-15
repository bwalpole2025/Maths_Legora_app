// TutorOrchestrator — INTERFACES.md §4.
// Transcribed faithfully from context/INTERFACES.md.
import { z } from "zod";
import { CitationSchema, VerificationStatusSchema } from "./shared.js";

export const ClaimTypeSchema = z.enum(["curriculum", "hint", "full_solution", "mark_working"]);
export type ClaimType = z.infer<typeof ClaimTypeSchema>;

// CONTRACT GAP — SessionState / TurnTrace: both are referenced by INTERFACES.md §4
// (in `handleTurn(turn, sessionState)` and `TutorReply.trace`) but never defined
// there. The orchestrator that produces them is not built yet (prompt 08). They
// are intentionally opaque placeholders (`unknown`) until the contract is amended
// with their real shapes via a version bump — do NOT rely on these shapes.
// (Note: as `z.unknown()`, `trace` is inferred optional here; INTERFACES.md marks
// it required. That tightening lands with the real TurnTrace definition.)
export const SessionStateSchema = z.unknown();
export type SessionState = z.infer<typeof SessionStateSchema>;

export const TurnTraceSchema = z.unknown(); // retrieval hits, verification calls, routing
export type TurnTrace = z.infer<typeof TurnTraceSchema>;

export const StudentTurnSchema = z.object({
  message: z.string(),
  problemId: z.string().optional(),
  attachmentRef: z.string().optional(), // handwriting image, etc.
  mode: z.enum(["hint_only", "full"]).optional(),
});
export type StudentTurn = z.infer<typeof StudentTurnSchema>;

export const MathsClaimSchema = z.object({
  text: z.string(),
  verificationStatus: z.union([VerificationStatusSchema, z.literal("not_a_correctness_claim")]),
  citations: z.array(CitationSchema),
});
export type MathsClaim = z.infer<typeof MathsClaimSchema>;

export const TutorReplySchema = z.object({
  reply: z.string(),
  claimType: ClaimTypeSchema,
  claims: z.array(MathsClaimSchema), // every maths-bearing sentence, tagged
  citations: z.array(CitationSchema),
  trace: TurnTraceSchema, // retrieval hits, verification calls, routing
});
export type TutorReply = z.infer<typeof TutorReplySchema>;
