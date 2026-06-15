import { describe, expect, it } from "vitest";

import { chunkDocument, chunkDocuments } from "./chunk/chunker.js";
import { OWN_QUESTIONS } from "./data/own-questions.js";
import { ownQuestionsLoader } from "./sources/ownQuestions.js";

describe("worked-example chunking (DoD)", () => {
  it("stores a worked example as a single chunk with its maths intact", async () => {
    const docs = await ownQuestionsLoader().load();
    const d2 = docs.find((d) => d.citation.sourceRef === "own:question:d2-006");
    expect(d2).toBeDefined();

    const chunks = chunkDocument(d2!);
    expect(chunks).toHaveLength(1);

    const { text } = chunks[0];
    // every step's LaTeX survives uncut
    expect(text).toContain("5 \\times 3x^{2} = 15x^2");
    expect(text).toContain("-4 \\times 2x^{1} = -8x");
    expect(text).toContain("\\frac{\\mathrm{d}y}{\\mathrm{d}x} = 15x^2 - 8x + 7");

    // citation + provenance + tags carried onto the chunk
    expect(chunks[0].sourceRef).toBe("own:question:d2-006");
    expect(chunks[0].provenance.licence).toBe("proprietary-imaia");
    expect(chunks[0].provenance.ownership).toBe("owned");
    expect(chunks[0].curriculumTags).toContain("differentiation");
  });

  it("keeps each question as exactly one chunk", async () => {
    const chunks = chunkDocuments(await ownQuestionsLoader().load());
    expect(chunks).toHaveLength(OWN_QUESTIONS.length);
  });
});
