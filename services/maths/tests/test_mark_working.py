"""markWorking — first-divergence + ECF marking over the student's own lines.

These are the prompt-04 definition-of-done tests. Marking reuses the prompt-03
step verifier; there is no reference solution, so "divergence" means the first
line that is not a value-preserving manipulation of the line before it.
"""
import pytest

from app.diagnosis.service import mark_working
from app.models import MarkScheme, MarkSchemeMark, MarkWorkingRequest
from tests.fixtures import (
    HANDWRITING_OCR_CONFIRMED,
    UnconfirmedOCRError,
    confirmed_steps,
)


def _mark(problem, steps, scheme=None, allow_ecf=True):
    return mark_working(
        MarkWorkingRequest(
            problem_latex=problem,
            student_steps_latex=steps,
            mark_scheme=scheme,
            allow_ecf=allow_ecf,
        )
    )


# --- 1. Known first-divergence (no scheme) --------------------------------

def test_all_steps_correct_no_divergence_full_marks():
    res = _mark("Simplify 2x + 3x + 4x", ["5x + 4x", "9x"])
    assert res.first_divergence_index is None
    assert [s.status for s in res.per_step] == ["correct", "correct"]
    assert res.marks_awarded == 2
    assert res.marks_available == 2
    assert res.ecf_applied is False


def test_known_first_divergence_index_and_marks():
    res = _mark("Simplify 2x + 3x + 4x", ["5x + 4x", "8x"])
    assert res.first_divergence_index == 1
    assert res.per_step[1].is_first_divergence is True
    assert res.per_step[1].status == "incorrect"
    assert res.marks_awarded == 1
    assert res.marks_available == 2


# --- 2. ECF (no scheme) ---------------------------------------------------

ECF_PROBLEM = "Simplify 3(2x + 1) + x"          # true: 7x + 3
ECF_STEPS = ["6x + 1 + x", "7x + 1"]            # slip 3*1=1 at step 0, then a valid combine


def test_ecf_credits_carried_forward_step_when_allowed():
    res = _mark(ECF_PROBLEM, ECF_STEPS, allow_ecf=True)
    assert res.first_divergence_index == 0
    assert res.per_step[0].status == "incorrect"
    assert res.per_step[1].status == "correct"
    assert res.per_step[1].carried_forward is True
    assert res.marks_awarded == 1
    assert res.ecf_applied is True


def test_ecf_withheld_when_not_allowed():
    res = _mark(ECF_PROBLEM, ECF_STEPS, allow_ecf=False)
    assert res.first_divergence_index == 0
    assert res.per_step[1].carried_forward is True   # still flagged...
    assert res.marks_awarded == 0                     # ...but not credited
    assert res.ecf_applied is False


# --- 3. Full mark scheme with dependsOn + follow-through ------------------

# true 8x + 10; expand, then slip 8+2=9, then a value-preserving reorder.
SCHEME_PROBLEM = "Simplify 2(3x + 4) + 2(x + 1)"
SCHEME_STEPS = ["6x + 8 + 2x + 2", "8x + 9", "9 + 8x"]


def _scheme():
    return MarkScheme(
        marks=[
            MarkSchemeMark(id="M1", type="M", step_index=0),
            MarkSchemeMark(id="A1", type="A", step_index=1, depends_on=["M1"]),
            MarkSchemeMark(id="M2", type="M", step_index=2),
        ]
    )


def test_mark_scheme_dependson_and_followthrough():
    res = _mark(SCHEME_PROBLEM, SCHEME_STEPS, scheme=_scheme(), allow_ecf=True)
    assert res.first_divergence_index == 1
    assert res.marks_available == 3
    # M1 (clean method) + M2 (method via ECF); A1 withheld (accuracy value wrong).
    assert res.marks_awarded == 2
    assert res.ecf_applied is True


def test_mark_scheme_followthrough_withheld_without_ecf():
    res = _mark(SCHEME_PROBLEM, SCHEME_STEPS, scheme=_scheme(), allow_ecf=False)
    assert res.marks_awarded == 1          # only M1; M2 not followed through
    assert res.ecf_applied is False


# --- 4. Handwriting -> confirmation -> marking ----------------------------

def test_handwriting_confirmed_flows_into_marking():
    # Upstream OCR + student confirmation produced these steps; only confirmed
    # transcripts reach the service.
    steps = confirmed_steps(HANDWRITING_OCR_CONFIRMED)
    res = _mark(HANDWRITING_OCR_CONFIRMED["problem_latex"], steps)
    assert res.first_divergence_index is None
    assert res.marks_awarded == res.marks_available == 2


def test_unconfirmed_ocr_is_never_marked():
    unconfirmed = {**HANDWRITING_OCR_CONFIRMED, "confirmed": False}
    with pytest.raises(UnconfirmedOCRError):
        confirmed_steps(unconfirmed)


# --- Conservative behaviour ------------------------------------------------

def test_solving_leap_is_indeterminate_not_divergence():
    # A relational solving step the equivalence verifier can't certify must not be
    # reported as a divergence (truth layer never guesses).
    res = _mark("Solve x^2 = 4", ["x^2 = 4", "x = 2"])
    assert res.first_divergence_index is None
    assert all(s.status == "indeterminate" for s in res.per_step)
    assert res.marks_awarded == 0
