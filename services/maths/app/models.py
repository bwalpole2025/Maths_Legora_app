"""
Pydantic models for the VerificationService contract.

Transcribed faithfully from context/INTERFACES.md (section 2, VerificationService).
The shapes are frozen — do not change them without a contract version bump.

Python fields are snake_case; JSON is camelCase via explicit `Annotated` field
aliases, so this service round-trips exactly the same JSON as the TypeScript
`Verify*` types. `populate_by_name=True` lets callers construct models with
either name.
"""
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field
from typing_extensions import Annotated

VerificationStatus = Literal["correct", "incorrect", "indeterminate"]
VerifyMethod = Literal["sympy", "numeric", "cas"]

_CONFIG = ConfigDict(populate_by_name=True)


class VerifyAnswerRequest(BaseModel):
    model_config = _CONFIG

    problem_latex: Annotated[str, Field(alias="problemLatex")]
    candidate_answer_latex: Annotated[str, Field(alias="candidateAnswerLatex")]
    # assumptions, variable domains — see service for the supported subset.
    domain_hints: Annotated[Optional[Dict[str, Any]], Field(alias="domainHints")] = None


class VerifyAnswerResult(BaseModel):
    model_config = _CONFIG

    status: VerificationStatus
    # Present when the service can produce a canonical form.
    canonical_answer_latex: Annotated[Optional[str], Field(alias="canonicalAnswerLatex")] = None
    method: VerifyMethod
    # Internal only — debugging data, never shown to students.
    detail: Optional[str] = None


class VerifyStepRequest(BaseModel):
    model_config = _CONFIG

    problem_latex: Annotated[str, Field(alias="problemLatex")]
    prior_steps_latex: Annotated[List[str], Field(alias="priorStepsLatex", default_factory=list)]
    step_latex: Annotated[str, Field(alias="stepLatex")]


class VerifyStepResult(BaseModel):
    model_config = _CONFIG

    status: VerificationStatus
    # Internal only.
    detail: Optional[str] = None
