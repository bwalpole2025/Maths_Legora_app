"""
Golden + adversarial datasets for the truth-layer eval gate (prompt 05).

Each case carries its EXPECTED outcome. Expectations encode the truth layer's
as-built, deliberate behaviour (the gate measures; it does not patch the
services). Every expected value here was traced against the live verifier /
diagnosis engine.

Two case kinds:
  * AnswerCase -> run through `verify_answer` (verifyAnswer).
  * MarkCase   -> run through `mark_working` (markWorking).

Categories:
  * "golden"      — known-correct maths with a known outcome.
  * "adversarial" — a plausible-looking error that must be CAUGHT, or an
                    equivalent/assumption-sensitive form that must be correctly
                    ACCEPTED (never a false reject) or left INDETERMINATE
                    (never a false accept).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.models import MarkScheme, MarkSchemeMark, VerificationStatus


# ── case shapes ──────────────────────────────────────────────────────────────

@dataclass
class AnswerCase:
    id: str
    category: str  # "golden" | "adversarial"
    problem_latex: str
    candidate_latex: str
    expected_status: VerificationStatus
    note: str
    domain_hints: Optional[Dict[str, Any]] = None
    # Extra statuses that are ALSO acceptable. Used only where the underlying
    # SymPy `.equals()` numeric sampling is non-deterministic between two SAFE
    # outcomes (e.g. incorrect vs indeterminate) — both of which still encode the
    # invariant we care about (never a false ACCEPT).
    also_accept: tuple = ()

    @property
    def accepted_statuses(self) -> tuple:
        return (self.expected_status,) + tuple(self.also_accept)


@dataclass
class ExpectedStep:
    index: int
    status: VerificationStatus
    is_first_divergence: bool = False
    carried_forward: bool = False


@dataclass
class ExpectedMark:
    marks_awarded: int
    marks_available: int
    first_divergence_index: Optional[int]
    ecf_applied: bool
    per_step: Optional[List[ExpectedStep]] = None


@dataclass
class MarkCase:
    id: str
    category: str
    problem_latex: str
    student_steps: List[str]
    expected: ExpectedMark
    note: str
    mark_scheme: Optional[MarkScheme] = None
    allow_ecf: bool = True


# ── verifyAnswer dataset ─────────────────────────────────────────────────────

ANSWER_CASES: List[AnswerCase] = [
    # golden — correct maths in a different but equivalent form
    AnswerCase("g-ans-expand", "golden", "(x+1)^2", "x^2 + 2x + 1",
               "correct", "factored vs expanded"),
    AnswerCase("g-ans-factor", "golden", "x^2 - 9", "(x-3)(x+3)",
               "correct", "expanded vs factored (difference of two squares)"),
    AnswerCase("g-ans-fraction", "golden", r"\frac{4}{8}", r"\frac{1}{2}",
               "correct", "unreduced vs reduced fraction"),
    AnswerCase("g-ans-trig", "golden", r"\sin^2 x + \cos^2 x", "1",
               "correct", "Pythagorean identity"),
    AnswerCase("g-ans-commute", "golden", "x + y", "y + x",
               "correct", "commutativity"),
    AnswerCase("g-ans-arbitrary-C", "golden", r"\frac{x^3}{3} + C", "x^3/3",
               "correct", "arbitrary +C is optional for an indefinite integral (by design)"),

    # adversarial — plausible but wrong, must be CAUGHT as incorrect
    AnswerCase("a-ans-sign-slip", "adversarial", "(x-3)(x+2)", "x^2 + x - 6",
               "incorrect", "slipped sign: correct expansion is x^2 - x - 6"),
    AnswerCase("a-ans-off-by-one", "adversarial", "(x+1)^2", "x^2 + 2x + 2",
               "incorrect", "off-by-one constant term (should be +1)"),
    AnswerCase("a-ans-concrete-const", "adversarial", "x^3/3 + 5", "x^3/3",
               "incorrect", "dropped a CONCRETE constant (particular solution) — caught"),

    # adversarial — equivalent / assumption-sensitive, must be handled SAFELY
    AnswerCase("a-ans-equiv-form", "adversarial", "(2x+2)/2", "x+1",
               "correct", "equivalent-but-different form must be accepted, not rejected"),
    AnswerCase("a-ans-assumption-none", "adversarial", r"\sqrt{x^2}", "x",
               "indeterminate",
               "sqrt(x^2) != x in general (=|x|): must NOT be accepted without a domain "
               "hint; .equals sampling makes it incorrect-or-indeterminate, both safe",
               also_accept=("incorrect",)),
    AnswerCase("a-ans-assumption-hint", "adversarial", r"\sqrt{x^2}", "x",
               "correct", "with x>0 the forms are equal — domain hint resolves it",
               domain_hints={"x": {"positive": True}}),
]


# ── markWorking dataset ──────────────────────────────────────────────────────

# A clean scheme: method mark on the expansion line, accuracy mark on the answer
# line (depending on the method mark).
_SCHEME_CLEAN = MarkScheme(marks=[
    MarkSchemeMark(id="M1", type="M", step_index=0, description="expand the bracket"),
    MarkSchemeMark(id="A1", type="A", step_index=1, depends_on=["M1"], description="collect like terms"),
])

# ECF schemes: the creditable work is the *collect* step (index 1), which the
# student performed correctly on their own (wrong) expansion. M follows through
# always; A only with ft.
_SCHEME_ECF_NOFT = MarkScheme(marks=[
    MarkSchemeMark(id="M1", type="M", step_index=1, description="valid method on own value"),
    MarkSchemeMark(id="A1", type="A", step_index=1, depends_on=["M1"], ft=False, description="accurate value"),
])
_SCHEME_ECF_FT = MarkScheme(marks=[
    MarkSchemeMark(id="M1", type="M", step_index=1, description="valid method on own value"),
    MarkSchemeMark(id="A1", type="A", step_index=1, depends_on=["M1"], ft=True, description="follow-through value"),
])

# The wrong-but-internally-consistent chain reused across the ECF variants:
# 4(x+2)-x = 3x+8, but the student wrote 4*2=6, then correctly collected -> 3x+6.
_ECF_PROBLEM = "Simplify 4(x + 2) - x"
_ECF_STEPS = ["4x + 6 - x", "3x + 6"]
_ECF_PER_STEP = [
    ExpectedStep(0, "incorrect", is_first_divergence=True),
    ExpectedStep(1, "correct", carried_forward=True),
]

MARK_CASES: List[MarkCase] = [
    # golden — every line is value-preserving -> full marks, no divergence
    MarkCase("g-mark-collect", "golden", "Simplify 2(x + 3) + 4x",
             ["2x + 6 + 4x", "6x + 6"],
             ExpectedMark(2, 2, None, False, [
                 ExpectedStep(0, "correct"), ExpectedStep(1, "correct")]),
             "clean simplification chain"),
    MarkCase("g-mark-expand", "golden", "Expand (x+2)(x+3)",
             ["x^2 + 3x + 2x + 6", "x^2 + 5x + 6"],
             ExpectedMark(2, 2, None, False, [
                 ExpectedStep(0, "correct"), ExpectedStep(1, "correct")]),
             "clean expansion chain"),
    MarkCase("g-mark-scheme-clean", "golden", "Simplify 4(x + 2) - x",
             ["4x + 8 - x", "3x + 8"],
             ExpectedMark(2, 2, None, False, [
                 ExpectedStep(0, "correct"), ExpectedStep(1, "correct")]),
             "mark scheme with dependsOn: both M1 and A1 awarded cleanly",
             mark_scheme=_SCHEME_CLEAN),
    MarkCase("g-mark-solve-leap", "golden", "Solve 2x + 4 = 10",
             ["2x = 6", "x = 3"],
             ExpectedMark(0, 2, None, False, [
                 ExpectedStep(0, "indeterminate"), ExpectedStep(1, "indeterminate")]),
             "correct solving leaps are INDETERMINATE (uncredited) — never falsely caught"),

    # adversarial — planted errors that must be caught at the right place
    MarkCase("a-mark-off-by-one", "adversarial", "Simplify 2x + 3x + 4x",
             ["5x + 4x", "8x"],
             ExpectedMark(1, 2, 1, False, [
                 ExpectedStep(0, "correct"),
                 ExpectedStep(1, "incorrect", is_first_divergence=True)]),
             "off-by-one: 5x+4x=9x, not 8x — divergence at index 1"),
    MarkCase("a-mark-sign-slip", "adversarial", "Simplify 3(2x + 1) + x",
             ["6x - 3 + x", "7x - 3"],
             ExpectedMark(1, 2, 0, True, [
                 ExpectedStep(0, "incorrect", is_first_divergence=True),
                 ExpectedStep(1, "correct", carried_forward=True)]),
             "sign slip at index 0; correct collect after -> carried forward (ECF)"),

    # adversarial — the SAME wrong-but-internally-consistent ECF chain, exercised
    # to prove ECF gating is real.
    MarkCase("a-mark-ecf-default-on", "adversarial", _ECF_PROBLEM, _ECF_STEPS,
             ExpectedMark(1, 2, 0, True, _ECF_PER_STEP),
             "default scoring, allowEcf=True -> carried step earns its mark",
             allow_ecf=True),
    MarkCase("a-mark-ecf-default-off", "adversarial", _ECF_PROBLEM, _ECF_STEPS,
             ExpectedMark(0, 2, 0, False, _ECF_PER_STEP),
             "default scoring, allowEcf=False -> carried mark WITHHELD",
             allow_ecf=False),
    MarkCase("a-mark-ecf-scheme-noft", "adversarial", _ECF_PROBLEM, _ECF_STEPS,
             ExpectedMark(1, 2, 0, True, _ECF_PER_STEP),
             "scheme, allowEcf=True, A not ft -> M1 follows through, A1 withheld",
             mark_scheme=_SCHEME_ECF_NOFT, allow_ecf=True),
    MarkCase("a-mark-ecf-scheme-ft", "adversarial", _ECF_PROBLEM, _ECF_STEPS,
             ExpectedMark(2, 2, 0, True, _ECF_PER_STEP),
             "scheme, allowEcf=True, A is ft -> M1 and A1 both follow through",
             mark_scheme=_SCHEME_ECF_FT, allow_ecf=True),
    MarkCase("a-mark-ecf-scheme-off", "adversarial", _ECF_PROBLEM, _ECF_STEPS,
             ExpectedMark(0, 2, 0, False, _ECF_PER_STEP),
             "scheme, allowEcf=False -> nothing carried is awarded",
             mark_scheme=_SCHEME_ECF_NOFT, allow_ecf=False),
]
