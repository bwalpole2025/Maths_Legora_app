# maths service

Python + FastAPI service that will host the SymPy **verification** and the
first-divergence / ECF **diagnosis** logic (prompts 03 and 04), wrapped behind
the contracts in [`context/INTERFACES.md`](../../context/INTERFACES.md).

In the scaffold (prompt 00) it exposes only `GET /health`.

## Setup

```bash
# from the repo root
python3 -m venv services/maths/.venv
services/maths/.venv/bin/pip install --upgrade pip
services/maths/.venv/bin/pip install -r services/maths/requirements.txt
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
```
