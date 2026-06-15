"""FastAPI surface tests + the standing 'no model calls ever' guard."""
import pathlib
import sys

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_APP_DIR = pathlib.Path(__file__).resolve().parents[1] / "app"

# Model SDKs and outbound-HTTP libs that must never appear in this truth-layer
# service. (fastapi/uvicorn are inbound servers and are fine; httpx only appears
# in tests via TestClient.)
_FORBIDDEN_IMPORTS = (
    "anthropic", "openai", "cohere", "google.generativeai", "replicate",
    "langchain", "litellm",
    "import requests", "import httpx", "urllib.request", "aiohttp",
)


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "service": "maths"}


def test_verify_answer_endpoint_correct_camelcase():
    r = client.post(
        "/verify/answer",
        json={"problemLatex": "(x+1)^2", "candidateAnswerLatex": "x^2 + 2x + 1"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "correct"
    assert body["method"] in ("sympy", "numeric")
    # response uses camelCase aliases, matching INTERFACES.md
    assert "canonicalAnswerLatex" in body
    assert "canonical_answer_latex" not in body


def test_verify_answer_endpoint_incorrect():
    r = client.post(
        "/verify/answer",
        json={"problemLatex": "(x+1)^2", "candidateAnswerLatex": "x^2 + 1"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "incorrect"


def test_verify_answer_endpoint_indeterminate():
    r = client.post(
        "/verify/answer",
        json={"problemLatex": "Solve x^2 = 4", "candidateAnswerLatex": "2"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "indeterminate"


def test_verify_step_endpoint():
    r = client.post(
        "/verify/step",
        json={
            "problemLatex": "Simplify 2x + 3x",
            "priorStepsLatex": ["2x + 3x"],
            "stepLatex": "5x",
        },
    )
    assert r.status_code == 200
    assert r.json()["status"] == "correct"


def test_no_model_or_network_imports_in_source():
    """Static guard: the model must never reach this service."""
    offenders = []
    for py in _APP_DIR.rglob("*.py"):
        text = py.read_text(encoding="utf-8").lower()
        for token in _FORBIDDEN_IMPORTS:
            if token in text:
                offenders.append((py.name, token))
    assert not offenders, f"forbidden imports found: {offenders}"


def test_no_model_sdk_loaded_at_runtime():
    """Importing the app must not pull in any model SDK."""
    for mod in ("anthropic", "openai", "cohere", "litellm", "langchain"):
        assert mod not in sys.modules, f"{mod} was imported by the maths service"
