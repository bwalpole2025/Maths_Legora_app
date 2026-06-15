/**
 * Document -> chunk(s). A `keepWhole` document becomes exactly ONE chunk (worked
 * examples are never fragmented); otherwise prose is split LaTeX-aware. Every
 * chunk carries the document's curriculum tags, citation label and provenance,
 * and a sourceRef unique per chunk.
 */
import type { ChunkInput, SourceDocument } from "../types.js";
import { chunkLatexAware } from "./latex.js";

export function chunkDocument(doc: SourceDocument): ChunkInput[] {
  const base = {
    curriculumTags: doc.curriculumTags,
    citationLabel: doc.citation.label,
    provenance: doc.provenance,
  };

  if (doc.keepWhole) {
    return [{ ...base, text: doc.text.trim(), sourceRef: doc.citation.sourceRef }];
  }

  const parts = chunkLatexAware(doc.text, { maxChars: doc.maxChars });
  return parts.map((text, i) => ({
    ...base,
    text,
    // Stable, ordered per-chunk ref derived from the document's base ref.
    sourceRef: parts.length === 1 ? doc.citation.sourceRef : `${doc.citation.sourceRef}#${i}`,
    citationLabel:
      parts.length === 1 ? doc.citation.label : `${doc.citation.label} (part ${i + 1})`,
  }));
}

/** Chunk many documents. */
export function chunkDocuments(docs: SourceDocument[]): ChunkInput[] {
  return docs.flatMap(chunkDocument);
}
