/**
 * Vendored slice of the OWN question bank / authored solutions — a permitted,
 * owned corpus source (CORPUS_POLICY.md). A representative sample, not the full
 * bank; the loader can be pointed at the full external bank or the seeded DB
 * later. Each item carries its own provenance.
 */

export interface QuestionFixture {
  id: string;
  topicRef: string;
  topicTitle: string;
  level: "gcse" | "alevel";
  board?: string;
  questionText: string;
  marks: number;
  tags: string[];
  workedSolution: {
    steps: { stepNumber: number; description: string; workingLatex: string; explanation: string }[];
    finalAnswer: string;
  };
  // Provenance (CORPUS_POLICY.md / INTERFACES.md). Owned outright.
  sourceType: "own_question_bank" | "own_authored";
  licence: string;
  ownership: "owned" | "licensed" | "public";
}

export const OWN_QUESTIONS: QuestionFixture[] = [
  {
    id: "d2-006",
    topicRef: "d2",
    topicTitle: "Differentiating y = f(x)",
    level: "alevel",
    questionText: "Differentiate \\( y = 5x^3 - 4x^2 + 7x - 2 \\).",
    marks: 3,
    tags: ["differentiation", "power rule", "polynomial"],
    workedSolution: {
      steps: [
        {
          stepNumber: 1,
          description: "Differentiate the first term 5x^3",
          workingLatex: "5x^3 \\longrightarrow 5 \\times 3x^{2} = 15x^2",
          explanation: "Multiply the coefficient 5 by the index 3, and reduce the power by 1.",
        },
        {
          stepNumber: 2,
          description: "Differentiate the second term -4x^2",
          workingLatex: "-4x^2 \\longrightarrow -4 \\times 2x^{1} = -8x",
          explanation: "Multiply the coefficient -4 by the index 2, and reduce the power by 1.",
        },
        {
          stepNumber: 3,
          description: "Differentiate 7x and the constant",
          workingLatex: "7x \\longrightarrow 7, \\qquad -2 \\longrightarrow 0",
          explanation: "The derivative of 7x is 7. The derivative of any constant is 0.",
        },
        {
          stepNumber: 4,
          description: "Combine all differentiated terms",
          workingLatex: "\\frac{\\mathrm{d}y}{\\mathrm{d}x} = 15x^2 - 8x + 7",
          explanation: "Collect the results from each term into a single expression.",
        },
      ],
      finalAnswer: "\\( \\dfrac{\\mathrm{d}y}{\\mathrm{d}x} = 15x^2 - 8x + 7 \\)",
    },
    sourceType: "own_question_bank",
    licence: "proprietary-imaia",
    ownership: "owned",
  },
  {
    id: "q1-014",
    topicRef: "q1",
    topicTitle: "Solving quadratics by factorising",
    level: "gcse",
    questionText: "Solve \\( x^2 - 5x + 6 = 0 \\).",
    marks: 3,
    tags: ["quadratic", "factorising", "roots"],
    workedSolution: {
      steps: [
        {
          stepNumber: 1,
          description: "Factorise the quadratic",
          workingLatex: "x^2 - 5x + 6 = (x - 2)(x - 3)",
          explanation: "Find two numbers that multiply to +6 and add to -5: namely -2 and -3.",
        },
        {
          stepNumber: 2,
          description: "Set each factor to zero",
          workingLatex: "x - 2 = 0 \\quad \\text{or} \\quad x - 3 = 0",
          explanation: "A product is zero only when one of its factors is zero.",
        },
        {
          stepNumber: 3,
          description: "Solve for x",
          workingLatex: "x = 2 \\quad \\text{or} \\quad x = 3",
          explanation: "Rearrange each linear equation.",
        },
      ],
      finalAnswer: "\\( x = 2 \\) or \\( x = 3 \\)",
    },
    sourceType: "own_authored",
    licence: "proprietary-imaia",
    ownership: "owned",
  },
];
