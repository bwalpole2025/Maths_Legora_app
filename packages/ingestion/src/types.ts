/** Shared ingestion shapes. Provenance / Citation are the frozen contract types. */
import type { Citation, Provenance } from "@imaia/contracts";

/**
 * A unit of source material before chunking. `keepWhole` documents (e.g. a worked
 * example) are stored as exactly one chunk with their maths intact; otherwise the
 * text is chunked LaTeX-aware. The `citation.sourceRef` is the base machine id;
 * multi-chunk documents derive per-chunk refs from it.
 */
export interface SourceDocument {
  text: string;
  keepWhole: boolean;
  curriculumTags: string[];
  citation: Citation;
  provenance: Provenance;
  maxChars?: number;
}

/** A chunk ready to write to CorpusChunk (before embedding). */
export interface ChunkInput {
  text: string;
  curriculumTags: string[];
  citationLabel: string;
  sourceRef: string;
  provenance: Provenance;
}

/** A source loader: produces permitted, provenance-bearing documents. */
export interface SourceLoader {
  readonly name: string;
  load(): SourceDocument[] | Promise<SourceDocument[]>;
}
