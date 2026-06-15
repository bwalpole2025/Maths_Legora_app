/**
 * DfE content-store fixtures — a permitted source (curriculum + mark-scheme data
 * assembled for this purpose; CORPUS_POLICY.md). Open Government Licence, public.
 * Short stand-ins until real DfE content is added; replace before production.
 */

export interface DfeEntry {
  contentId: string; // machine id within the DfE content store
  level: "gcse" | "alevel";
  title: string;
  topicTags: string[];
  text: string; // may contain LaTeX
  licence: string;
  ownership: "owned" | "licensed" | "public";
}

export const DFE_ENTRIES: DfeEntry[] = [
  {
    contentId: "ks5-maths-calculus-overview",
    level: "alevel",
    title: "Calculus in the A-level core content",
    topicTags: ["calculus", "differentiation", "integration"],
    text: [
      "The core content requires students to understand and use differentiation",
      "and integration of \\( x^n \\), and to apply these to gradients, tangents,",
      "normals, and the evaluation of areas under curves. Differentiation and",
      "integration are introduced as inverse processes.",
    ].join(" "),
    licence: "OGL-3.0",
    ownership: "public",
  },
];
