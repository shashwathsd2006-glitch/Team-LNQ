import logging
import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel
import httpx

from config import get_settings

logger = logging.getLogger("sovereign.security")
router = APIRouter(prefix="/security", tags=["security"])


class ModelStatus(BaseModel):
    name: str
    status: str
    size_bytes: int | None = None


class SecurityStatus(BaseModel):
    network_mode: str
    cloud_ai: str
    external_ai_apis: str
    data_processing: str
    ollama_status: str
    vision_model: str
    vision_model_status: str
    qwen_model: str
    qwen_model_status: str
    vector_db: str
    vector_db_status: str
    backend: str
    backend_status: str
    data_residency: str
    audit_logging: str
    embedding_model: str
    embedding_model_available: bool
    cors_origins: list[str]
    document_count: int
    total_chunks: int
    local_models: list[ModelStatus]
    configured_model: str
    timestamp: str


async def _check_ollama(base_url: str, timeout: int) -> tuple[str, list[dict]]:
    """Check Ollama status and list available models."""
    try:
        async with httpx.AsyncClient(timeout=min(timeout, 5)) as client:
            resp = await client.get(f"{base_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            models = data.get("models", [])
            model_list = [
                {
                    "name": m.get("name", "unknown"),
                    "status": "AVAILABLE",
                    "size_bytes": m.get("size"),
                }
                for m in models
            ]
            return "ONLINE", model_list
    except httpx.ConnectError:
        return "OFFLINE", []
    except Exception:
        return "UNKNOWN", []


def _check_vector_db(chroma_dir: str) -> str:
    """Check if ChromaDB directory exists and has data."""
    if not os.path.isdir(chroma_dir):
        return "NOT CONFIGURED"
    files = os.listdir(chroma_dir)
    if not files:
        return "INITIALIZED — EMPTY"
    return "ONLINE"


def _check_documents_dir(documents_dir: str) -> int:
    """Count files in the documents directory."""
    if not os.path.isdir(documents_dir):
        return 0
    total = 0
    for f in os.listdir(documents_dir):
        if os.path.isfile(os.path.join(documents_dir, f)):
            total += 1
    return total


def _check_embedding_model(model_name: str) -> bool:
    """Check if the sentence-transformers embedding model is loadable."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(model_name)
        del model
        return True
    except Exception:
        return False


def _get_chunk_count(chroma_dir: str) -> int:
    """Get total chunk count from ChromaDB if available."""
    try:
        import chromadb
        from chromadb.config import Settings as ChromaSettings
        if not os.path.isdir(chroma_dir):
            return 0
        client = chromadb.PersistentClient(
            path=chroma_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        collection = client.get_collection("industrial_documents")
        return collection.count()
    except Exception:
        return 0


@router.get("/status", response_model=SecurityStatus)
async def get_security_status():
    settings = get_settings()
    now = datetime.now(timezone.utc).isoformat()

    ollama_status, models = await _check_ollama(
        settings.ollama_base_url, settings.ollama_timeout
    )

    vision_status = "UNKNOWN"
    qwen_status = "UNKNOWN"
    for m in models:
        if m["name"] == settings.vision_model:
            vision_status = m["status"]
        if m["name"] == settings.ollama_model:
            qwen_status = m["status"]

    vector_db_status = _check_vector_db(settings.chroma_dir)
    doc_count = _check_documents_dir(settings.documents_dir)
    chunk_count = _get_chunk_count(settings.chroma_dir)
    embedding_available = _check_embedding_model(settings.embedding_model)

    return SecurityStatus(
        network_mode="ON-PREMISE",
        cloud_ai="NOT CONFIGURED",
        external_ai_apis="NONE CONFIGURED",
        data_processing="LOCAL",
        ollama_status=ollama_status,
        vision_model=settings.vision_model,
        vision_model_status=vision_status,
        qwen_model=settings.ollama_model,
        qwen_model_status=qwen_status,
        vector_db="ChromaDB",
        vector_db_status=vector_db_status,
        backend="FastAPI",
        backend_status="ONLINE",
        data_residency="LOCAL HOST",
        audit_logging="LIMITED - Activity logs displayed in UI, no persistent audit trail",
        embedding_model=settings.embedding_model,
        embedding_model_available=embedding_available,
        cors_origins=settings.cors_origins,
        document_count=doc_count,
        total_chunks=chunk_count,
        local_models=[
            ModelStatus(name=m["name"], status=m["status"], size_bytes=m["size_bytes"])
            for m in models
        ],
        configured_model=settings.ollama_model,
        timestamp=now,
    )
