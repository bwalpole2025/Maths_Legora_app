"""
VerificationService — maps the frozen `Verify*` contracts (INTERFACES.md §2)
onto the wrapped SymPy equivalence verifier.

Design decision (equivalence-only wrap): the contract gives a *problem* and a
*candidate* but the verifier needs something to compare against, so we treat the
problem itself as the reference expression and check `candidate ≡ problem`. This
covers simplify / expand / factorise / rewrite / evaluate problems. Anything that
is not a single comparable expression (solve / prove / word-problems / prose we
can't reduce) returns `indeterminate` — NEVER a false `incorrect`.

NO MODEL CALLS. NO marking / ECF (that is the diagnosis service, prompt 04).
"""
from __future__ import annotations

import re
from typing import Optional

from ..models import (
    VerifyAnswerRequest, VerifyAnswerResult,
    VerifyStepRequest, VerifyStepResult,
    VerificationStatus, VerifyMethod,
)
from .normalize import normalize_math, to_comparable
from .sympy_verifier import compare, canonical_latex

# Imperatives that ask to REWRITE an expression without changing its value, so
# the answer is mathematically equal to the problem expression. Stripped so
# "Simplify (x+1)^2" reduces to the comparable expression "(x+1)^2".
_REWRITE_IMPERATIVES = re.compile(
    r"\b(simplify|expand|factorise|factorize|evaluate|compute|calculate)\b",
    re.IGNORECASE,
)

# Multi-letter names allowed in a "single comparable expression" (functions,
# constants, Greek letters). Any OTHER multi-letter token means prose ("solve",
# "find", "prove", "the form", ...) -> the problem is not a reference expression.
_ALLOWED_MULTI = frozenset({
    "sqrt", "root", "nthroot", "log", "ln", "log10", "exp", "abs", "factorial",
    "sin", "cos", "tan", "cot", "sec", "csc", "asin", "acos", "atan",
    "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh",
    "pi", "infinity",
    "theta", "alpha", "beta", "gamma", "delta", "epsilon", "lambda",
    "mu", "rho", "sigma", "phi", "omega",
})

# Details produced by the numeric tail of the verifier (vs the symbolic ladder).
_NUMERIC_DETAILS = frozenset({"numeric-equals", "not-equivalent", "numeric-inconclusive"})


def _status_from(equivalent: Optional[bool]) -> VerificationStatus:
    if equivalent is True:
        return "correct"
    if equivalent is False:
        return "incorrect"
    return "indeterminate"


def _method_from(detail: str) -> VerifyMethod:
    # We only ever decide via SymPy (symbolic) or its numeric `.equals` tail.
    # "cas" is in the contract enum for a future external CAS; unused here.
    return "numeric" if detail in _NUMERIC_DETAILS else "sympy"


def _extract_assumptions(domain_hints: Optional[dict]) -> Optional[dict]:
    """Pull a {var: {flag: bool}} assumptions map out of domainHints. Accepts
    either domainHints["assumptions"] or domainHints itself as the map. The
    verifier filters flags to a safe subset, so unknown keys are harmless."""
    if not isinstance(domain_hints, dict):
        return None
    nested = domain_hints.get("assumptions")
    raw = nested if isinstance(nested, dict) else domain_hints
    out = {k: v for k, v in raw.items() if isinstance(k, str) and isinstance(v, dict)}
    return out or None


def _is_comparable_expression(expr: str) -> bool:
    """True if every multi-letter token is a known function/constant/Greek name
    (i.e. no prose). Single-letter tokens are variables and always allowed."""
    for token in re.findall(r"[A-Za-z]+", expr):
        if len(token) >= 2 and token.lower() not in _ALLOWED_MULTI:
            return False
    return True


def _reference_expression(problem_latex: str) -> Optional[str]:
    """Reduce the problem to a single comparable expression, or None if it is not
    one (solve / prove / word-problem / prose). None -> verifyAnswer is indeterminate."""
    norm = _REWRITE_IMPERATIVES.sub(" ", normalize_math(problem_latex)).strip()
    if not norm:
        return None
    expr = to_comparable(norm).strip()
    if not expr or not _is_comparable_expression(expr):
        return None
    return expr


def _is_relational(latex_src: str) -> bool:
    """True if the (normalised) line is an equation/relation rather than a bare
    expression — used by verifyStep to avoid mislabelling a solving step."""
    return "=" in normalize_math(latex_src)


def verify_answer(req: VerifyAnswerRequest) -> VerifyAnswerResult:
    assumptions = _extract_assumptions(req.domain_hints)

    reference = _reference_expression(req.problem_latex)
    if reference is None:
        # Not a single comparable expression (solve/prove/word problem). We do not
        # solve it (equivalence-only wrap) and we never guess -> indeterminate.
        return VerifyAnswerResult(
            status="indeterminate",
            method="sympy",
            detail="problem-not-single-expression",
        )

    candidate = to_comparable(normalize_math(req.candidate_answer_latex))
    equivalent, detail = compare(
        student=candidate, canonical=reference, strict=False, assumptions=assumptions,
    )
    status = _status_from(equivalent)

    return VerifyAnswerResult(
        status=status,
        canonical_answer_latex=canonical_latex(reference, assumptions=assumptions),
        method=_method_from(detail),
        detail=f"{detail}; ref={reference!r}; candidate={candidate!r}",
    )


def verify_step(req: VerifyStepRequest) -> VerifyStepResult:
    """A step is correct if it is value-equivalent to the line it follows (the
    last prior step, else the problem). The wrapped verifier only certifies
    equivalence-preserving manipulation; it does not solve. So:
      - equivalent              -> correct
      - proven unequal, NON-relational lines (a real algebra/arithmetic error) -> incorrect
      - a relational "solving" leap (x^2=4 => x=±2) or anything undecidable -> indeterminate
    Richer step validity (inference, first-divergence, ECF) is the diagnosis
    service's job (prompt 04), explicitly out of scope here.
    """
    prior = [p for p in req.prior_steps_latex if p and p.strip()]
    reference_src = prior[-1] if prior else req.problem_latex

    reference = to_comparable(normalize_math(reference_src))
    step = to_comparable(normalize_math(req.step_latex))
    equivalent, detail = compare(student=step, canonical=reference, strict=False)

    if equivalent is True:
        status: VerificationStatus = "correct"
    elif equivalent is None:
        status = "indeterminate"
    elif _is_relational(reference_src) or _is_relational(req.step_latex):
        # An equation -> a different equation can be a valid solving inference,
        # which the equivalence verifier can't certify. Don't call it wrong.
        status = "indeterminate"
        detail = f"non-equivalent-relational; {detail}"
    else:
        status = "incorrect"

    return VerifyStepResult(
        status=status,
        detail=f"{detail}; ref={reference!r}; step={step!r}",
    )
