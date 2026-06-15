/**
 * Loader for exam-board SPECIFICATION sections (permitted source). Spec prose is
 * chunked LaTeX-aware (maths spans intact); curriculum tags carry board / level /
 * spec code / topic.
 */
import { SPEC_SECTIONS, SpecSection } from "../data/spec.js";
import type { SourceDocument, SourceLoader } from "../types.js";

export function specToDocument(s: SpecSection): SourceDocument {
  return {
    text: s.text,
    keepWhole: false,
    curriculumTags: [s.board, s.level, s.specCode, ...s.topicTags],
    citation: {
      label: `${s.board} ${s.specCode} spec, section ${s.section} (${s.title})`,
      sourceRef: `spec:${s.specCode}:${s.section}`,
    },
    provenance: {
      sourceType: "spec",
      sourceId: `${s.specCode}:${s.section}`,
      licence: s.licence,
      ownership: s.ownership,
    },
  };
}

export function specLoader(sections: SpecSection[] = SPEC_SECTIONS): SourceLoader {
  return {
    name: "spec",
    load: () => sections.map(specToDocument),
  };
}
