"""The verification eval gate (prompt 05) — the definition-of-done assertion.

All golden cases must pass and all adversarial cases must be caught/handled.
This test gates the whole project: do not proceed to grounding/orchestration
until it is green.
"""
from evals.gate import format_report, run_gate


def test_truth_layer_eval_gate_is_green():
    report = run_gate()

    # Both datasets must actually be populated.
    assert report.golden, "no golden cases ran"
    assert report.adversarial, "no adversarial cases ran"

    # Every case must match its expected outcome. On failure, print the full
    # per-case report so the offending case is obvious.
    failures = [r for r in report.results if not r.passed]
    assert not failures, "\n" + format_report(report)

    assert all(r.passed for r in report.golden)
    assert all(r.passed for r in report.adversarial)
    assert report.passed
