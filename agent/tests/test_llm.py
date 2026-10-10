"""Recovery when a model's structured answer is cut off (no network: a fake client)."""

from types import SimpleNamespace

from pydantic import BaseModel, ValidationError

from niyam import llm


class Out(BaseModel):
    value: int


def _validation_error() -> ValidationError:
    try:
        Out.model_validate_json('{"value": 1')  # truncated JSON, as returned when max_tokens runs out
    except ValidationError as e:
        return e
    raise AssertionError("expected a validation error")


def test_truncated_json_is_retried_with_more_room(monkeypatch):
    calls = []

    def fake_parse(**kwargs):
        calls.append(kwargs)
        if len(calls) == 1:
            raise _validation_error()
        usage = SimpleNamespace(input_tokens=10, output_tokens=5, cache_creation_input_tokens=0, cache_read_input_tokens=0)
        return SimpleNamespace(parsed_output=Out(value=7), stop_reason="end_turn", usage=usage, content=[])

    monkeypatch.setattr(llm, "client", SimpleNamespace(messages=SimpleNamespace(parse=fake_parse)))
    out = llm.parse(model="claude-haiku-5-5", system="s", content="c", output=Out, max_tokens=16000, effort="high", stage="t")
    assert out.value == 7
    assert calls[1]["max_tokens"] == 21000
    assert calls[1]["output_config"] == {"effort": "medium"}
