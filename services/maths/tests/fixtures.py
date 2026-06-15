"""Golden fixtures for the verification service.

GOLDEN_CORRECT: (problemLatex, candidateAnswerLatex) pairs that MUST verify as
`correct`. The problems are expression-/rewrite-form (the equivalence-only wrap
treats the problem as the reference expression). They exercise the awkward cases
the prompt calls out: equivalent-but-different forms, fractions, surds/pi, trig
identities, commutativity, and the integration-constant convention.
"""

GOLDEN_CORRECT = [
    # factored vs expanded — both directions
    ("(x+1)^2", "x^2 + 2x + 1"),
    ("x^2 + 2x + 1", "(x+1)^2"),
    # fraction reduction (LaTeX and ASCII)
    (r"\frac{4}{8}", r"\frac{1}{2}"),
    ("4/8", "1/2"),
    # surd / pi forms
    (r"6\pi - 9\sqrt{3}", r"6 \pi - 9 \sqrt 3"),
    (r"\sqrt{16}", "4"),
    # trig identity
    (r"\sin^2 x + \cos^2 x", "1"),
    # commutativity
    ("x + y", "y + x"),
    # arbitrary integration constant dropped in equivalence mode
    (r"\frac{x^3}{3} + C", "x^3/3"),
    # unicode glyph palette input
    ("2 × 3", "6"),          # 2 × 3
    ("√16", "4"),            # √16
]

# Problems that are NOT a single comparable expression -> must be `indeterminate`
# (never a false `incorrect`), because the equivalence-only wrap does not solve.
INDETERMINATE_PROBLEMS = [
    ("Solve x^2 = 4", "2"),
    (r"\int x \, dx", r"\frac{x^2}{2} + C"),
    ("Prove that the sum of two odd numbers is even", "QED"),
]


# ---------------------------------------------------------------------------
# Diagnosis / marking fixtures (prompt 04).
# ---------------------------------------------------------------------------

# A handwriting submission as it arrives AFTER the upstream Mathpix two-pass OCR
# + student-confirmation flow (which lives in the Node app, NOT in this truth-layer
# service): the OCR'd LaTeX lines the student reviewed and approved. The maths
# service only ever marks confirmed steps.
HANDWRITING_OCR_CONFIRMED = {
    "problem_latex": "Simplify 2(x + 3) + 4x",
    "confirmed": True,
    "steps_latex": ["2x + 6 + 4x", "6x + 6"],
}


class UnconfirmedOCRError(RuntimeError):
    """Raised when something tries to mark OCR output the student never confirmed."""


def confirmed_steps(submission: dict) -> list:
    """Model the upstream contract for tests: only a *confirmed* transcript becomes
    `studentStepsLatex`. Refuses to return steps that were never confirmed, so a
    test can prove the service never marks unconfirmed OCR. (Lives in tests/, not
    app/, so the truth layer stays free of any OCR/network code.)"""
    if not submission.get("confirmed"):
        raise UnconfirmedOCRError("OCR transcript was not confirmed by the student")
    return list(submission["steps_latex"])
