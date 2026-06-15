import { describe, expect, it } from "vitest";

import { chunkLatexAware, segmentLatex } from "./latex.js";

const DISPLAY = "\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]";

describe("segmentLatex", () => {
  it("isolates display and inline maths spans from prose", () => {
    const segs = segmentLatex(`Use ${DISPLAY} to solve, where \\( a \\neq 0 \\).`);
    const math = segs.filter((s) => s.type === "math").map((s) => s.value);
    expect(math).toContain(DISPLAY);
    expect(math).toContain("\\( a \\neq 0 \\)");
  });

  it("handles $$...$$ vs $...$ correctly", () => {
    const segs = segmentLatex("a $$y^2$$ b $z$ c");
    const math = segs.filter((s) => s.type === "math").map((s) => s.value);
    expect(math).toEqual(["$$y^2$$", "$z$"]);
  });
});

describe("chunkLatexAware", () => {
  it("never splits inside a display-maths span even when forced small", () => {
    const prose = "This is a long sentence of plain prose that must be split. ".repeat(6);
    const chunks = chunkLatexAware(`${prose} ${DISPLAY} ${prose}`, { maxChars: 80 });
    // the display-maths literal survives intact in exactly one chunk
    expect(chunks.filter((c) => c.includes(DISPLAY))).toHaveLength(1);
    // no chunk has unbalanced \[ ... \] delimiters
    for (const c of chunks) {
      expect((c.match(/\\\[/g) ?? []).length).toBe((c.match(/\\\]/g) ?? []).length);
    }
  });

  it("keeps an inline $...$ span intact when it is larger than maxChars", () => {
    const chunks = chunkLatexAware("aaaa $x^2 + 1$ bbbb", { maxChars: 6 });
    expect(chunks.filter((c) => c.includes("$x^2 + 1$"))).toHaveLength(1);
    // every chunk has an even number of $ (no broken inline maths)
    for (const c of chunks) expect((c.match(/\$/g) ?? []).length % 2).toBe(0);
  });
});
