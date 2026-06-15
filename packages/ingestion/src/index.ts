// @imaia/ingestion — corpus ingestion pipeline (prompt 06).
export * from "./types.js";
export * from "./embed/index.js";
export { segmentLatex, chunkLatexAware } from "./chunk/latex.js";
export type { Segment, ChunkOptions } from "./chunk/latex.js";
export { chunkDocument, chunkDocuments } from "./chunk/chunker.js";
export { chunkId } from "./ids.js";
export { assertChunkProvenance, ProvenanceError } from "./validate.js";
export { ingest } from "./pipeline.js";
export type { IngestOptions, IngestResult, RejectedChunk } from "./pipeline.js";
export {
  LOADERS,
  PERMITTED_SOURCE_TYPES,
  resolveLoaders,
  type SourceKey,
} from "./sources/registry.js";
export { ownQuestionsLoader, questionToDocument } from "./sources/ownQuestions.js";
export { specLoader } from "./sources/spec.js";
export { dfeLoader } from "./sources/dfe.js";
