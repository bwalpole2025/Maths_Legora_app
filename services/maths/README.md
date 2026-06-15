# maths service

Python + FastAPI service that hosts the SymPy **verification** logic (prompt 03)
and the first-divergence / ECF **diagnosis** logic (prompt 04), wrapped behind the
contracts in [`context/INTERFACES.md`](../../context/INTERFACES.md).

This is the **truth layer**: it decides correctness with SymPy and **never calls
a model or the network**. The `detail` field on verify responses is internal
debugging data and must be stripped before anything reaches a student (the
orchestrator's job, prompt 08).

## Endpoints

| Method | Path                     | Contract       |
|--------|--------------------------|----------------|
| GET    | `/health`                | liveness       |
| POST   | `/verify/answer`         | `verifyAnswer` |
| POST   | `/verify/step`           | `verifyStep`   |
| POST   | `/diagnose/mark-working` | `markWorking`  |

`verifyAnswer` is an **equivalence-only wrap** of the existing SymPy verifier
(`app/verification/sympy_verifier.py`, vendored from the Wisest Maths app): it
treats `problemLatex` as the reference expression and checks the candidate is
mathematically equivalent. Problems that are not a single comparable expression
(solve / prove / word-problems) return `indeterminate` — never a false
`incorrect`.

`markWorking` (`app/diagnosis/`) marks a student's worked steps. There is no
reference solution in the contract, so it **reuses `verifyStep`** to check each
line against the one before it:

- The first line proven `incorrect` is the **first divergence**
  (`firstDivergenceIndex`).
- After a divergence, a later line that is value-preserving from the student's own
  (already-wrong) previous line is **error carried forward** (`carriedForward`),
  and earns credit when `allowEcf` is true (default).
- A `markScheme` (M / A / B marks, with `dependsOn` and follow-through `ft`) refines
  how marks are awarded; without one, each step is worth one mark.
- `indeterminate` lines (e.g. a relational "solving" leap the verifier can't
  certify) are never a divergence and never scored — the truth layer doesn't guess.

**OCR is upstream.** The Mathpix two-pass OCR + student-confirmation flow lives in
the Node app; this service only ever marks already-confirmed `studentStepsLatex`,
which keeps it free of any model or network dependency.

## Setup

```bash
# from the repo root
python3 -m venv services/maths/.venv
services/maths/.venv/bin/pip install --upgrade pip
services/maths/.venv/bin/pip install -r services/maths/requirements.txt
# dev / test extras
services/maths/.venv/bin/pip install pytest httpx
```

## Test

```bash
cd services/maths
.venv/bin/python -m pytest
```

## Run

```bash
cd services/maths
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Then:

```bash
curl -fsS localhost:8000/health
# {"status":"ok","service":"maths"}

curl -fsS -X POST localhost:8000/verify/answer -H 'content-type: application/json' \
  -d '{"problemLatex":"(x+1)^2","candidateAnswerLatex":"x^2+2x+1"}'
# {"status":"correct","canonicalAnswerLatex":"\\left(x + 1\\right)^{2}","method":"sympy",...}

curl -fsS -X POST localhost:8000/diagnose/mark-working -H 'content-type: application/json' \
  -d '{"problemLatex":"Simplify 3(2x + 1) + x","studentStepsLatex":["6x + 1 + x","7x + 1"]}'
# {"marksAwarded":1,"marksAvailable":2,"firstDivergenceIndex":0,
#  "perStep":[{"index":0,"status":"incorrect","isFirstDivergence":true,"carriedForward":false},
#             {"index":1,"status":"correct","isFirstDivergence":false,"carriedForward":true}],
#  "ecfApplied":true}
```
