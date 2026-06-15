/**
 * Loader for DfE content-store material (permitted source; Open Government
 * Licence). Prose is chunked LaTeX-aware; curriculum tags carry level + topic.
 */
import { DFE_ENTRIES, DfeEntry } from "../data/dfe.js";
import type { SourceDocument, SourceLoader } from "../types.js";

export function dfeToDocument(e: DfeEntry): SourceDocument {
  return {
    text: e.text,
    keepWhole: false,
    curriculumTags: [e.level, ...e.topicTags],
    citation: {
      label: `DfE content store — ${e.title}`,
      sourceRef: `dfe:${e.contentId}`,
    },
    provenance: {
      sourceType: "dfe_content_store",
      sourceId: e.contentId,
      licence: e.licence,
      ownership: e.ownership,
    },
  };
}

export function dfeLoader(entries: DfeEntry[] = DFE_ENTRIES): SourceLoader {
  return {
    name: "dfe",
    load: () => entries.map(dfeToDocument),
  };
}
