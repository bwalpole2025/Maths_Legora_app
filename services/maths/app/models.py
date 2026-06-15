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


# ---------------------------------------------------------------------------
# DiagnosisService contract (INTERFACES.md §3, DiagnosisService).
#
# `MarkScheme` is referenced by the contract but left undefined there; we define
# a faithful, board-style shape here (M/A/B marks with dependencies and
# follow-through). The *output* stays exactly the frozen `MarkWorkingResult`
# shape — the scheme only enriches how `marksAwarded` is computed.
# ---------------------------------------------------------------------------

# M = method, A = accuracy (typically depends on its method mark), B = independent.
MarkType = Literal["M", "A", "B"]


class MarkSchemeMark(BaseModel):
    model_config = _CONFIG

    id: str
    type: MarkType
    # Maximum marks this line is worth (usually 1).
    max_marks: Annotated[int, Field(alias="maxMarks")] = 1
    # Which student step (0-based) earns this mark. Required for a checkable mark.
    step_index: Annotated[Optional[int], Field(alias="stepIndex")] = None
    # Ids of marks that must be awarded first (e.g. an A mark depends on its M).
    depends_on: Annotated[Optional[List[str]], Field(alias="dependsOn")] = None
    # Follow-through: allow this mark to be earned under ECF (e.g. "A1ft").
    ft: bool = False
    description: Optional[str] = None


class MarkScheme(BaseModel):
    model_config = _CONFIG

    marks: List[MarkSchemeMark] = Field(default_factory=list)


class MarkWorkingRequest(BaseModel):
    model_config = _CONFIG

    problem_latex: Annotated[str, Field(alias="problemLatex")]
    # Direct, or produced by the Mathpix OCR + confirmation path UPSTREAM.
    student_steps_latex: Annotated[
        List[str], Field(alias="studentStepsLatex", default_factory=list)
    ]
    mark_scheme: Annotated[Optional[MarkScheme], Field(alias="markScheme")] = None
    allow_ecf: Annotated[bool, Field(alias="allowEcf")] = True


class PerStepStatus(BaseModel):
    model_config = _CONFIG

    index: int
    status: VerificationStatus
    is_first_divergence: Annotated[bool, Field(alias="isFirstDivergence")] = False
    # Accepted under ECF (a value-preserving manipulation of an already-wrong line).
    carried_forward: Annotated[bool, Field(alias="carriedForward")] = False


class MarkWorkingResult(BaseModel):
    model_config = _CONFIG

    marks_awarded: Annotated[int, Field(alias="marksAwarded")]
    marks_available: Annotated[int, Field(alias="marksAvailable")]
    first_divergence_index: Annotated[Optional[int], Field(alias="firstDivergenceIndex")] = None
    per_step: Annotated[List[PerStepStatus], Field(alias="perStep", default_factory=list)]
    ecf_applied: Annotated[bool, Field(alias="ecfApplied")] = False
