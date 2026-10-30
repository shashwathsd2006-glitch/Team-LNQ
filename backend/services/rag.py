import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from config import get_settings
from services.vectorstore import query_chunks

logger = logging.getLogger("sovereign.rag")
router = APIRouter(prefix="/rag", tags=["rag"])


class SourceResult(BaseModel):
    document: str
    page: int
    snippet: str
    score: float


class RAGQueryRequest(BaseModel):
    query: str
    top_k: int | None = None


class RAGQueryResponse(BaseModel):
    answer: str
    sources: list[SourceResult]
    model: str


@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(req: RAGQueryRequest):
    settings = get_settings()
    top_k = req.top_k or settings.top_k

    results = query_chunks(req.query, top_k=top_k)

    sources: list[SourceResult] = []
    context_parts: list[str] = []

    if results and results["documents"] and results["documents"][0]:
        docs = results["documents"][0]
        metadatas = results["metadatas"][0] if results["metadatas"] else []
        distances = results["distances"][0] if results["distances"] else []

        for i, doc_text in enumerate(docs):
            meta = metadatas[i] if i < len(metadatas) else {}
            distance = distances[i] if i < len(distances) else 0.0
            score = round(1.0 - distance, 4) if distance <= 1.0 else round(1.0 / (1.0 + distance), 4)

            sources.append(SourceResult(
                document=meta.get("document_name", "unknown"),
                page=meta.get("page", 0),
                snippet=doc_text[:500],
                score=score,
            ))
            context_parts.append(
                f"[Source: {meta.get('document_name', 'unknown')}, Page {meta.get('page', 0)}]\n{doc_text}"
            )

    if not context_parts:
        context_text = "No relevant documents found in the index."
    else:
        context_text = "\n\n---\n\n".join(context_parts)

    system_prompt = (
        "You are SOVEREIGN AI, an industrial knowledge assistant.\n"
        "Answer the user's question using ONLY the supplied document context.\n"
        "Do not invent facts.\n"
        "If the supplied context does not contain enough information, clearly say "
        "that the information was not found in the indexed documents.\n"
        "Cite the document name and page number for claims whenever possible."
    )

    full_prompt = f"Document Context:\n\n{context_text}\n\n---\n\nQuestion: {req.query}"

    try:
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
            return RAGQueryResponse(
                answer=data.get("response", ""),
                sources=sources,
                model=data.get("model", settings.ollama_model),
            )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama is not reachable.")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e.response.status_code}")
    except Exception as e:
        logger.exception("RAG query failed")
        raise HTTPException(status_code=500, detail=str(e))
