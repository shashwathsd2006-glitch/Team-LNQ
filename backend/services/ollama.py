import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from config import get_settings

logger = logging.getLogger("sovereign.ollama")
router = APIRouter(prefix="/ollama", tags=["ollama"])


class GenerateRequest(BaseModel):
    prompt: str
    model: str | None = None
    system: str | None = None
    stream: bool = False


class GenerateResponse(BaseModel):
    model: str
    response: str
    done: bool
    total_duration_ms: float | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str | None = None
    stream: bool = False


class ChatResponse(BaseModel):
    model: str
    message: ChatMessage
    done: bool


class ModelInfo(BaseModel):
    name: str
    modified_at: str
    size: int
    digest: str


class TagsResponse(BaseModel):
    models: list[ModelInfo]


@router.get("/tags", response_model=TagsResponse)
async def list_models():
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            models = [ModelInfo(**m) for m in data.get("models", [])]
            return TagsResponse(models=models)
    except httpx.ConnectError:
        logger.error("Cannot connect to Ollama at %s", settings.ollama_base_url)
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Ollama at {settings.ollama_base_url}. Is it running?",
        )
    except httpx.HTTPStatusError as e:
        logger.error("Ollama returned error: %s", e.response.status_code)
        raise HTTPException(status_code=502, detail=f"Ollama error: {e.response.status_code}")
    except Exception as e:
        logger.exception("Unexpected error talking to Ollama")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    settings = get_settings()
    model = req.model or settings.ollama_model
    payload: dict = {
        "model": model,
        "prompt": req.prompt,
        "stream": False,
    }
    if req.system:
        payload["system"] = req.system

    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
            resp = await client.post(f"{settings.ollama_base_url}/api/generate", json=payload)
            resp.raise_for_status()
            data = resp.json()
            total_ms = None
            if "total_duration" in data:
                total_ms = data["total_duration"] / 1_000_000
            return GenerateResponse(
                model=data.get("model", model),
                response=data.get("response", ""),
                done=data.get("done", True),
                total_duration_ms=total_ms,
            )
    except httpx.ConnectError:
        logger.error("Cannot connect to Ollama at %s", settings.ollama_base_url)
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Ollama at {settings.ollama_base_url}. Is it running?",
        )
    except httpx.HTTPStatusError as e:
        logger.error("Ollama returned error: %s", e.response.status_code)
        raise HTTPException(status_code=502, detail=f"Ollama error: {e.response.status_code}")
    except Exception as e:
        logger.exception("Unexpected error during generation")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    settings = get_settings()
    model = req.model or settings.ollama_model
    payload: dict = {
        "model": model,
        "messages": [{"role": m.role, "content": m.content} for m in req.messages],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
            resp = await client.post(f"{settings.ollama_base_url}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            msg = data.get("message", {})
            return ChatResponse(
                model=data.get("model", model),
                message=ChatMessage(role=msg.get("role", "assistant"), content=msg.get("content", "")),
                done=data.get("done", True),
            )
    except httpx.ConnectError:
        logger.error("Cannot connect to Ollama at %s", settings.ollama_base_url)
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Ollama at {settings.ollama_base_url}. Is it running?",
        )
    except httpx.HTTPStatusError as e:
        logger.error("Ollama returned error: %s", e.response.status_code)
        raise HTTPException(status_code=502, detail=f"Ollama error: {e.response.status_code}")
    except Exception as e:
        logger.exception("Unexpected error during chat")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def ollama_health():
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            resp.raise_for_status()
            return {"status": "ok", "ollama_url": settings.ollama_base_url}
    except Exception:
        return {"status": "unreachable", "ollama_url": settings.ollama_base_url}
