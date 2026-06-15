"""Cross-language contract round-trip (prompt 02).

The maths-service pydantic models (app/models.py) and the TypeScript zod
contracts (packages/contracts) are two encodings of ONE frozen contract. This
test proves they agree by round-tripping the single shared fixture that the
TypeScript side also round-trips (packages/contracts/test/contracts.test.ts):

    fixture JSON (camelCase) -> model_validate -> model_dump(by_alias=True) == fixture JSON

Only the maths-served contracts (Verify* / MarkWorking* / MarkScheme) are
modelled in Python; the Retrieval and Tutor shapes belong to the Node services
and are intentionally absent here.
"""
import json
import pathlib

import pytest

from app.models import (
    MarkScheme,
    MarkSchemeMark,
    MarkWorkingRequest,
    MarkWorkingResult,
    PerStepStatus,
    VerifyAnswerRequest,
    VerifyAnswerResult,
    VerifyStepRequest,
    VerifyStepResult,
)

# tests/ -> services/maths -> services -> repo root
_REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
_FIXTURE = _REPO_ROOT / "packages" / "contracts" / "fixtures" / "contract-examples.json"

# fixture key -> the pydantic model that owns that shape.
_CASES = {
    "verifyAnswerRequest": VerifyAnswerRequest,
    "verifyAnswerResult": VerifyAnswerResult,
    "verifyStepRequest": VerifyStepRequest,
    "verifyStepResult": VerifyStepResult,
    "markSchemeMark": MarkSchemeMark,
    "markScheme": MarkScheme,
    "markWorkingRequest": MarkWorkingRequest,
    "perStepStatus": PerStepStatus,
    "markWorkingResult": MarkWorkingResult,
}


def _load_fixture() -> dict:
    assert _FIXTURE.is_file(), f"shared contract fixture missing: {_FIXTURE}"
    return json.loads(_FIXTURE.read_text(encoding="utf-8"))


@pytest.mark.parametrize("key,model", _CASES.items())
def test_model_roundtrips_shared_fixture(key, model):
    original = _load_fixture()[key]
    parsed = model.model_validate(original)
    dumped = parsed.model_dump(by_alias=True)
    assert dumped == original, f"{key} did not round-trip the shared camelCase fixture"


def test_every_maths_contract_has_a_fixture():
    """Guard: each modelled maths contract is exercised by the shared fixture."""
    data = _load_fixture()
    missing = [key for key in _CASES if key not in data]
    assert not missing, f"shared fixture is missing maths contract examples: {missing}"
