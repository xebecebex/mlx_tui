from __future__ import annotations

import contextlib
import gc
import json
import sys
import traceback
from typing import Any

import mlx.core as mx
from mlx_lm import load, stream_generate


# stdout зарезервирован под JSON Lines.
# Диагностика Python-библиотек направляется в stderr.
PROTOCOL_OUT = sys.stdout

_cached_model: Any = None
_cached_tokenizer: Any = None
_cached_model_id: str | None = None


def emit(event: dict[str, Any]) -> None:
    PROTOCOL_OUT.write(
        json.dumps(event, ensure_ascii=False) + "\n"
    )
    PROTOCOL_OUT.flush()


def load_model(
    model_id: str,
    request_id: str,
) -> tuple[Any, Any]:
    global _cached_model
    global _cached_tokenizer
    global _cached_model_id

    if (
        _cached_model is not None
        and _cached_tokenizer is not None
        and _cached_model_id == model_id
    ):
        return _cached_model, _cached_tokenizer

    emit({
        "type": "status",
        "requestId": request_id,
        "message": f"Loading model: {model_id}",
    })

    # При переключении модели удаляем наши ссылки на предыдущую.
    if _cached_model_id is not None and _cached_model_id != model_id:
        _cached_model = None
        _cached_tokenizer = None
        _cached_model_id = None

        gc.collect()
        mx.clear_cache()

    # Не допускаем вывода библиотеки в JSON-протокол.
    with contextlib.redirect_stdout(sys.stderr):
        model, tokenizer = load(path_or_hf_repo=model_id)

    _cached_model = model
    _cached_tokenizer = tokenizer
    _cached_model_id = model_id

    emit({
        "type": "status",
        "requestId": request_id,
        "message": f"Model loaded: {model_id}",
    })

    return model, tokenizer


def process_request(request: dict[str, Any]) -> None:
    request_id = request.get("requestId")

    try:
        if request.get("type") != "generate":
            raise ValueError("Unsupported request type")

        model_id = str(request.get("modelId", "")).strip()
        if not model_id:
            raise ValueError("modelId cannot be empty")

        max_tokens = int(request.get("maxTokens", 256))
        if max_tokens < 1:
            raise ValueError("maxTokens must be at least 1")

        messages = request.get("messages")

        if not isinstance(messages, list) or not messages:
            raise ValueError(
                "At least one message is required"
            )

        for message in messages:
            if not isinstance(message, dict):
                raise ValueError("Each message must be an object")

            if not isinstance(message.get("content"), str):
                raise ValueError(
                    "Each message must contain string content"
                )

            if message.get("role") not in {
                "system",
                "user",
                "assistant",
            }:
                raise ValueError(
                    "Phase 1 supports system, user and assistant roles"
                )

        model, tokenizer = load_model(model_id, request_id)

        # Используем chat template самой выбранной модели.
        # По умолчанию MLX-LM токенизирует результат шаблона.
        prompt = tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
        )

        # Начинаем учитывать пик памяти для данного запуска.
        mx.reset_peak_memory()

        last_response = None

        with contextlib.redirect_stdout(sys.stderr):
            for response in stream_generate(
                model,
                tokenizer,
                prompt,
                max_tokens=max_tokens,
            ):
                last_response = response

                if response.text:
                    emit({
                        "type": "token",
                        "requestId": request_id,
                        "text": response.text,
                    })

        if last_response is None:
            raise RuntimeError(
                "MLX returned no generation response"
            )

        mx.synchronize()

        emit({
            "type": "done",
            "requestId": request_id,
            "usage": {
                "inputTokens": int(last_response.prompt_tokens),
                "outputTokens": int(
                    last_response.generation_tokens
                ),
                "source": "mlx",
            },
            "metrics": {
                "promptTokenPerSecond": float(
                    last_response.prompt_tps
                ),
                "generationTokenPerSecond": float(
                    last_response.generation_tps
                ),
                "mlxActiveMemoryBytes": int(
                    mx.get_active_memory()
                ),
                "mlxPeakMemoryBytes": int(
                    last_response.peak_memory * 1_000_000_000
                ),
                "processRssBytes": None,
            },
            "finishReason": last_response.finish_reason,
        })

    except Exception as exc:
        traceback.print_exc(file=sys.stderr)

        emit({
            "type": "error",
            "requestId": request_id,
            "message": f"{type(exc).__name__}: {exc}",
        })


def main() -> None:
    emit({"type": "ready"})

    for line in sys.stdin:
        line = line.strip()

        if not line:
            continue

        try:
            request = json.loads(line)

            if not isinstance(request, dict):
                raise ValueError(
                    "Request must be a JSON object"
                )

            process_request(request)

        except Exception as exc:
            emit({
                "type": "error",
                "requestId": None,
                "message": f"{type(exc).__name__}: {exc}",
            })


if __name__ == "__main__":
    main()