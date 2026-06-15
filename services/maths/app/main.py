"""IMAIA maths service (verification + diagnosis).

Hosts the truth-layer services wrapped behind the contracts in
context/INTERFACES.md (§2 VerificationService, §3 DiagnosisService):
  GET  /health                -> liveness
  POST /verify/answer         -> verifyAnswer
  POST /verify/step           -> verifyStep
  POST /diagnose/mark-working -> markWorking  (first-divergence + ECF)

This service is internal and NEVER calls a model or the network. Marking runs on
already-confirmed `studentStepsLatex` — the Mathpix OCR + confirmation flow is
upstream. `detail` on the verify responses is debugging data and must be stripped
before anything reaches a student (orchestrator, prompt 08).
"""

import warnings

from fastapi import FastAPI

# Benign FastAPI 0.115 + pydantic 2.13 interaction: request-body models with
# camelCase field aliases emit UnsupportedFieldAttributeWarning at first-request
# schema build, although the aliases work (proven by the camelCase API tests).
# Silence just this one so server logs stay clean.
warnings.filterwarnings("ignore", message=r"The '.*' attribute with value")

from .models import (  # noqa: E402
    MarkWorkingRequest, MarkWorkingResult,
    VerifyAnswerRequest, VerifyAnswerResult,
    VerifyStepRequest, VerifyStepResult,
)
from .diagnosis.service import mark_working  # noqa: E402
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


@app.post("/diagnose/mark-working", response_model=MarkWorkingResult)
def post_mark_working(req: MarkWorkingRequest) -> MarkWorkingResult:
    return mark_working(req)
