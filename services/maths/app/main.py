"""IMAIA maths service (verification + diagnosis).

Scaffold stub for prompt 00: exposes only a health check. The SymPy
verification and first-divergence/ECF diagnosis logic arrive in prompts 03 and
04, wrapped behind the contracts in context/INTERFACES.md.
"""

from fastapi import FastAPI

app = FastAPI(title="imaia-maths", version="0.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "maths"}
