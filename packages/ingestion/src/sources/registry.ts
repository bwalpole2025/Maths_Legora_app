/**
 * The PERMITTED source registry. CORPUS_POLICY.md allows exactly three sources:
 * exam-board specifications, DfE content store, and the own question bank /
 * authored solutions. There is deliberately NO textbook / past-paper / unlicensed
 * loader here — not even behind a flag.
 */
import type { SourceLoader } from "../types.js";
import { dfeLoader } from "./dfe.js";
import { ownQuestionsLoader } from "./ownQuestions.js";
import { specLoader } from "./spec.js";

export type SourceKey = "own" | "spec" | "dfe";

export const LOADERS: Record<SourceKey, () => SourceLoader> = {
  own: ownQuestionsLoader,
  spec: specLoader,
  dfe: dfeLoader,
};

/** Provenance sourceTypes any registered loader is allowed to emit. */
export const PERMITTED_SOURCE_TYPES = [
  "spec",
  "dfe_content_store",
  "own_question_bank",
  "own_authored",
] as const;

export function resolveLoaders(keys: SourceKey[] | "all" = "all"): SourceLoader[] {
  const selected = keys === "all" ? (Object.keys(LOADERS) as SourceKey[]) : keys;
  return selected.map((k) => {
    const make = LOADERS[k];
    if (!make) throw new Error(`Unknown source "${k}". Permitted: ${Object.keys(LOADERS).join(", ")}`);
    return make();
  });
}
