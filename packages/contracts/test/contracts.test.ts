// Contract test for @imaia/contracts.
//
// Two guarantees, no test framework needed (run via `pnpm --filter @imaia/contracts test`):
//   1. Type-level — a valid example of every contract type is constructed inline
//      and assigned to its imported type. `tsc -p tsconfig.test.json` (the first
//      half of the `test` script) fails if any shape drifts.
//   2. Runtime — every example parses against its zod schema, round-trips
//      unchanged, and is byte-identical to the shared fixture
//      (fixtures/contract-examples.json). The Python maths service round-trips
//      the SAME fixture (services/maths/tests/test_contracts.py), so both sides
//      provably share one contract.
import assert from "node:assert/strict";

import {
  CitationSchema,
  ProvenanceSchema,
  VerificationStatusSchema,
  RetrievalQuerySchema,
  RetrievedChunkSchema,
  RetrievalResultSchema,
  VerifyAnswerRequestSchema,
  VerifyAnswerResultSchema,
  VerifyStepRequestSchema,
  VerifyStepResultSchema,
  MarkSchemeMarkSchema,
  MarkSchemeSchema,
  MarkWorkingRequestSchema,
  PerStepStatusSchema,
  MarkWorkingResultSchema,
  StudentTurnSchema,
  MathsClaimSchema,
  TutorReplySchema,
  type Citation,
  type Provenance,
  type VerificationStatus,
  type RetrievalQuery,
  type RetrievedChunk,
  type RetrievalResult,
  type VerifyAnswerRequest,
  type VerifyAnswerResult,
  type VerifyStepRequest,
  type VerifyStepResult,
  type MarkSchemeMark,
  type MarkScheme,
  type MarkWorkingRequest,
  type PerStepStatus,
  type MarkWorkingResult,
  type StudentTurn,
  type MathsClaim,
  type TutorReply,
} from "../src/index.js";
import fixtures from "../fixtures/contract-examples.json" with { type: "json" };

// --- 1. Type-level: construct a valid example of every contract type. ---------
// Reused sub-objects keep the composite examples structurally consistent.
const citation: Citation = {
  label: "Edexcel 9MA0 spec, section 6.2",
  sourceRef: "edexcel-9ma0#6.2",
};
const provenance: Provenance = {
  sourceType: "spec",
  sourceId: "edexcel-9ma0",
  licence: "Pearson Edexcel specification, reproduced under spec terms",
  ownership: "licensed",
};
const verificationStatus: VerificationStatus = "correct";

const retrievalQuery: RetrievalQuery = {
  text: "differentiate x^2 from first principles",
  curriculumFilter: {
    board: "edexcel",
    level: "alevel",
    specCode: "9MA0",
    topicTags: ["differentiation"],
  },
  k: 8,
};
const retrievedChunk: RetrievedChunk = {
  text: "The derivative of x^n is n*x^(n-1).",
  citation,
  curriculumTags: ["differentiation"],
  provenance,
  score: 0.87,
};
const retrievalResult: RetrievalResult = { chunks: [retrievedChunk], query: retrievalQuery };

const verifyAnswerRequest: VerifyAnswerRequest = {
  problemLatex: "(x+1)^2",
  candidateAnswerLatex: "x^2 + 2x + 1",
  domainHints: { assumptions: { x: { real: true } } },
};
const verifyAnswerResult: VerifyAnswerResult = {
  status: "correct",
  canonicalAnswerLatex: "x^2 + 2x + 1",
  method: "sympy",
  detail: "symbolic-equal; ref='(x+1)**2'; candidate='x**2+2*x+1'",
};
const verifyStepRequest: VerifyStepRequest = {
  problemLatex: "Simplify 2x + 3x",
  priorStepsLatex: ["2x + 3x"],
  stepLatex: "5x",
};
const verifyStepResult: VerifyStepResult = {
  status: "correct",
  detail: "symbolic-equal; ref='2*x+3*x'; step='5*x'",
};

const markSchemeMark: MarkSchemeMark = {
  id: "M1",
  type: "M",
  maxMarks: 1,
  stepIndex: 0,
  dependsOn: [],
  ft: false,
  description: "Correct differentiation method (power rule applied)",
};
const accuracyMark: MarkSchemeMark = {
  id: "A1",
  type: "A",
  maxMarks: 1,
  stepIndex: 1,
  dependsOn: ["M1"],
  ft: false,
  description: "Correct simplified derivative",
};
const markScheme: MarkScheme = { marks: [markSchemeMark, accuracyMark] };
const markWorkingRequest: MarkWorkingRequest = {
  problemLatex: "Differentiate x^2",
  studentStepsLatex: ["dy/dx = 2x^1", "dy/dx = 2x"],
  markScheme,
  allowEcf: true,
};
const perStepStatus: PerStepStatus = {
  index: 0,
  status: "correct",
  isFirstDivergence: false,
  carriedForward: false,
};
const markWorkingResult: MarkWorkingResult = {
  marksAwarded: 2,
  marksAvailable: 2,
  firstDivergenceIndex: null,
  perStep: [
    perStepStatus,
    { index: 1, status: "correct", isFirstDivergence: false, carriedForward: false },
  ],
  ecfApplied: false,
};

const studentTurn: StudentTurn = {
  message: "Is x^2 + 2x + 1 the same as (x+1)^2?",
  problemId: "q-123",
  attachmentRef: "upload-abc",
  mode: "hint_only",
};
const mathsClaim: MathsClaim = {
  text: "(x+1)^2 expands to x^2 + 2x + 1.",
  verificationStatus: "correct",
  citations: [citation],
};
const tutorReply: TutorReply = {
  reply: "Yes — they are equal. Try expanding (x+1)^2 yourself to see why.",
  claimType: "hint",
  claims: [mathsClaim],
  citations: [citation],
  trace: {
    retrievalHits: ["edexcel-9ma0#6.2"],
    verificationCalls: [{ kind: "verifyAnswer", status: "correct" }],
    routing: "hint",
  },
};

// `verificationStatus` is a bare union (not a z.object); assert it directly.
assert.deepStrictEqual(VerificationStatusSchema.parse(verificationStatus), verificationStatus);

// --- 2. Runtime: parse, round-trip, and match the shared fixture. -------------
const bag = fixtures as Record<string, unknown>;

function roundtrips<T>(name: string, schema: { parse: (value: unknown) => T }, example: T): void {
  // the inline (type-checked) example parses and is returned unchanged
  assert.deepStrictEqual(schema.parse(example), example, `${name}: schema.parse changed the value`);
  // the inline example is byte-identical to the shared fixture entry
  assert.deepStrictEqual(
    example,
    bag[name],
    `${name}: inline example diverged from fixtures/contract-examples.json`,
  );
  // the shared fixture (the exact JSON the Python service round-trips) parses too
  assert.deepStrictEqual(schema.parse(bag[name]), example, `${name}: shared fixture failed to parse`);
}

roundtrips("citation", CitationSchema, citation);
roundtrips("provenance", ProvenanceSchema, provenance);
roundtrips("retrievalQuery", RetrievalQuerySchema, retrievalQuery);
roundtrips("retrievedChunk", RetrievedChunkSchema, retrievedChunk);
roundtrips("retrievalResult", RetrievalResultSchema, retrievalResult);
roundtrips("verifyAnswerRequest", VerifyAnswerRequestSchema, verifyAnswerRequest);
roundtrips("verifyAnswerResult", VerifyAnswerResultSchema, verifyAnswerResult);
roundtrips("verifyStepRequest", VerifyStepRequestSchema, verifyStepRequest);
roundtrips("verifyStepResult", VerifyStepResultSchema, verifyStepResult);
roundtrips("markSchemeMark", MarkSchemeMarkSchema, markSchemeMark);
roundtrips("markScheme", MarkSchemeSchema, markScheme);
roundtrips("markWorkingRequest", MarkWorkingRequestSchema, markWorkingRequest);
roundtrips("perStepStatus", PerStepStatusSchema, perStepStatus);
roundtrips("markWorkingResult", MarkWorkingResultSchema, markWorkingResult);
roundtrips("studentTurn", StudentTurnSchema, studentTurn);
roundtrips("mathsClaim", MathsClaimSchema, mathsClaim);
roundtrips("tutorReply", TutorReplySchema, tutorReply);

console.log("contracts: 18 examples type-check, parse, round-trip, and match the shared fixture");
