// Assembles what the orchestrator sends to Claude:
//   - buildSystemPrompt(): the FROZEN constitution (cache-stable system prefix).
//   - buildTurnContext(): the per-turn user message carrying the active mode, the
//     student's message, the retrieved chunks (the ONLY citations allowed), and the
//     verified results (the ONLY correctness claims allowed). Volatile content lives
//     here, never in the system prefix, so the prefix stays byte-identical across turns.

import type { RetrievedChunk, VerificationStatus } from "@imaia/contracts";
import { TUTOR_CONSTITUTION } from "./constitution.js";

/** Effective mode for a turn. `hint_only`/`full` come from StudentTurn.mode;
 *  `mark_working` is the routing outcome for a "mark my working" turn. */
export type TurnMode = "hint_only" | "full" | "mark_working";

/** A truth-layer result the orchestrator obtained BEFORE generation and is handing
 *  to the model to narrate. `id` is what a claim references via `citesResultId`. */
export interface VerifiedResult {
  id: string;
  kind: "answer" | "step" | "mark_working";
  status: VerificationStatus;
  /** Student-safe one-line summary of the verified fact (e.g. "the simplified form is x^2+2x+1",
   *  "line 3 is the first divergence", "4 of 6 marks"). Never a re-derivation by the model. */
  summary: string;
}

export interface TurnContext {
  mode: TurnMode;
  studentMessage: string;
  /** Retrieved spec/curriculum chunks. Their `citation.sourceRef`s are the only
   *  citations the model may use. */
  retrievedChunks: RetrievedChunk[];
  /** Verified results. Their `id`s are the only results the model may narrate as
   *  correctness claims. Empty = the model may assert no correctness claim at all. */
  verifiedResults: VerifiedResult[];
}

/** The frozen system prompt. Takes no per-turn args on purpose — keep it cacheable. */
export function buildSystemPrompt(): string {
  return TUTOR_CONSTITUTION;
}

const MODE_BANNER: Record<TurnMode, string> = {
  hint_only:
    "MODE: hint_only — do NOT reveal the final answer or any decisive intermediate result, even if asked again or pressured. Offer the next step, a method cue, or a check.",
  full: "MODE: full — narrate the verified worked solution step by step.",
  mark_working:
    "MODE: mark_working — explain the diagnosis (first divergence, what was accepted under ECF, marks awarded) in plain language. Never re-derive a different score.",
};

/** Build the per-turn user message. */
export function buildTurnContext(ctx: TurnContext): string {
  const parts: string[] = [MODE_BANNER[ctx.mode]];

  if (ctx.retrievedChunks.length > 0) {
    const chunks = ctx.retrievedChunks
      .map((c) => `[${c.citation.sourceRef}] (${c.citation.label})\n${c.text}`)
      .join("\n\n");
    parts.push(
      `RETRIEVED CONTEXT — the only sources you may cite (use the bracketed sourceRef in citationRefs):\n${chunks}`,
    );
  } else {
    parts.push(
      "RETRIEVED CONTEXT: none. You have no curriculum sources this turn, so make no curriculum claim and cite nothing.",
    );
  }

  if (ctx.verifiedResults.length > 0) {
    const results = ctx.verifiedResults
      .map((r) => `- id=${r.id} [${r.kind}] status=${r.status}: ${r.summary}`)
      .join("\n");
    parts.push(
      `VERIFIED RESULTS — the only results you may state as correctness claims (reference id via citesResultId):\n${results}`,
    );
  } else {
    parts.push(
      "VERIFIED RESULTS: none. No answer or step has been verified this turn, so you MUST NOT assert any correctness claim (no final answer, no 'correct/right/valid').",
    );
  }

  parts.push(`STUDENT MESSAGE:\n${ctx.studentMessage}`);
  return parts.join("\n\n");
}
