"""
Truth-layer eval GATE (prompt 05).

Runs every golden + adversarial case through the truth-layer contract functions
`verify_answer` / `mark_working` (DIRECTLY — no model, no retrieval, no
orchestration, no network), compares each result to its expected outcome, and
emits a per-case report plus a single PASS/FAIL summary.

This is the gate for the whole project: nothing downstream should consume the
truth layer until `GATE: PASS`.

Run as a script:   python -m evals.gate        (exit 0 = pass, 1 = fail)
Use in tests:      from evals.gate import run_gate
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from typing import List

from app.diagnosis.service import mark_working
from app.models import MarkWorkingRequest, VerifyAnswerRequest
from app.verification.service import verify_answer

from evals.datasets import ANSWER_CASES, MARK_CASES, AnswerCase, MarkCase


@dataclass
class CaseResult:
    id: str
    category: str          # "golden" | "adversarial"
    kind: str              # "answer" | "mark"
    passed: bool
    expected: str
    actual: str
    note: str


def _run_answer(case: AnswerCase) -> CaseResult:
    res = verify_answer(VerifyAnswerRequest(
        problem_latex=case.problem_latex,
        candidate_answer_latex=case.candidate_latex,
        domain_hints=case.domain_hints,
    ))
    allowed = case.accepted_statuses
    return CaseResult(
        id=case.id, category=case.category, kind="answer",
        passed=res.status in allowed,
        expected="status=" + "|".join(allowed),
        actual=f"status={res.status}",
        note=case.note,
    )


def _steps_tuple(steps):
    return [(s.index, s.status, s.is_first_divergence, s.carried_forward) for s in steps]


def _run_mark(case: MarkCase) -> CaseResult:
    res = mark_working(MarkWorkingRequest(
        problem_latex=case.problem_latex,
        student_steps_latex=case.student_steps,
        mark_scheme=case.mark_scheme,
        allow_ecf=case.allow_ecf,
    ))
    exp = case.expected
    checks = [
        res.marks_awarded == exp.marks_awarded,
        res.marks_available == exp.marks_available,
        res.first_divergence_index == exp.first_divergence_index,
        res.ecf_applied == exp.ecf_applied,
    ]
    if exp.per_step is not None:
        checks.append(_steps_tuple(res.per_step) == _steps_tuple(exp.per_step))

    def summary(awarded, available, fdi, ecf):
        return f"awarded={awarded}/{available} fdi={fdi} ecf={ecf}"

    return CaseResult(
        id=case.id, category=case.category, kind="mark",
        passed=all(checks),
        expected=summary(exp.marks_awarded, exp.marks_available, exp.first_divergence_index, exp.ecf_applied),
        actual=summary(res.marks_awarded, res.marks_available, res.first_divergence_index, res.ecf_applied),
        note=case.note,
    )


@dataclass
class GateReport:
    results: List[CaseResult]

    @property
    def golden(self) -> List[CaseResult]:
        return [r for r in self.results if r.category == "golden"]

    @property
    def adversarial(self) -> List[CaseResult]:
        return [r for r in self.results if r.category == "adversarial"]

    @property
    def passed(self) -> bool:
        return all(r.passed for r in self.results)


def run_gate() -> GateReport:
    results: List[CaseResult] = [_run_answer(c) for c in ANSWER_CASES]
    results += [_run_mark(c) for c in MARK_CASES]
    return GateReport(results)


def format_report(report: GateReport) -> str:
    lines = ["Truth-layer verification eval gate (prompt 05)", "=" * 72]
    for r in report.results:
        flag = "PASS" if r.passed else "FAIL"
        lines.append(f"  {flag}  [{r.category:11}] {r.kind:6} {r.id:22}  {r.expected}  ->  {r.actual}")
        if not r.passed:
            lines.append(f"          reason: {r.note}")
    g, a = report.golden, report.adversarial
    gp = sum(r.passed for r in g)
    ap = sum(r.passed for r in a)
    lines.append("-" * 72)
    status = "PASS" if report.passed else "FAIL"
    lines.append(f"GATE: {status} — golden {gp}/{len(g)}, adversarial {ap}/{len(a)}")
    return "\n".join(lines)


if __name__ == "__main__":
    report = run_gate()
    print(format_report(report))
    sys.exit(0 if report.passed else 1)
