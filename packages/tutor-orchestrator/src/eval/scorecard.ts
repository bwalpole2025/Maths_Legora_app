// Scorecard assembly, persistence, and baseline regression comparison.
// The compared core carries NO timestamp, so the baseline is a stable, diffable
// artifact (determinism comes from the reference model + seeded retrieval + the
// deterministic SymPy verifier).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type CaseResult,
  METRIC_NAMES,
  type MetricName,
  type MetricSummary,
  type RunMode,
  type Scorecard,
} from './types.js';

export const SCHEMA_VERSION = 1;

// packages/tutor-orchestrator/eval/ (sibling of src/ and dist/).
const EVAL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../eval');
export const BASELINE_PATH = resolve(EVAL_DIR, 'baseline.json');
export const SCORECARD_PATH = resolve(EVAL_DIR, 'scorecard.latest.json');

/** Build a scorecard from per-metric case lists. A metric with no cases this run
 *  (e.g. truth-dependent metric in hermetic mode) is reported `measured:false`. */
export function buildScorecard(
  mode: RunMode,
  casesByMetric: Record<MetricName, CaseResult[]>,
): Scorecard {
  const metrics = {} as Record<MetricName, MetricSummary>;
  const cases: CaseResult[] = [];

  for (const name of METRIC_NAMES) {
    const list = casesByMetric[name] ?? [];
    const passed = list.filter((c) => c.passed).length;
    const total = list.length;
    metrics[name] = {
      measured: total > 0,
      score: total > 0 ? passed / total : null,
      passed,
      total,
    };
    cases.push(...list);
  }

  const passed = cases.every((c) => c.passed);
  return { schemaVersion: SCHEMA_VERSION, mode, metrics, cases, passed };
}

export interface Regression {
  kind: 'metric' | 'case';
  id: string;
  detail: string;
}

/** Compare a fresh scorecard against a baseline. Only metrics measured in BOTH
 *  runs are compared (so a hermetic run vs a live baseline doesn't false-flag the
 *  truth-dependent metrics). A metric whose score dropped, or a case that passed
 *  in the baseline and now fails, is a regression. */
export function compareToBaseline(
  current: Scorecard,
  baseline: Scorecard,
  tolerance = 0,
): Regression[] {
  const regressions: Regression[] = [];

  for (const name of METRIC_NAMES) {
    const c = current.metrics[name];
    const b = baseline.metrics[name];
    if (!c.measured || !b.measured || c.score === null || b.score === null) continue;
    if (c.score < b.score - tolerance) {
      regressions.push({
        kind: 'metric',
        id: name,
        detail: `${name}: ${b.score.toFixed(3)} -> ${c.score.toFixed(3)}`,
      });
    }
  }

  const currentById = new Map(current.cases.map((x) => [x.id, x]));
  for (const bc of baseline.cases) {
    if (!bc.passed) continue;
    const cc = currentById.get(bc.id);
    if (cc && !cc.passed) {
      regressions.push({ kind: 'case', id: bc.id, detail: `${bc.id}: passed -> failed (${cc.note})` });
    }
  }

  return regressions;
}

export function loadBaseline(path: string = BASELINE_PATH): Scorecard | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Scorecard;
  } catch {
    return null;
  }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/** Persist the run artifact (with a timestamp that is NOT part of the compared core). */
export function writeScorecard(card: Scorecard, generatedAt: string, path: string = SCORECARD_PATH): void {
  writeJson(path, { generatedAt, ...card });
}

export function writeBaseline(card: Scorecard, path: string = BASELINE_PATH): void {
  writeJson(path, card);
}

/** Human-readable report, mirroring services/maths/evals/gate.py::format_report. */
export function formatReport(card: Scorecard, regressions: Regression[]): string {
  const lines: string[] = ['End-to-end tutor eval (prompt 12)', '='.repeat(72), `mode: ${card.mode}`];
  for (const name of METRIC_NAMES) {
    const m = card.metrics[name];
    const score = m.measured && m.score !== null ? `${(m.score * 100).toFixed(0)}% (${m.passed}/${m.total})` : 'not measured';
    lines.push(`  ${name.padEnd(28)} ${score}`);
  }
  lines.push('-'.repeat(72));
  for (const c of card.cases.filter((x) => !x.passed)) {
    lines.push(`  FAIL  [${c.metric}] ${c.id}: expected ${c.expected}, got ${c.actual} — ${c.note}`);
  }
  if (regressions.length > 0) {
    lines.push('-'.repeat(72));
    lines.push('REGRESSIONS vs baseline:');
    for (const r of regressions) lines.push(`  ${r.detail}`);
  }
  lines.push('-'.repeat(72));
  // The gate is regression-based: the baseline is the accepted bar, so a known
  // (baselined) failure is not a gate failure, but any regression is.
  const passedCases = card.cases.filter((c) => c.passed).length;
  const status = regressions.length === 0 ? 'PASS' : 'FAIL';
  lines.push(
    `EVAL: ${status} (no regressions) — cases ${passedCases}/${card.cases.length}, regressions ${regressions.length}`,
  );
  return lines.join('\n');
}
