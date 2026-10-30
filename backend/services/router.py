import logging
import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
import httpx

from config import get_settings
from services.maintenance_agent import _run_vision, _run_rag

logger = logging.getLogger("sovereign.router")
router = APIRouter(prefix="/model-router", tags=["model-router"])

DOCUMENT_KEYWORDS = [
    "maintenance", "manual", "sop", "procedure", "inspection", "schedule",
    "specification", "datasheet", "report", "certificate",
    "guideline", "standard", "regulation", "compliance", "safety",
    "corrosion", "calibration", "vibration", "lubrication",
    "recommended maintenance", "maintenance interval", "maintenance schedule",
    "preventive maintenance", "corrective maintenance",
    "inspection report", "inspection procedure",
    "replacement procedure", "repair procedure",
]


class RouteSource(BaseModel):
    document: str
    page: int
    snippet: str
    score: float


class RouteResponse(BaseModel):
    request_type: str
    selected_route: str
    selected_model: str
    routing_reason: str
    processing_path: list[str]
    response: str
    sources: list[RouteSource]
    duration_ms: float
    local_processing: bool


def classify_request(prompt: str, has_image: bool) -> tuple[str, str, str, str]:
    if has_image:
        return "image", "vision", "llava:latest", "Image file attached — routed to LLaVA vision model"
    if not prompt:
        return "text", "direct", "qwen3-coder:latest", "No prompt provided — defaulting to direct generation"
    prompt_lower = prompt.lower()
    matched = [kw for kw in DOCUMENT_KEYWORDS if kw in prompt_lower]
    if matched:
        return (
            "document",
            "rag+qwen",
            "qwen3-coder:latest",
            f"Query contains document-related terms ({', '.join(matched[:3])}) — routed to RAG pipeline",
        )
    return "text", "direct", "qwen3-coder:latest", "No document keywords detected — routed to direct Qwen generation"


async def _process_image(file: UploadFile, settings) -> tuple[str, list[RouteSource], str, list[str]]:
    image_bytes = await file.read()
    content_type = file.content_type or "image/jpeg"
    visual = await _run_vision(image_bytes, content_type, settings)
    return visual.detected_issue, [], visual.model_used, ["ollama:llava", "parse_json", "format"]


async def _process_rag(prompt: str, equipment: str, settings) -> tuple[str, list[RouteSource], str, list[str]]:
    rag_query = f"{equipment} {prompt}".strip() if equipment else prompt
    rag_context, rag_sources = _run_rag(rag_query, settings)
    system_prompt = (
        "You are SOVEREIGN AI, an industrial knowledge assistant.\n"
        "Answer the user's question using ONLY the supplied document context.\n"
        "Do not invent facts.\n"
        "If the supplied context does not contain enough information, clearly say "
        "that the information was not found in the indexed documents.\n"
        "Cite the document name and page number for claims whenever possible."
    )
    full_prompt = f"Document Context:\n\n{rag_context}\n\n---\n\nQuestion: {prompt}"
    async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={
                "model": settings.ollama_model,
                "prompt": full_prompt,
                "system": system_prompt,
                "stream": False,
            },
        )
        resp.raise_for_status()
        data = resp.json()
    sources = [
        RouteSource(
            document=s.document,
            page=s.page,
            snippet=s.snippet[:300],
            score=s.score,
        )
        for s in rag_sources
    ]
    return data.get("response", ""), sources, data.get("model", settings.ollama_model), [
        "chromadb:query",
        "ollama:qwen",
        "format",
    ]


async def _process_direct(prompt: str, settings) -> tuple[str, list[RouteSource], str, list[str]]:
    system = (
        "You are SOVEREIGN AI, a private on-premise industrial AI assistant. "
        "Answer the user's question accurately and clearly."
    )
    async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={
                "model": settings.ollama_model,
                "prompt": prompt,
                "system": system,
                "stream": False,
            },
        )
        resp.raise_for_status()
        data = resp.json()
    return data.get("response", ""), [], data.get("model", settings.ollama_model), [
        "ollama:qwen",
        "format",
    ]


class ClassifyResponse(BaseModel):
    request_type: str
    selected_pipeline: str
    model: str
    reason: str
    local_processing: bool


@router.post("/classify", response_model=ClassifyResponse)
async def classify_only(
    question: str = Form(""),
    file: UploadFile = File(None),
):
    has_image = file is not None
    if not question.strip() and not has_image:
        raise HTTPException(status_code=400, detail="Provide a question, an image, or both.")
    request_type, selected_route, selected_model, routing_reason = classify_request(
        question.strip(), has_image
    )
    return ClassifyResponse(
        request_type=request_type.upper(),
        selected_pipeline=selected_route.upper().replace("+", " + "),
        model=selected_model,
        reason=routing_reason,
        local_processing=True,
    )


@router.post("/route", response_model=RouteResponse)
async def route_request(
    question: str = Form(""),
    file: UploadFile = File(None),
    equipment: str = Form(""),
):
    settings = get_settings()
    has_image = file is not None

    if not question.strip() and not has_image:
        raise HTTPException(status_code=400, detail="Provide a question, an image, or both.")

    start = time.time()
    request_type, selected_route, selected_model, routing_reason = classify_request(
        question.strip(), has_image
    )

    try:
        if request_type == "image":
            response_text, sources, model_used, steps = await _process_image(file, settings)
            selected_model = model_used
        elif request_type == "document":
            response_text, sources, model_used, steps = await _process_rag(
                question.strip(), equipment.strip(), settings
            )
            selected_model = model_used
        else:
            response_text, sources, model_used, steps = await _process_direct(
                question.strip() or "Hello", settings
            )
            selected_model = model_used
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama is not reachable.")
    except Exception as e:
        logger.exception("Routing failed")
        raise HTTPException(status_code=500, detail=str(e))

    duration_ms = round((time.time() - start) * 1000)

    return RouteResponse(
        request_type=request_type,
        selected_route=selected_route,
        selected_model=selected_model,
        routing_reason=routing_reason,
        processing_path=steps,
        response=response_text,
        sources=sources,
        duration_ms=duration_ms,
        local_processing=True,
    )
