/**
 * Loader for the OWN question bank / authored solutions. Each question becomes a
 * single `keepWhole` document so its worked example is stored intact (never
 * fragmented). Default input is the vendored fixture slice; pass your own array to
 * ingest the full bank or DB-sourced questions.
 */
import { OWN_QUESTIONS, QuestionFixture } from "../data/own-questions.js";
import type { SourceDocument, SourceLoader } from "../types.js";

function curriculumTags(q: QuestionFixture): string[] {
  return [q.board, q.level, q.topicRef, ...q.tags].filter((t): t is string => Boolean(t));
}

function documentText(q: QuestionFixture): string {
  const steps = q.workedSolution.steps
    .map((s) => `Step ${s.stepNumber}: ${s.description}\n${s.workingLatex}\n${s.explanation}`)
    .join("\n\n");
  return [
    `${q.topicTitle} (${q.id})`,
    `Question: ${q.questionText}`,
    "Worked solution:",
    steps,
    `Final answer: ${q.workedSolution.finalAnswer}`,
  ].join("\n\n");
}

export function questionToDocument(q: QuestionFixture): SourceDocument {
  return {
    text: documentText(q),
    keepWhole: true, // a worked example is one chunk, maths intact
    curriculumTags: curriculumTags(q),
    citation: {
      label: `IMAIA question bank — ${q.id} (${q.topicTitle})`,
      sourceRef: `own:question:${q.id}`,
    },
    provenance: {
      sourceType: q.sourceType,
      sourceId: q.id,
      licence: q.licence,
      ownership: q.ownership,
    },
  };
}

export function ownQuestionsLoader(questions: QuestionFixture[] = OWN_QUESTIONS): SourceLoader {
  return {
    name: "own-questions",
    load: () => questions.map(questionToDocument),
  };
}
