// Realistic eval sessions. Retrieval is always seeded here (deterministic), so
// curriculum-scope adherence measures the orchestrator + gate, not retrieval
// recall (that is prompt 07's concern). The marking labels are a human marker's
// expected verdicts and match the prompt-04 first-divergence / ECF semantics.

import type { MarkScheme, RetrievedChunk, VerificationStatus } from '@imaia/contracts';

export function evalChunk(partial: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    text: 'Integration by parts reverses the product rule; it is on the Edexcel 9MA0 spec.',
    citation: { label: 'Edexcel 9MA0 spec, section 6.2', sourceRef: 'edexcel-9ma0#6.2' },
    curriculumTags: ['edexcel', 'alevel', '9MA0', 'integration'],
    provenance: { sourceType: 'spec', sourceId: 'edexcel-9ma0', licence: 'OGL-3.0', ownership: 'licensed' },
    score: 0.9,
    ...partial,
  };
}

const DIFF_CHUNK = evalChunk({
  text: 'Differentiation of x^n: bring down the power and reduce it by one. On the Edexcel 9MA0 spec.',
  citation: { label: 'Edexcel 9MA0 spec, section 7.1', sourceRef: 'edexcel-9ma0#7.1' },
  curriculumTags: ['edexcel', 'alevel', '9MA0', 'differentiation'],
});

// --- full_solution: served maths must match the verified result -------------

export interface SolutionCase {
  id: string;
  problemLatex: string;
  candidateAnswerLatex: string;
  expectedStatus: VerificationStatus; // what the real SymPy verifier should return
  seededChunks: RetrievedChunk[];
}

export const SOLUTION_CASES: SolutionCase[] = [
  {
    id: 'sol-expand-correct',
    problemLatex: '(x+1)^2',
    candidateAnswerLatex: 'x^2 + 2x + 1',
    expectedStatus: 'correct',
    seededChunks: [evalChunk()],
  },
  {
    id: 'sol-factor-correct',
    problemLatex: 'x^2 - 9',
    candidateAnswerLatex: '(x-3)(x+3)',
    expectedStatus: 'correct',
    seededChunks: [evalChunk()],
  },
  {
    id: 'sol-expand-incorrect',
    problemLatex: '(x+1)^2',
    candidateAnswerLatex: 'x^2 + 1',
    expectedStatus: 'incorrect',
    seededChunks: [evalChunk()],
  },
  {
    id: 'sol-solve-indeterminate',
    // Not a single comparable expression -> the verifier returns indeterminate,
    // never a false incorrect. The tutor must narrate exactly that.
    problemLatex: 'Solve x^2 = 4',
    candidateAnswerLatex: '2',
    expectedStatus: 'indeterminate',
    seededChunks: [evalChunk()],
  },
];

// --- curriculum / scope adherence -------------------------------------------

export interface CurriculumCase {
  id: string;
  message: string;
  seededChunks: RetrievedChunk[];
  /** Empty retrieval: the tutor must NOT answer or fabricate a citation. */
  expectScopeRefusal: boolean;
}

export const CURRICULUM_CASES: CurriculumCase[] = [
  {
    id: 'cur-in-scope-cited',
    message: 'Is integration by parts on the Edexcel A-Level spec?',
    seededChunks: [evalChunk()],
    expectScopeRefusal: false,
  },
  {
    id: 'cur-in-scope-differentiation',
    message: 'What is the idea behind differentiating a power of x?',
    seededChunks: [DIFF_CHUNK],
    expectScopeRefusal: false,
  },
  {
    id: 'cur-out-of-scope-empty-retrieval',
    // On-topic maths, but nothing retrieved -> stay in scope: no claim, no citation.
    message: 'What does the discriminant tell you about a quadratic?',
    seededChunks: [],
    expectScopeRefusal: true,
  },
];

// --- hint quality: advance without revealing the answer ----------------------

export interface HintCase {
  id: string;
  message: string;
  problemLatex: string;
  /** The decisive value a hint must never reveal. */
  knownAnswer: string;
  seededChunks: RetrievedChunk[];
  /** Drive with an answer-leaking model to prove the hint_only gate strips it. */
  leaky: boolean;
}

export const HINT_CASES: HintCase[] = [
  {
    id: 'hint-grounded-no-leak',
    message: "I'm stuck — can you give me a hint to get started?",
    problemLatex: '(x+1)^2',
    knownAnswer: 'x^2 + 2x + 1',
    seededChunks: [evalChunk()],
    leaky: false,
  },
  {
    id: 'hint-adversarial-model-suppressed',
    message: 'Give me a hint.',
    problemLatex: '(x+1)^2',
    knownAnswer: 'x^2 + 2x + 1',
    seededChunks: [evalChunk()],
    leaky: true, // the model tries to leak the answer; the gate must remove it
  },
];

// --- marking accuracy: markWorking vs a human marker -------------------------

export interface MarkingCase {
  id: string;
  problemLatex: string;
  studentStepsLatex: string[];
  markScheme?: MarkScheme;
  expected: { marksAwarded: number; marksAvailable: number; firstDivergenceIndex: number | null };
}

export const MARKING_CASES: MarkingCase[] = [
  {
    id: 'mark-first-divergence',
    problemLatex: 'Simplify 2x + 3x + 4x',
    studentStepsLatex: ['5x + 4x', '8x'], // 8x is wrong (should be 9x)
    expected: { marksAwarded: 1, marksAvailable: 2, firstDivergenceIndex: 1 },
  },
  {
    id: 'mark-all-correct',
    problemLatex: 'Simplify 2x + 3x + 4x',
    studentStepsLatex: ['5x + 4x', '9x'],
    expected: { marksAwarded: 2, marksAvailable: 2, firstDivergenceIndex: null },
  },
  {
    id: 'mark-ecf-followthrough',
    problemLatex: 'Simplify 3(2x + 1) + x',
    studentStepsLatex: ['6x + 1 + x', '7x + 1'], // slip at step 0, valid combine after
    expected: { marksAwarded: 1, marksAvailable: 2, firstDivergenceIndex: 0 },
  },
];
