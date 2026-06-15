"""
DiagnosisService — maps the frozen `markWorking` contract (INTERFACES.md §3)
onto the first-divergence + ECF marking engine.

OCR is handled UPSTREAM (the Mathpix two-pass + student-confirmation flow lives in
the Node/orchestrator app); this service only ever marks already-confirmed
`studentStepsLatex`. It is part of the truth layer: deterministic, NO model calls,
NO network.
"""
from __future__ import annotations

from ..models import MarkWorkingRequest, MarkWorkingResult
from .engine import diagnose


def mark_working(req: MarkWorkingRequest) -> MarkWorkingResult:
    return diagnose(req)
