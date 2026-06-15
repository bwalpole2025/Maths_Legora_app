// Deterministic: the system prompt instantiates LLM_RULES without weakening it,
// the turn-context builder surfaces mode + sources + verified results, and the
// structured output schema is well-formed.
import { describe, expect, it } from "vitest";

import {
  TUTOR_CONSTITUTION,
  RULES,
  buildSystemPrompt,
  buildTurnContext,
  TutorModelOutputSchema,
  TUTOR_OUTPUT_FORMAT,
  type TurnContext,
} from "../src/prompt/index.js";

describe("constitution coverage (no silent weakening of LLM_RULES)", () => {
  // Compare with collapsed whitespace so a required phrase still matches when the
  // constitution hard-wraps it across a line (e.g. "maths is\ncorrect").
  const flat = (s: string) => s.replace(/\s+/g, " ");
  const constitution = flat(TUTOR_CONSTITUTION);

  for (const rule of RULES) {
    for (const phrase of rule.mustContain) {
      it(`${rule.id}: contains ${JSON.stringify(phrase)}`, () => {
        expect(constitution).toContain(flat(phrase));
      });
    }
  }

  it("buildSystemPrompt returns the frozen constitution", () => {
    expect(buildSystemPrompt()).toBe(TUTOR_CONSTITUTION);
  });
});

describe("buildTurnContext", () => {
  const ctx: TurnContext = {
    mode: "hint_only",
    studentMessage: "give me a hint on expanding (x+1)^2",
    retrievedChunks: [
      {
        text: "Expand products of binomials.",
        citation: { label: "Edexcel 9MA0 spec, section 2.1", sourceRef: "edexcel-9MA0-2.1" },
        curriculumTags: [],
        provenance: { sourceType: "spec", sourceId: "edexcel-9MA0-2.1", licence: "OGL-3.0", ownership: "licensed" },
        score: 0.9,
      },
    ],
    verifiedResults: [{ id: "v1", kind: "answer", status: "correct", summary: "the simplified form is x^2 + 2x + 1" }],
  };

  it("surfaces mode, the chunk sourceRef, the result id, and the student message", () => {
    const turn = buildTurnContext(ctx);
    expect(turn).toContain("MODE: hint_only");
    expect(turn).toContain("edexcel-9MA0-2.1");
    expect(turn).toContain("id=v1");
    expect(turn).toContain("give me a hint on expanding");
  });

  it("calls out empty context and forbids correctness claims with no verified results", () => {
    const empty = buildTurnContext({ mode: "full", studentMessage: "what is x?", retrievedChunks: [], verifiedResults: [] });
    expect(empty).toContain("RETRIEVED CONTEXT: none");
    expect(empty).toContain("MUST NOT assert any correctness claim");
  });
});

describe("structured output contract", () => {
  it("parses a valid model output", () => {
    const sample = {
      replyMarkdown: "Try expanding each term first.",
      claimType: "hint" as const,
      claims: [{ text: "Expanding means multiplying each term.", assertsCorrectness: false, citesResultId: null, citationRefs: ["edexcel-9MA0-2.1"] }],
    };
    expect(TutorModelOutputSchema.safeParse(sample).success).toBe(true);
  });

  it("exposes a json_schema format for output_config", () => {
    expect(TUTOR_OUTPUT_FORMAT.type).toBe("json_schema");
  });
});
