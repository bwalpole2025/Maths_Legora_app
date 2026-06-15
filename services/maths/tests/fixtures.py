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
