"""verifyStep — conservative equivalence-preserving step checks."""
from app.models import VerifyStepRequest
from app.verification.service import verify_step


def _step(problem, prior, step):
    return verify_step(
        VerifyStepRequest(problem_latex=problem, prior_steps_latex=prior, step_latex=step)
    )


def test_value_preserving_step_is_correct():
    res = _step("Simplify 2x + 3x", ["2x + 3x"], "5x")
    assert res.status == "correct", res.detail


def test_value_preserving_equation_rearrangement_is_correct():
    # 2x + 4 = 10  ->  2x = 6  is value-preserving (both reduce to 2x - 6).
    res = _step("Solve 2x + 4 = 10", ["2x + 4 = 10"], "2x = 6")
    assert res.status == "correct", res.detail


def test_first_step_uses_problem_as_reference():
    res = _step("2x + 3x", [], "5x")
    assert res.status == "correct", res.detail


def test_arithmetic_error_in_expression_is_incorrect():
    res = _step("Simplify 2x + 3x", ["2x + 3x"], "6x")
    assert res.status == "incorrect", res.detail


def test_solving_inference_leap_is_indeterminate_not_incorrect():
    # x^2 = 4  =>  x = 2  is a (partial) solving inference, not an equivalence.
    # The equivalence verifier cannot certify it, so it must NOT be called wrong.
    res = _step("Solve x^2 = 4", ["x^2 = 4"], "x = 2")
    assert res.status == "indeterminate", res.detail


def test_unparseable_step_is_indeterminate():
    res = _step("Simplify 2x + 3x", ["2x + 3x"], "I'm not sure")
    assert res.status == "indeterminate", res.detail
