"""
First-divergence + ECF marking engine (DiagnosisService, INTERFACES.md §3).

WRAP, NOT REWRITE: this REUSES the prompt-03 step verifier
(`..verification.service.verify_step`) as its only correctness source. It adds no
new equivalence logic and — like the rest of the truth layer — never calls a
model or the network.

No reference solution is available (the contract gives only the student's own
lines), so marking is built on internal consistency between consecutive lines:

  * Each step S[i] is checked against the line it follows (S[i-1], or the problem
    for i == 0) via `verify_step` -> correct / incorrect / indeterminate.
  * The FIRST step proven `incorrect` is the first divergence.
  * After a divergence, a later step that is `correct` relative to its (already
    wrong) predecessor is "error carried forward": the student applied a valid
    manipulation to their own wrong value, so it earns credit when ECF is allowed.
  * `indeterminate` (e.g. a solving leap the verifier cannot certify) is never a
    divergence and never credited — the truth layer neither penalises nor rewards
    what it cannot decide.

The FIRST line is special: it is checked against the *problem*. We reduce the
problem to a single comparable expression first (reusing the verification layer's
`_reference_expression`, which strips "simplify/expand/..." imperatives). If the
problem is not a single expression (Solve / Prove / word problem) there is nothing
safe to check the first line against, so it is left `indeterminate` rather than
marked as a false divergence.

Mark scheme (optional): M (method) marks are awarded for a valid step including
under ECF; A (accuracy) marks need the value to be right, or — with `ft` — a
carried-forward value, AND all their `dependsOn` marks; B marks are independent of
other marks. With no scheme, each step is worth one mark.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from ..models import (
    MarkScheme,
    MarkWorkingRequest,
    MarkWorkingResult,
    PerStepStatus,
    VerificationStatus,
    VerifyStepRequest,
)
from ..verification.service import _reference_expression, verify_step


def _problem_reference(problem_latex: str) -> str:
    """A clean comparable form of the problem to check the FIRST line against, or
    '' when the problem is not a single comparable expression. An empty reference
    makes the first line verify as `indeterminate` (unparseable) instead of a
    false `incorrect`."""
    expr = _reference_expression(problem_latex)
    return expr if expr is not None else ""


def _per_step_statuses(problem_latex: str, steps: List[str]) -> List[VerificationStatus]:
    """Status of each step vs the line it follows, via the prompt-03 verifier.

    `verify_step` compares a step to its last non-empty prior line (or the problem
    when there is none) and treats relational "solving" leaps and unparseable
    references as `indeterminate`, so consecutive-line marking falls straight out
    of it.
    """
    reference = _problem_reference(problem_latex)
    statuses: List[VerificationStatus] = []
    for i, step in enumerate(steps):
        res = verify_step(
            VerifyStepRequest(
                problem_latex=reference,
                prior_steps_latex=steps[:i],
                step_latex=step,
            )
        )
        statuses.append(res.status)
    return statuses


def _first_divergence(statuses: List[VerificationStatus]) -> Optional[int]:
    for i, status in enumerate(statuses):
        if status == "incorrect":
            return i
    return None


def _score_default(
    statuses: List[VerificationStatus], carried: List[bool], allow_ecf: bool
) -> Tuple[int, int, bool]:
    """No scheme: one mark per step. A clean (pre-divergence) correct step always
    scores; a carried (post-divergence) step scores only when ECF is allowed."""
    available = len(statuses)
    awarded = 0
    ecf_applied = False
    for status, cf in zip(statuses, carried):
        if cf:
            # value-preserving manipulation of an already-wrong line -> ECF only.
            if allow_ecf:
                awarded += 1
                ecf_applied = True
        elif status == "correct":
            awarded += 1
    return awarded, available, ecf_applied


def _score_with_scheme(
    scheme: MarkScheme,
    statuses: List[VerificationStatus],
    carried: List[bool],
    allow_ecf: bool,
) -> Tuple[int, int, bool]:
    """Award each mark by type, honouring `dependsOn` (resolved to a fixpoint).

    Returns (marksAwarded, marksAvailable, ecfApplied).
    """
    available = sum(m.max_marks for m in scheme.marks)
    by_id = {m.id: m for m in scheme.marks}

    def base_eligible(mark) -> Tuple[bool, bool]:
        """(eligible, via_ecf) ignoring dependencies."""
        idx = mark.step_index
        if idx is None or not (0 <= idx < len(statuses)):
            # Not tied to a checkable step -> the truth layer won't award it.
            return (False, False)
        if carried[idx]:
            # Correct relative to an already-wrong line -> follow-through only.
            # M (method) always follows through; A (accuracy) only when `ft`.
            if allow_ecf and (mark.type == "M" or (mark.type == "A" and mark.ft)):
                return (True, True)
            return (False, False)
        if statuses[idx] == "correct":
            # Clean, on-track step.
            return (True, False)
        return (False, False)

    awarded: Dict[str, bool] = {}  # id -> credited via ECF
    changed = True
    while changed:
        changed = False
        for mark in scheme.marks:
            if mark.id in awarded:
                continue
            eligible, via_ecf = base_eligible(mark)
            if not eligible:
                continue
            if all(dep in awarded for dep in (mark.depends_on or [])):
                awarded[mark.id] = via_ecf
                changed = True

    marks_awarded = sum(by_id[mark_id].max_marks for mark_id in awarded)
    ecf_applied = any(awarded.values())
    return marks_awarded, available, ecf_applied


def diagnose(req: MarkWorkingRequest) -> MarkWorkingResult:
    steps = list(req.student_steps_latex)
    statuses = _per_step_statuses(req.problem_latex, steps)
    first_divergence_index = _first_divergence(statuses)

    per_step: List[PerStepStatus] = []
    carried: List[bool] = []
    for i, status in enumerate(statuses):
        cf = (
            first_divergence_index is not None
            and i > first_divergence_index
            and status == "correct"
        )
        carried.append(cf)
        per_step.append(
            PerStepStatus(
                index=i,
                status=status,
                is_first_divergence=(i == first_divergence_index),
                carried_forward=cf,
            )
        )

    if req.mark_scheme is not None:
        awarded, available, ecf_applied = _score_with_scheme(
            req.mark_scheme, statuses, carried, req.allow_ecf
        )
    else:
        awarded, available, ecf_applied = _score_default(statuses, carried, req.allow_ecf)

    return MarkWorkingResult(
        marks_awarded=awarded,
        marks_available=available,
        first_divergence_index=first_divergence_index,
        per_step=per_step,
        ecf_applied=ecf_applied,
    )
