// runEval: resolve services (auto-detect), run the four metric suites, assemble a
// scorecard. Pure — no file IO — so the script and the vitest test share it.
//
// In hermetic mode the truth-dependent metrics (served correctness, marking
// accuracy) are skipped (reported `measured:false`) rather than scored against
// stand-ins, so the headline is never a circular 100%.

import { buildScorecard } from './scorecard.js';
import { resolveServices } from './services.js';
import {
  curriculumAdherence,
  hintQuality,
  markingAccuracy,
  servedSolutionCorrectness,
} from './metrics.js';
import type { CaseResult, MetricName, Scorecard } from './types.js';

export async function runEval(): Promise<Scorecard> {
  const services = await resolveServices();
  const live = services.mode === 'live';

  const casesByMetric: Record<MetricName, CaseResult[]> = {
    // Truth-dependent: only meaningful against the real verifier/marker.
    servedSolutionCorrectness: live ? await servedSolutionCorrectness(services) : [],
    markingAccuracy: live ? await markingAccuracy(services) : [],
    // Orchestration/gate behaviour: measured in both modes.
    curriculumAdherence: await curriculumAdherence(services),
    hintQuality: await hintQuality(services),
  };

  return buildScorecard(services.mode, casesByMetric);
}
