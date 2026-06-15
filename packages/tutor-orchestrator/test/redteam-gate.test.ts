// Deterministic red-team gate: every crafted over-compliant model output is caught
// and stripped; the one legitimate (backed) output passes through untouched.
import { describe, expect, it } from "vitest";

import { detectViolations, enforceGate } from "../src/prompt/index.js";
import { ADVERSARIAL_OUTPUTS } from "../src/redteam/dataset.js";

describe("red-team gate", () => {
  for (const tc of ADVERSARIAL_OUTPUTS) {
    it(`${tc.id}: ${tc.label}`, () => {
      const violations = detectViolations(tc.output, tc.ctx);
      const result = enforceGate(tc.output, tc.ctx);

      if (tc.expect === "clean") {
        expect(violations).toEqual([]);
        expect(result.clean).toBe(true);
        expect(result.claims.length).toBe(tc.output.claims.length);
        return;
      }

      // The expected violation is caught and reported as not-clean.
      expect(violations.map((v) => v.category)).toContain(tc.expect);
      expect(result.clean).toBe(false);

      // The offending claim is stripped...
      const offending = new Set(violations.map((v) => v.claimIndex));
      expect(result.claims.length).toBe(tc.output.claims.length - offending.size);

      // ...and nothing unsafe survives (re-detect over the survivors is clean).
      const surviving = tc.output.claims.filter((_, i) => !offending.has(i));
      expect(detectViolations({ ...tc.output, claims: surviving }, tc.ctx)).toEqual([]);
    });
  }

  it("hint-mode leak: no surviving claim reveals the verified answer", () => {
    const hintLeak = ADVERSARIAL_OUTPUTS.find((t) => t.id === "hint-mode-leak");
    expect(hintLeak).toBeDefined();
    const result = enforceGate(hintLeak!.output, hintLeak!.ctx);
    expect(result.claims.some((c) => /x\s*=\s*2/.test(c.text))).toBe(false);
  });
});
