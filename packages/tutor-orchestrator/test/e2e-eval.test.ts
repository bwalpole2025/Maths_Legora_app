// Prompt 12 DoD: the eval suite runs end-to-end, produces a scorecard, and a
// committed baseline makes regressions visible. Auto-detects mode (live when the
// maths service is up, else hermetic), so it stays green in CI without the stack.

import { describe, expect, it } from 'vitest';

import { runEval } from '../src/eval/harness.js';
import { compareToBaseline, loadBaseline } from '../src/eval/scorecard.js';

describe('end-to-end tutor eval (prompt 12)', () => {
  it('runs end-to-end, emits a scorecard, and shows no regression vs baseline', async () => {
    const card = await runEval();

    // A scorecard is produced.
    expect(card.cases.length).toBeGreaterThan(0);
    expect(['live', 'hermetic']).toContain(card.mode);

    // Always-measured (orchestration/gate) metrics pass in either mode.
    expect(card.metrics.curriculumAdherence.measured).toBe(true);
    expect(card.metrics.curriculumAdherence.score).toBe(1);
    expect(card.metrics.hintQuality.measured).toBe(true);
    expect(card.metrics.hintQuality.score).toBe(1);

    // Truth-dependent metrics are measured only against the live truth layer.
    if (card.mode === 'live') {
      expect(card.metrics.servedSolutionCorrectness.measured).toBe(true);
      expect(card.metrics.markingAccuracy.measured).toBe(true);
    } else {
      expect(card.metrics.servedSolutionCorrectness.measured).toBe(false);
      expect(card.metrics.markingAccuracy.measured).toBe(false);
    }

    // The DoD guarantee: a committed baseline makes regressions visible. The gate
    // is regression-based (a known, baselined finding is visible but allowed; any
    // regression fails). This is what keeps the suite honest across runs.
    const baseline = loadBaseline();
    expect(baseline, 'eval/baseline.json must be committed').not.toBeNull();
    expect(compareToBaseline(card, baseline!)).toEqual([]);
  });
});
