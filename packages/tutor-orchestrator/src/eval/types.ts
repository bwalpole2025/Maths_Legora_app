// Shapes for the end-to-end eval harness (prompt 12). The eval measures the live
// tutor; it never modifies it. The scorecard mirrors services/maths/evals/gate.py
// (CaseResult/GateReport), extended with per-metric aggregates and the run mode.

export type RunMode = 'live' | 'hermetic';

export type MetricName =
  | 'servedSolutionCorrectness'
  | 'curriculumAdherence'
  | 'markingAccuracy'
  | 'hintQuality';

export const METRIC_NAMES: MetricName[] = [
  'servedSolutionCorrectness',
  'curriculumAdherence',
  'markingAccuracy',
  'hintQuality',
];

/** One driven session's verdict on one metric. */
export interface CaseResult {
  id: string;
  metric: MetricName;
  passed: boolean;
  expected: string;
  actual: string;
  note: string;
}

export interface MetricSummary {
  /** False when the metric could not be measured this run (e.g. truth-layer down). */
  measured: boolean;
  /** passed/total when measured, else null. */
  score: number | null;
  passed: number;
  total: number;
}

export interface Scorecard {
  schemaVersion: number;
  mode: RunMode;
  metrics: Record<MetricName, MetricSummary>;
  cases: CaseResult[];
  /** True iff every measured case passed. */
  passed: boolean;
}
