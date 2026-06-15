import { describe, expect, it } from "vitest";

import { LOADERS, PERMITTED_SOURCE_TYPES, resolveLoaders } from "./sources/registry.js";
import type { ChunkInput } from "./types.js";
import { assertChunkProvenance, ProvenanceError } from "./validate.js";

const VALID: ChunkInput = {
  text: "some spec text",
  curriculumTags: ["alevel"],
  citationLabel: "Edexcel 9MA0 spec, section 1.1",
  sourceRef: "spec:9MA0:1.1",
  provenance: {
    sourceType: "spec",
    sourceId: "9MA0:1.1",
    licence: "edexcel-spec-reference",
    ownership: "licensed",
  },
};

describe("provenance rejection (DoD / CORPUS_POLICY)", () => {
  it("accepts a chunk carrying licence + ownership", () => {
    expect(() => assertChunkProvenance(VALID)).not.toThrow();
  });

  it("rejects an empty / whitespace licence", () => {
    const bad = { ...VALID, provenance: { ...VALID.provenance, licence: "   " } };
    expect(() => assertChunkProvenance(bad)).toThrow(ProvenanceError);
  });

  it("rejects a missing licence", () => {
    const bad = {
      ...VALID,
      provenance: { sourceType: "spec", sourceId: "x", ownership: "licensed" },
    } as unknown as ChunkInput;
    expect(() => assertChunkProvenance(bad)).toThrow(/licence/i);
  });

  it("rejects a missing ownership", () => {
    const bad = {
      ...VALID,
      provenance: { sourceType: "spec", sourceId: "x", licence: "OGL-3.0" },
    } as unknown as ChunkInput;
    expect(() => assertChunkProvenance(bad)).toThrow(ProvenanceError);
  });
});

describe("permitted sources only (no textbook / unlicensed path)", () => {
  it("the registry exposes exactly the three permitted loaders", () => {
    expect(Object.keys(LOADERS).sort()).toEqual(["dfe", "own", "spec"]);
    expect(Object.keys(LOADERS)).not.toContain("textbook");
  });

  it("every loaded document has a permitted sourceType + non-empty licence + ownership", async () => {
    for (const loader of resolveLoaders("all")) {
      const docs = await loader.load();
      expect(docs.length).toBeGreaterThan(0);
      for (const d of docs) {
        expect(PERMITTED_SOURCE_TYPES).toContain(d.provenance.sourceType);
        expect(d.provenance.licence.trim()).not.toBe("");
        expect(d.provenance.ownership).toBeTruthy();
        // and it never round-trips through validation as a reject
        expect(() =>
          assertChunkProvenance({
            text: d.text,
            curriculumTags: d.curriculumTags,
            citationLabel: d.citation.label,
            sourceRef: d.citation.sourceRef,
            provenance: d.provenance,
          }),
        ).not.toThrow();
      }
    }
  });
});
