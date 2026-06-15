"""
SymPy equivalence verifier — the truth layer's comparison core.

WRAPPED, NOT REWRITTEN. This is `scripts/grade_sympy.py` from the existing
Wisest Maths app, lifted from a stdin/stdout CLI into importable functions. The
safe parser (whitelisted SymPy namespace, no builtins, char allowlist), the
transform chain, the "+C" cleaning, the SIGALRM guard, and the comparison ladder
(simplify -> expand/trigsimp -> numeric a.equals(b) -> strict structural a==b)
are preserved so behaviour matches the original grader.

Provenance: Wisest_Maths_App-4/scripts/grade_sympy.py
Contract role: the equivalence primitive behind VerificationService (prompt 03).

Inputs are expected to be ASCII maths ("x^2 + 2x + 1", "sqrt(3)", "pi") — the
LaTeX/Unicode -> ASCII normalisation lives in `normalize.py` (ported from the
app's TypeScript `normalizeMath`), exactly as it lived on the Node side before.

ONE INTENTIONAL DEVIATION from the original, required by prompt 03 (definition of
done #3 — "inconclusive symbolic cases return indeterminate, not incorrect"):
the original returned `false` whenever the symbolic ladder failed AND the numeric
`a.equals(b)` was not truthy, conflating "proven unequal" with "undecidable".
Here we distinguish them: `a.equals(b)` returning False is a genuine disproof
(-> incorrect), while None means SymPy could not decide (-> indeterminate, never
a guess). See the numeric tail below.

Safety: input is untrusted student text, parsed with a fixed whitelist of SymPy
functions and NO Python builtins, so nothing executes. Input is bounded by the
caller (<=512 chars, enforced in normalize.py). A wall-clock alarm guarantees we
return fast on the main thread.

NO MODEL CALLS. This module must never import or reach an LLM.
"""
from __future__ import annotations

import re
import signal
from typing import Optional, Tuple

# Assumption keys we let `domainHints` thread into free symbols. Restricted to a
# safe, documented subset of SymPy's assumption flags.
_ALLOWED_ASSUMPTIONS = frozenset(
    {"positive", "negative", "real", "integer", "nonnegative", "nonzero", "rational"}
)


def _build_environment(strict: bool, assumptions: Optional[dict]):
    """Construct the SymPy functions + safe `parse` closure shared by
    `compare()` and `canonical_latex()`. Returns (funcs, parse) or None if SymPy
    is unavailable. The comparison ladder in `compare()` is unchanged by this
    extraction — it only moves the parser plumbing into one place."""
    try:
        from sympy import (
            simplify, expand, trigsimp, latex, Abs, sqrt, root, log, exp,
            sin, cos, tan, cot, sec, csc, asin, acos, atan,
            sinh, cosh, tanh, pi, E, factorial,
            Integer, Float, Rational, Symbol,
        )
        from sympy.parsing.sympy_parser import (
            parse_expr, standard_transformations, convert_xor,
            implicit_multiplication, implicit_application, function_exponentiation,
        )
    except Exception:
        return None

    # Transform "sin x" -> sin(x) and "sin^2 x" -> sin(x)**2, plus implicit
    # products ("2x" -> 2*x). We deliberately OMIT split_symbols, so multi-letter
    # names like "theta" or "sin" are never shredded into single-letter products.
    TRANSFORMS = standard_transformations + (
        convert_xor, implicit_application, function_exponentiation, implicit_multiplication,
    )

    # Restrict the parser's global namespace to just the machinery it needs, so
    # untrusted input can't reach SymPy specials whose names collide with Greek
    # variables (e.g. SymPy's beta/gamma functions vs the letters beta/gamma).
    # Unknown names become free Symbols via auto_symbol.
    GLOBAL = {
        "__builtins__": {},
        "Integer": Integer, "Float": Float, "Rational": Rational, "Symbol": Symbol,
    }

    # Whitelisted functions/constants the student may use.
    NS = {
        "sqrt": sqrt, "root": root, "nthRoot": (lambda x, n: root(x, n)),
        "log": log, "ln": log, "log10": (lambda x: log(x, 10)),
        "exp": exp, "abs": Abs, "Abs": Abs, "factorial": factorial,
        "sin": sin, "cos": cos, "tan": tan, "cot": cot, "sec": sec, "csc": csc,
        "asin": asin, "acos": acos, "atan": atan,
        "arcsin": asin, "arccos": acos, "arctan": atan,
        "sinh": sinh, "cosh": cosh, "tanh": tanh,
        "pi": pi, "E": E, "e": E,
    }

    # domainHints -> pre-declared Symbols with assumptions. Only safe flags are
    # honoured; anything else is ignored so a bad hint can never widen the parser.
    if assumptions:
        for name, flags in assumptions.items():
            if not isinstance(name, str) or not name.isidentifier():
                continue
            kwargs = {
                k: bool(v)
                for k, v in (flags or {}).items()
                if k in _ALLOWED_ASSUMPTIONS and isinstance(v, bool)
            }
            if kwargs:
                NS[name] = Symbol(name, **kwargs)

    # Safety allowlist: a real maths answer only uses digits, letters (variable
    # and function names), whitespace and + - * / ^ ( ) . , = . Anything else
    # (underscores, quotes, brackets, keywords) is rejected before parsing, so
    # injection like __import__('os') never reaches the parser.
    SAFE = re.compile(r"^[0-9A-Za-z+\-*/^().,=\s]*$")
    BANNED = re.compile(r"import|lambda|exec|eval|__", re.IGNORECASE)

    def clean(s):
        s = s.strip()
        # In equivalence mode, drop a trailing arbitrary integration constant
        # ("+ C" / "+ c") so x^3/3 + C matches x^3/3.
        if not strict:
            s = re.sub(r"\s*[+\-]\s*[Cc]\s*$", "", s)
        return s

    def parse_one(expr):
        return parse_expr(
            expr, transformations=TRANSFORMS, global_dict=GLOBAL, local_dict=NS, evaluate=True,
        )

    def parse(s):
        s = clean(s)
        if not s or not SAFE.match(s) or BANNED.search(s):
            return None
        if s.count("=") == 1:               # treat "lhs = rhs" as (lhs - rhs)
            lhs, rhs = s.split("=")
            return parse_one(lhs) - parse_one(rhs)
        return parse_one(s)

    funcs = {"simplify": simplify, "expand": expand, "trigsimp": trigsimp, "latex": latex}
    return funcs, parse


def compare(
    student: str,
    canonical: str,
    strict: bool,
    assumptions: Optional[dict] = None,
) -> Tuple[Optional[bool], str]:
    """Decide whether `student` is equivalent to `canonical`.

    Returns (equivalent, detail):
      - (True,  reason)  : graded equivalent
      - (False, reason)  : graded NOT equivalent (a genuine disproof)
      - (None,  reason)  : could not auto-grade -> indeterminate (never a guess)

    `detail` is an internal debugging reason string. It is never shown to students.

    `assumptions` (optional): {"x": {"positive": True}, ...} pre-declares free
    Symbols with SymPy assumptions. Absent -> behaves as the original.
    """
    env = _build_environment(strict, assumptions)
    if env is None:
        return (None, "sympy-unavailable")
    funcs, parse = env
    simplify, expand, trigsimp = funcs["simplify"], funcs["expand"], funcs["trigsimp"]

    def on_alarm(signum, frame):
        raise TimeoutError()

    # signal.alarm only works on the main thread; in a threadpool it is a no-op.
    # Input is bounded to <=512 chars upstream, so compute stays small regardless.
    try:
        signal.signal(signal.SIGALRM, on_alarm)
        signal.alarm(3)
    except Exception:
        pass

    try:
        a = parse(student)
        b = parse(canonical)
        if a is None or b is None:
            return (None, "empty-or-unparseable")

        if strict:
            # Form matters: structural equality. SymPy auto-canonicalises
            # commutative ops (x+y == y+x) but keeps (x+1)^2 distinct from
            # x^2+2x+1 — so an unsimplified equivalent answer is rejected.
            return (bool(a == b), "strict-form")

        # Equivalence: accept any mathematically equal form.
        if simplify(a - b) == 0:
            return (True, "simplify")
        if expand(a - b) == 0 or simplify(trigsimp(a - b)) == 0:
            return (True, "trig-or-expand")

        # Numeric tail. `.equals` proves/diproves at random points.
        #   True  -> equal           -> correct
        #   False -> proven unequal  -> incorrect
        #   None  -> undecidable     -> indeterminate (prompt 03 #3: never a guess)
        try:
            eq = a.equals(b)
        except Exception:
            eq = None
        if eq is True:
            return (True, "numeric-equals")
        if eq is False:
            return (False, "not-equivalent")
        return (None, "numeric-inconclusive")
    except TimeoutError:
        return (None, "timeout")
    except Exception:
        return (None, "error")
    finally:
        try:
            signal.alarm(0)
        except Exception:
            pass


def canonical_latex(expr: str, assumptions: Optional[dict] = None) -> Optional[str]:
    """Best-effort canonical LaTeX of a single ASCII-maths expression, or None if
    it cannot be produced. Used to fill `canonicalAnswerLatex` on the contract."""
    env = _build_environment(strict=False, assumptions=assumptions)
    if env is None:
        return None
    funcs, parse = env
    try:
        parsed = parse(expr)
        if parsed is None:
            return None
        return funcs["latex"](funcs["simplify"](parsed))
    except Exception:
        return None
