"""
LaTeX / Unicode -> ASCII maths normalisation.

PORTED, NOT INVENTED. This is a faithful Python port of `normalizeMath` and
`toComparable` from the existing app's TypeScript
(Wisest_Maths_App-4/lib/services/symbolicGrading.ts). On the Node side this ran
before the SymPy grader; here it does the same job so the Python `maths` service
can accept the LaTeX inputs the contract specifies (`problemLatex`,
`candidateAnswerLatex`) and feed plain ASCII maths to `sympy_verifier.compare()`.

We deliberately do NOT use `sympy.parse_latex` — the existing pipeline is a
regex normaliser, and reproducing it preserves behaviour exactly.

NO MODEL CALLS.
"""
from __future__ import annotations

import re

MAX_INPUT = 512

# Units (with any trailing ²/³ or ^2/^3, e.g. "cm²") stripped so "9.5 cm",
# "2.5 rad", "27π cm²" grade on the value. Tight list + a negative lookahead so
# it never eats a variable (the gradient `m` in "m = 2" survives because callers
# take the RHS; `\mu` is untouched because `m` is followed by a letter).
_UNIT = re.compile(r"\b(cm|mm|km|m|rad|degrees?|deg)(?![a-z])\s*(?:\^?\s*[23]|[²³])?", re.IGNORECASE)

_FRAC = re.compile(r"\\[tdc]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}")


def normalize_math(raw: str) -> str:
    """LaTeX-ish prose -> mathjs/SymPy-friendly ASCII. Faithful port of normalizeMath."""
    s = raw.strip()
    if len(s) > MAX_INPUT:
        s = s[:MAX_INPUT]

    # 0. Unicode maths glyphs (symbol-palette input) -> ASCII. Done before the
    #    LaTeX handling so e.g. "√x" becomes "sqrt(x)". (² ³ ° are intentionally
    #    left for step 8 and the unit strip, which depend on the raw glyphs.)
    s = re.sub(r"[×·∙]", "*", s)
    s = re.sub(r"÷", "/", s)
    s = re.sub(r"−", "-", s)  # U+2212 minus sign -> ASCII hyphen-minus
    s = re.sub(r"√\s*\(", "sqrt(", s)
    s = re.sub(r"√\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z])", r"sqrt(\g<1>)", s)
    s = re.sub(r"√", " sqrt ", s)
    s = re.sub(r"∛\s*\(([^()]*)\)", r"nthRoot((\g<1>),3)", s)
    s = re.sub(r"∛\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z])", r"nthRoot(\g<1>,3)", s)
    s = re.sub(r"π", " pi ", s)
    s = re.sub(r"θ", " theta ", s)
    s = re.sub(r"≤", "<=", s)
    s = re.sub(r"≥", ">=", s)
    s = re.sub(r"≠", "!=", s)
    s = re.sub(r"[≈≡]", "=", s)
    s = re.sub(r"[±∓]", "+", s)  # mirrors \pm handling below
    s = re.sub(r"∞", " Infinity ", s)
    s = re.sub(r"∝", " ", s)
    s = re.sub(r"α", " alpha ", s)
    s = re.sub(r"β", " beta ", s)
    s = re.sub(r"γ", " gamma ", s)
    s = re.sub(r"δ", " delta ", s)
    s = re.sub(r"ε", " epsilon ", s)
    s = re.sub(r"λ", " lambda ", s)
    s = re.sub(r"μ", " mu ", s)
    s = re.sub(r"ρ", " rho ", s)
    s = re.sub(r"σ", " sigma ", s)
    s = re.sub(r"φ", " phi ", s)
    s = re.sub(r"ω", " omega ", s)
    s = re.sub(r"Δ", " Delta ", s)
    s = re.sub(r"Σ", " Sigma ", s)
    s = re.sub(r"Ω", " Omega ", s)

    # 1. Strip math delimiters: \( \) \[ \] $ $$
    s = re.sub(r"\\[()\[\]]", " ", s)
    s = re.sub(r"\${1,2}", " ", s)

    # 1b. Strip units EARLY (before ² is reinterpreted as an exponent), so a
    #     square-unit like "cm²" is removed whole rather than leaving a "^2".
    s = _UNIT.sub(" ", s)

    # 2. \text{...} / \mathrm{...} / \operatorname{...} -> drop markup, keep words
    s = re.sub(r"\\(?:text|mathrm|operatorname)\s*\{([^{}]*)\}", r" \g<1> ", s)

    # 3. Spacing / decoration commands -> space or nothing
    s = re.sub(r"\\(?:left|right|displaystyle|;|,|!|quad|qquad)", " ", s)
    s = re.sub(r"\\,", " ", s)

    # 4. Fractions: \frac{a}{b}, \tfrac, \dfrac -> ((a)/(b)) (repeat to unwrap nesting)
    for _ in range(6):
        if not _FRAC.search(s):
            break
        s = _FRAC.sub(r"((\g<1>)/(\g<2>))", s)

    # 5. Roots: \sqrt[n]{x} -> nthRoot((x),(n)); \sqrt{x} -> sqrt((x));
    #    \sqrt 3 / \sqrt x (bare single-token arg) -> sqrt(3)
    s = re.sub(r"\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}", r"nthRoot((\g<2>),(\g<1>))", s)
    s = re.sub(r"\\sqrt\s*\{([^{}]*)\}", r"sqrt((\g<1>))", s)
    s = re.sub(r"\\sqrt\s*([0-9]+(?:\.[0-9]+)?|[a-zA-Z])", r"sqrt(\g<1>)", s)

    # 6. Operators & constants
    s = re.sub(r"\\cdot|\\times", "*", s)
    s = re.sub(r"\\div", "/", s)
    s = re.sub(r"\\pm", "+", s)  # a "±" answer can't be auto-graded as one expr; pick +
    s = re.sub(r"\\pi", " pi ", s)
    s = re.sub(r"\\e\b", " e ", s)
    s = re.sub(r"\\infty", " Infinity ", s)
    s = re.sub(r"\\theta", " theta ", s)
    s = re.sub(r"\\(?:alpha|beta|gamma|lambda|mu|phi|omega)", lambda m: " " + m.group(0)[1:] + " ", s)

    # 7. Functions: \ln -> log (natural), \log -> log10, others drop the backslash.
    s = re.sub(r"\\ln", "log", s)
    s = re.sub(r"\\log", "log10", s)
    s = re.sub(r"\\(sin|cos|tan|csc|sec|cot|sinh|cosh|tanh|exp|abs|arcsin|arccos|arctan)\b", r"\g<1>", s)

    # 8. Superscripts: a^{...} -> a^(...); unicode ² ³ -> ^2 ^3; ° removed
    s = re.sub(r"\^\s*\{([^{}]*)\}", r"^(\g<1>)", s)
    s = re.sub(r"²", "^2", s)
    s = re.sub(r"³", "^3", s)
    s = re.sub(r"°", " ", s)

    # 9. Thousands separators written as 12{,}345 or 12,345 (3-digit groups)
    s = re.sub(r"\{,\}", "", s)
    s = re.sub(r"(\d),(\d{3})\b", r"\g<1>\g<2>", s)

    # 10. arcsin -> asin etc. (SymPy/mathjs spelling)
    s = re.sub(r"\barc(sin|cos|tan)\b", r"a\g<1>", s)

    # 11. Any leftover LaTeX braces -> parentheses; drop stray backslashes.
    s = re.sub(r"[{}]", " ", s)
    s = re.sub(r"\\", " ", s)

    # 12. Strip any units that surfaced only after fraction/macro expansion.
    s = _UNIT.sub(" ", s)

    # 13. Collapse whitespace.
    return re.sub(r"\s+", " ", s).strip()


_LONE_VAR = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]*$")


def to_comparable(normalized: str) -> str:
    """Reduce an answer to one comparable expression string. Faithful port of toComparable.

      "θ = 2.5"        -> "2.5"             (lhs is a lone variable -> take rhs)
      "y = (x+1)^2"    -> "(x+1)^2"
      "x^2 + y^2 = 1"  -> "(x^2 + y^2)-(1)" (relational -> bring to one side)
      "x^2 + 2x + 1"   -> unchanged
    """
    eq_parts = normalized.split("=")
    if len(eq_parts) == 2:
        lhs = eq_parts[0].strip()
        rhs = eq_parts[1].strip()
        if _LONE_VAR.match(lhs):
            return rhs  # value of a named unknown
        return f"({lhs})-({rhs})"  # implicit equation: compare to zero
    return normalized  # not an equation (or >2 parts -> let the parser fail)
