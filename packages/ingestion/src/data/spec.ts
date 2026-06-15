/**
 * Exam-board SPECIFICATION fixtures — a permitted source (published spec text;
 * CORPUS_POLICY.md). No real spec content exists on disk yet, so these short,
 * paraphrased stand-ins exercise the spec loader + chunker. Replace with real
 * licensed spec extracts (with their licence) before production ingestion.
 */

export interface SpecSection {
  board: string; // e.g. "edexcel"
  specCode: string; // e.g. "9MA0"
  level: "gcse" | "alevel";
  section: string; // e.g. "6.2"
  title: string;
  topicTags: string[];
  text: string; // may contain LaTeX
  licence: string;
  ownership: "owned" | "licensed" | "public";
}

export const SPEC_SECTIONS: SpecSection[] = [
  {
    board: "edexcel",
    specCode: "9MA0",
    level: "alevel",
    section: "7.1",
    title: "Differentiation",
    topicTags: ["differentiation", "calculus"],
    text: [
      "Students should be able to differentiate \\( x^n \\) for rational \\( n \\),",
      "and related sums, differences and constant multiples. They should know that",
      "\\( \\frac{\\mathrm{d}y}{\\mathrm{d}x} \\) is the rate of change of \\( y \\) with respect",
      "to \\( x \\), and be able to find the gradient of a curve at a point.",
    ].join(" "),
    licence: "edexcel-spec-reference",
    ownership: "licensed",
  },
  {
    board: "edexcel",
    specCode: "9MA0",
    level: "alevel",
    section: "2.3",
    title: "Quadratic functions",
    topicTags: ["quadratic", "algebra"],
    text: [
      "Students should be able to solve quadratic equations including those that",
      "require factorising, completing the square \\( (x + a)^2 + b \\), and use of the",
      "quadratic formula \\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}. \\]",
      "They should understand the discriminant \\( b^2 - 4ac \\) and what it reveals",
      "about the roots.",
    ].join(" "),
    licence: "edexcel-spec-reference",
    ownership: "licensed",
  },
];
