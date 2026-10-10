"""Claude access for every stage, traced by neatlogs.

- One Anthropic client, wrapped by neatlogs so every model call is recorded.
- Structured outputs via ``messages.parse`` so each stage gets a validated object.
- One repair attempt when the output does not validate, then the stage fails.
- On overload or rate limits after the SDK's own retries, switch to a fallback model.
- Cost and tokens are added to the current job so the UI and evals can report them.
"""

from __future__ import annotations

import base64
import contextlib
import contextvars
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator, TypeVar

import anthropic
from pydantic import BaseModel, ValidationError

from .config import price_for, settings

T = TypeVar("T", bound=BaseModel)

_tracing = False
try:
    import neatlogs

    if os.getenv("NEATLOGS_API_KEY"):
        neatlogs.init(
            api_key=os.environ["NEATLOGS_API_KEY"],
            endpoint=settings.neatlogs_endpoint,
            workflow_name="niyam-rule-sync",
            tags=["niyam", "neathack"],
        )
        _tracing = True
except Exception as exc:  # tracing must never stop the agent
    print(f"[niyam] neatlogs tracing disabled: {exc}")

_client = anthropic.Anthropic(max_retries=3, timeout=600)
client = neatlogs.wrap(_client) if _tracing else _client


@dataclass
class Usage:
    cost_usd: float = 0.0
    tokens_in: int = 0
    tokens_out: int = 0
    calls: int = 0

    def add(self, model: str, usage: Any) -> None:
        p_in, p_out = price_for(model)
        tin = (usage.input_tokens or 0) + (getattr(usage, "cache_creation_input_tokens", 0) or 0) * 1.25
        cached = getattr(usage, "cache_read_input_tokens", 0) or 0
        self.tokens_in += int((usage.input_tokens or 0) + cached)
        self.tokens_out += int(usage.output_tokens or 0)
        self.cost_usd += (tin * p_in + cached * p_in * 0.1 + (usage.output_tokens or 0) * p_out) / 1_000_000
        self.calls += 1


current_usage: contextvars.ContextVar[Usage | None] = contextvars.ContextVar("usage", default=None)
chaos_used: contextvars.ContextVar[set[str] | None] = contextvars.ContextVar("chaos_used", default=None)


class StageOutputError(RuntimeError):
    pass


@contextlib.contextmanager
def span(name: str, kind: str = "AGENT") -> Iterator[Any]:
    """A neatlogs span, or a no-op when tracing is off."""
    if not _tracing:
        yield None
        return
    with neatlogs.trace(name, kind=kind) as s:
        yield s


def set_attr(s: Any, key: str, value: Any) -> None:
    if s is not None and hasattr(s, "set_attribute"):
        try:
            s.set_attribute(key, value if isinstance(value, (str, int, float, bool)) else str(value))
        except Exception:
            pass


def current_trace_id() -> str | None:
    if _tracing:
        try:
            carrier: dict[str, str] = {}
            if neatlogs.inject_trace_context(carrier) and carrier.get("traceparent"):
                return carrier["traceparent"].split("-")[1]
        except Exception:
            pass
    try:
        from opentelemetry import trace as ot

        ctx = ot.get_current_span().get_span_context()
        return format(ctx.trace_id, "032x") if ctx and ctx.trace_id else None
    except Exception:
        return None


def pdf_block(path: Path) -> dict[str, Any]:
    data = base64.standard_b64encode(Path(path).read_bytes()).decode("ascii")
    return {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": data}}


def image_block(png: bytes) -> dict[str, Any]:
    return {"type": "image", "source": {"type": "base64", "media_type": "image/png",
                                         "data": base64.standard_b64encode(png).decode("ascii")}}


def parse(*, model: str, system: str, content: list[dict[str, Any]] | str, output: type[T],
          max_tokens: int = 16000, effort: str | None = None, stage: str = "llm") -> T:
    """Call Claude and return a validated ``output`` instance."""
    messages: list[dict[str, Any]] = [{"role": "user", "content": content}]
    models = [model] + ([settings.model_fallback] if settings.model_fallback != model else [])
    last_error: Exception | None = None
    for m in models:
        for attempt in range(2):  # first try, then one repair attempt
            kwargs: dict[str, Any] = dict(model=m, max_tokens=max_tokens, system=system,
                                          messages=messages, output_format=output)
            if effort and not m.startswith("claude-haiku-4"):
                kwargs["output_config"] = {"effort": effort}
            try:
                resp = client.messages.parse(**kwargs)
            except (anthropic.RateLimitError, anthropic.InternalServerError, anthropic.APIConnectionError) as e:
                last_error = e
                _record_event("recovery.model_fallback", f"{m} unavailable ({type(e).__name__}); trying the fallback model")
                break
            except anthropic.APIStatusError as e:
                if e.status_code == 529:
                    last_error = e
                    _record_event("recovery.model_fallback", f"{m} overloaded; trying the fallback model")
                    break
                raise
            usage = current_usage.get()
            if usage is not None:
                usage.add(m, resp.usage)
            if resp.stop_reason == "refusal":
                raise StageOutputError(f"{stage}: the model declined the request")
            parsed = resp.parsed_output
            injected = _chaos_once("invalid_json") and attempt == 0
            if parsed is not None and not injected:
                return parsed
            text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
            reason = "injected test failure (chaos flag)" if injected else f"output did not match the schema (stop_reason={resp.stop_reason})"
            _record_event("recovery.json_repair", f"{stage}: {reason}; asking the model to repair it")
            messages = messages + [
                {"role": "assistant", "content": text or "(empty)"},
                {"role": "user", "content": f"Your previous answer could not be used: {reason}. Reply again with only the requested structure, complete and valid."},
            ]
            last_error = StageOutputError(reason)
    raise StageOutputError(f"{stage}: no valid output after repair and fallback ({last_error})")


# The orchestrator sets this so llm.py can write recovery events to the job timeline.
_event_sink: contextvars.ContextVar[Any] = contextvars.ContextVar("event_sink", default=None)


def _record_event(kind: str, message: str) -> None:
    sink = _event_sink.get()
    if sink:
        sink(kind, message)
    with span(kind, kind="CHAIN") as s:
        set_attr(s, "niyam.recovery", message)


def _chaos_once(name: str) -> bool:
    if name not in settings.chaos:
        return False
    used = chaos_used.get()
    if used is None or name in used:
        return False
    used.add(name)
    return True


def flush() -> None:
    if _tracing:
        try:
            neatlogs.flush()
        except Exception:
            pass


def shutdown() -> None:
    if _tracing:
        try:
            neatlogs.flush()
            neatlogs.shutdown()
        except Exception:
            pass


def tracing_enabled() -> bool:
    return _tracing


def now() -> float:
    return time.time()
