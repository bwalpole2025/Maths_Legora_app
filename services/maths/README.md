# maths service

Python + FastAPI service that hosts the SymPy **verification** logic (prompt 03)
and will host the first-divergence / ECF **diagnosis** logic (prompt 04), wrapped
behind the contracts in [`context/INTERFACES.md`](../../context/INTERFACES.md).

This is the **truth layer**: it decides correctness with SymPy and **never calls
a model**. The `detail` field on responses is internal debugging data and must be
stripped before anything reaches a student (the orchestrator's job, prompt 08).

## Endpoints

| Method | Path             | Contract        |
|--------|------------------|-----------------|
| GET    | `/health`        | liveness        |
| POST   | `/verify/answer` | `verifyAnswer`  |
| POST   | `/verify/step`   | `verifyStep`    |

`verifyAnswer` is an **equivalence-only wrap** of the existing SymPy verifier
(`app/verification/sympy_verifier.py`, vendored from the Wisest Maths app): it
treats `problemLatex` as the reference expression and checks the candidate is
mathematically equivalent. Problems that are not a single comparable expression
(solve / prove / word-problems) return `indeterminate` — never a false
`incorrect`.

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
```
