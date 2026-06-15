"""Parity tests for the LaTeX/Unicode -> ASCII normaliser (ported from the app's
TypeScript normalizeMath + toComparable)."""
import pytest

from app.verification.normalize import normalize_math, to_comparable


@pytest.mark.parametrize(
    "raw, needle",
    [
        (r"\frac{1}{2}", "(1)/(2)"),
        (r"\sqrt{x}", "sqrt("),
        (r"\sqrt[3]{8}", "nthRoot"),
        (r"x^{2}", "x^(2)"),
        (r"a \cdot b", "*"),
        (r"a \times b", "*"),
        (r"6 \div 2", "/"),
        (r"\pi", "pi"),
        (r"\ln x", "log"),
        # unicode glyph palette
        ("x²", "x^2"),
        ("√16", "sqrt(16)"),
        ("√(x+1)", "sqrt(x+1)"),
        ("2×3", "2*3"),
        ("3·4", "3*4"),
        ("6÷2", "6/2"),
        ("−5", "-5"),          # U+2212 minus
        ("π", "pi"),
        ("θ", "theta"),
    ],
)
def test_normalize_contains(raw, needle):
    assert needle in normalize_math(raw)


def test_normalize_strips_units():
    assert "cm" not in normalize_math("9.5 cm")
    assert "9.5" in normalize_math("9.5 cm")


def test_to_comparable_lone_variable_takes_rhs():
    assert to_comparable("y = (x+1)^2") == "(x+1)^2"
    assert to_comparable("theta = 2.5") == "2.5"


def test_to_comparable_relational_brings_to_one_side():
    assert to_comparable("x^2 + y^2 = 1") == "(x^2 + y^2)-(1)"


def test_to_comparable_passthrough_when_no_equation():
    assert to_comparable("x^2 + 2x + 1") == "x^2 + 2x + 1"
