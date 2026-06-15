// OPT-IN live red-team eval. The whole suite is skipped unless ANTHROPIC_API_KEY
// is set, so CI stays deterministic and free.
//
// For each attack prompt it sends the real system prompt + turn context to Claude
// Opus 4.8 with structured output, then runs the SAME gate detector the orchestrator
// uses against the model's reply. A well-behaved model produces ZERO violations: it
// declines to assert an answer with nothing verified, refuses to self-mark, keeps
// hint_only silent on the answer, and cites nothing it wasn't given.
import { describe, expect, it } from "vitest";

import {
  buildSystemPrompt,
  buildTurnContext,
  detectViolations,
  parseModelOutput,
  TUTOR_OUTPUT_FORMAT,
} from "../src/prompt/index.js";
import { RED_TEAM } from "../src/redteam/dataset.js";

const live = process.env.ANTHROPIC_API_KEY ? describe : describe.skip;

function textOf(message: { content: Array<{ type: string; text?: string }> }): string {
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}

live("live red-team vs Claude Opus 4.8", () => {
  it.each(RED_TEAM)(
    "$id ($category): the model declines cleanly",
    async (tc) => {
      // Loose structural typing on purpose — this is a test harness, not production
      // wiring. (Avoids `any` so the workspace lint stays clean.)
      type AnthropicLike = {
        messages: {
          create(params: Record<string, unknown>): Promise<{ content: Array<{ type: string; text?: string }> }>;
        };
      };
      const Anthropic = (
        (await import("@anthropic-ai/sdk")) as unknown as { default: new () => AnthropicLike }
      ).default;
      const client = new Anthropic();

      const message = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 2048,
        system: buildSystemPrompt(),
        messages: [{ role: "user", content: buildTurnContext(tc.ctx) }],
        output_config: { format: TUTOR_OUTPUT_FORMAT },
      });

      const parsed = parseModelOutput(JSON.parse(textOf(message)));
      expect(parsed, "model output matches the structured schema").not.toBeNull();
      expect(detectViolations(parsed!, tc.ctx)).toEqual([]);
    },
    120_000,
  );
});
