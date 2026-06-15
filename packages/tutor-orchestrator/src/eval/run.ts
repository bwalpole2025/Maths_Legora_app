// Runnable end-to-end eval (prompt 12).
//
//   tsx src/eval/run.ts                  run, write scorecard, compare to baseline,
//                                        exit 0 (ok) / 1 (regression or failing case)
//   tsx src/eval/run.ts --update-baseline  (re)record the baseline from this run
//
// Auto-detects the run mode: drives the real maths truth layer when MATHS_URL is
// reachable, else a hermetic run that still emits a scorecard.

import { runEval } from './harness.js';
import {
  BASELINE_PATH,
  compareToBaseline,
  formatReport,
  loadBaseline,
  SCORECARD_PATH,
  writeBaseline,
  writeScorecard,
} from './scorecard.js';

async function main(): Promise<void> {
  const updateBaseline = process.argv.includes('--update-baseline');
  const card = await runEval();
  writeScorecard(card, new Date().toISOString());
  console.log(`[eval] wrote ${SCORECARD_PATH}`);

  if (updateBaseline) {
    writeBaseline(card);
    console.log(formatReport(card, []));
    console.log(`\n[baseline] recorded ${BASELINE_PATH} (mode=${card.mode})`);
    process.exit(card.passed ? 0 : 1);
  }

  const baseline = loadBaseline();
  if (!baseline) {
    console.log(formatReport(card, []));
    console.log('\n[baseline] none found — run with --update-baseline to record one.');
    process.exit(1);
  }

  // Gate on regressions against the accepted baseline (a known, baselined failure
  // is visible but not a gate failure; any regression is).
  const regressions = compareToBaseline(card, baseline);
  console.log(formatReport(card, regressions));
  process.exit(regressions.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
