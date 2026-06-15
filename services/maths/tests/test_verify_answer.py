"""verifyAnswer — the definition-of-done tests for prompt 03."""
import pytest

from app.models import VerifyAnswerRequest
from app.verification.service import verify_answer
from tests.fixtures import GOLDEN_CORRECT, INDETERMINATE_PROBLEMS


def _verify(problem, candidate, domain_hints=None):
    return verify_answer(
        VerifyAnswerRequest(
            problem_latex=problem,
            candidate_answer_latex=candidate,
            domain_hints=domain_hints,
        )
    )


@pytest.mark.parametrize("problem, candidate", GOLDEN_CORRECT)
def test_golden_pairs_are_correct(problem, candidate):
    res = _verify(problem, candidate)
    assert res.status == "correct", f"{problem!r} vs {candidate!r}: {res.detail}"
    assert res.method in ("sympy", "numeric")


def test_equivalent_forms_factored_vs_expanded():
    # The headline awkward case: different forms, same value.
    assert _verify("(x+1)^2", "x^2 + 2x + 1").status == "correct"
    assert _verify("x^2 - 1", "(x-1)(x+1)").status == "correct"


def test_clearly_wrong_answer_is_incorrect():
    assert _verify("(x+1)^2", "x^2 + 1").status == "incorrect"
    assert _verify("4/8", "1/3").status == "incorrect"


@pytest.mark.parametrize("problem, candidate", INDETERMINATE_PROBLEMS)
def test_non_single_expression_is_indeterminate_not_incorrect(problem, candidate):
    # Inconclusive / unsupported problem classes must never come back `incorrect`.
    res = _verify(problem, candidate)
    assert res.status == "indeterminate", f"{problem!r}: {res.detail}"


def test_canonical_answer_latex_is_produced_when_possible():
    res = _verify("(x+1)^2", "x^2 + 2x + 1")
    assert res.status == "correct"
    assert isinstance(res.canonical_answer_latex, str)
    assert res.canonical_answer_latex.strip() != ""


def test_domain_hints_make_assumption_sensitive_case_correct():
    # sqrt(x^2) == x only when x is known positive; the hint must change the verdict.
    without = _verify(r"\sqrt{x^2}", "x")
    assert without.status != "correct"  # incorrect or indeterminate in general

    with_hint = _verify(r"\sqrt{x^2}", "x", domain_hints={"x": {"positive": True}})
    assert with_hint.status == "correct", with_hint.detail


def test_detail_is_present_but_internal():
    # `detail` exists for debugging; it is not asserted to be student-safe here —
    # stripping is the orchestrator's job. We only check it carries debug context.
    res = _verify("(x+1)^2", "x^2 + 2x + 1")
    assert res.detail and "ref=" in res.detail
