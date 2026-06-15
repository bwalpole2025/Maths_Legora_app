"""IMAIA maths service (verification + diagnosis).

Hosts the VerificationService (truth layer, prompt 03) wrapped behind the
contracts in context/INTERFACES.md §2:
  GET  /health         -> liveness
  POST /verify/answer  -> verifyAnswer
  POST /verify/step    -> verifyStep

First-divergence / ECF diagnosis (prompt 04) arrives later. This service is
internal and NEVER calls a model. `detail` on the responses is debugging data
and must be stripped before anything reaches a student (orchestrator, prompt 08).
"""

import warnings

from fastapi import FastAPI

# Benign FastAPI 0.115 + pydantic 2.13 interaction: request-body models with
# camelCase field aliases emit UnsupportedFieldAttributeWarning at first-request
# schema build, although the aliases work (proven by the camelCase API tests).
# Silence just this one so server logs stay clean.
warnings.filterwarnings("ignore", message=r"The '.*' attribute with value")

from .models import (  # noqa: E402
    VerifyAnswerRequest, VerifyAnswerResult,
    VerifyStepRequest, VerifyStepResult,
)
from .verification.service import verify_answer, verify_step  # noqa: E402

app = FastAPI(title="imaia-maths", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "maths"}


@app.post("/verify/answer", response_model=VerifyAnswerResult)
def post_verify_answer(req: VerifyAnswerRequest) -> VerifyAnswerResult:
    return verify_answer(req)


@app.post("/verify/step", response_model=VerifyStepResult)
def post_verify_step(req: VerifyStepRequest) -> VerifyStepResult:
    return verify_step(req)
