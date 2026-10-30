import base64
import json
import logging
import re

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
import httpx

from config import get_settings
from services.vectorstore import query_chunks

logger = logging.getLogger("sovereign.maintenance_agent")
router = APIRouter(prefix="/agents", tags=["agents"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

VISION_SYSTEM_PROMPT = """\
You are an industrial inspection assistant embedded in a local on-premise system.
Your task is to analyze the uploaded image and identify any visible industrial defects, damage, anomalies, or safety concerns.

Rules:
1. ONLY describe what is visually present in the image. Do NOT assume, infer, or fabricate measurements, labels, or defects that cannot be clearly seen.
2. Distinguish between what you observe and what you infer.
3. Be specific about the location and type of any issue observed.

Respond ONLY with a JSON object matching this exact schema:
{
  "detected_issue": "string — concise description of what was found or 'No significant issues detected'",
  "severity": "one of: critical, high, medium, low, none",
  "confidence": "number between 0 and 100",
  "visual_evidence": "string — specific visual details that support the detection",
  "recommended_action": "string — suggested next step"
}

Do NOT include any text outside the JSON object. Do NOT use markdown code fences.
"""

ASSESSMENT_SYSTEM_PROMPT = """\
You are SOVEREIGN AI Maintenance Intelligence Agent — a private on-premise industrial maintenance advisor.

You will receive two categories of evidence:
A. VISUAL EVIDENCE — from a local LLaVA vision model analyzing an inspection photograph.
B. DOCUMENT EVIDENCE — from the facility's indexed maintenance manuals retrieved via RAG.

Your task is to produce a maintenance assessment by:
1. Summarizing what the vision model visually observed (label as "Visual Evidence").
2. Summarizing what the maintenance manual states about the relevant equipment (label as "Knowledge Evidence").
3. Producing a COMBINED ASSESSMENT that synthesizes both sources.
4. Recommending a specific NEXT ACTION.

CRITICAL RULES:
- NEVER invent measurements, pressure limits, temperature readings, or engineering conclusions that are not supported by the provided evidence.
- NEVER state a severity level that is not directly supported by visual observation or manual guidance.
- Clearly distinguish:
  (A) What LLaVA visually observed
  (B) What the maintenance manual states
  (C) What YOU infer from combining A and B
- If the visual evidence and manual guidance conflict, note the discrepancy.
- Always state that qualified maintenance personnel must verify all findings before taking action.

Respond ONLY with a JSON object matching this exact schema:
{
  "equipment": "string — equipment name",
  "visual_finding": "string — summary of what LLaVA observed in the image",
  "knowledge_findings": "string — summary of relevant manual information",
  "severity": "one of: critical, high, medium, low, none",
  "assessment": "string — combined analysis of visual + document evidence",
  "recommended_action": "string — specific next step with clear justification",
  "evidence_sources": ["string — list of document names and pages used"],
  "caveats": "string — any limitations, unknowns, or items requiring human verification"
}

Do NOT include any text outside the JSON object. Do NOT use markdown code fences.
"""


class VisualResult(BaseModel):
    detected_issue: str
    severity: str
    confidence: float
    visual_evidence: str
    recommended_action: str
    model_used: str


class EvidenceSource(BaseModel):
    document: str
    page: int
    snippet: str
    score: float


class AssessmentResponse(BaseModel):
    equipment: str
    visual_finding: str
    knowledge_findings: str
    severity: str
    assessment: str
    recommended_action: str
    evidence_sources: list[EvidenceSource]
    models_used: list[str]
    local_processing: bool
    caveats: str


async def _run_vision(image_bytes: bytes, content_type: str, settings) -> VisualResult:
    """Run LLaVA vision analysis on image bytes."""
    if content_type not in ALLOWED_TYPES:
        raise ValueError(f"Unsupported image type: {content_type}")
    if len(image_bytes) > settings.max_image_bytes:
        raise ValueError("Image too large")
    if len(image_bytes) == 0:
        raise ValueError("Empty image")

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    payload = {
        "model": settings.vision_model,
        "prompt": "Analyze this industrial inspection image. Identify any defects, damage, corrosion, leaks, or anomalies.",
        "system": VISION_SYSTEM_PROMPT,
        "images": [image_b64],
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
        resp = await client.post(f"{settings.ollama_base_url}/api/generate", json=payload)
        resp.raise_for_status()
        data = resp.json()

    raw = data.get("response", "").strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', raw)
    cleaned = re.sub(r'\s*```$', '', cleaned).strip()

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        result = {
            "detected_issue": raw[:500] if raw else "No response",
            "severity": "medium",
            "confidence": 0,
            "visual_evidence": raw,
            "recommended_action": "Review manually",
        }

    severity = result.get("severity", "medium").lower()
    if severity not in {"critical", "high", "medium", "low", "none"}:
        severity = "medium"

    confidence = 0.0
    try:
        confidence = max(0.0, min(100.0, float(result.get("confidence", 0))))
    except (TypeError, ValueError):
        pass

    return VisualResult(
        detected_issue=result.get("detected_issue", "No description"),
        severity=severity,
        confidence=confidence,
        visual_evidence=result.get("visual_evidence", ""),
        recommended_action=result.get("recommended_action", ""),
        model_used=data.get("model", settings.vision_model),
    )


def _run_rag(query: str, settings) -> tuple[str, list[EvidenceSource]]:
    """Run RAG retrieval against ChromaDB. Returns (context_text, sources)."""
    results = query_chunks(query, top_k=settings.top_k)

    sources: list[EvidenceSource] = []
    context_parts: list[str] = []

    if results and results["documents"] and results["documents"][0]:
        docs = results["documents"][0]
        metadatas = results["metadatas"][0] if results["metadatas"] else []
        distances = results["distances"][0] if results["distances"] else []

        for i, doc_text in enumerate(docs):
            meta = metadatas[i] if i < len(metadatas) else {}
            distance = distances[i] if i < len(distances) else 0.0
            score = round(1.0 - distance, 4) if distance <= 1.0 else round(1.0 / (1.0 + distance), 4)

            sources.append(EvidenceSource(
                document=meta.get("document_name", "unknown"),
                page=meta.get("page", 0),
                snippet=doc_text[:500],
                score=score,
            ))
            context_parts.append(
                f"[Source: {meta.get('document_name', 'unknown')}, Page {meta.get('page', 0)}]\n{doc_text}"
            )

    context_text = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant documents found."
    return context_text, sources


async def _run_assessment(
    equipment: str,
    question: str,
    visual: VisualResult,
    rag_context: str,
    rag_sources: list[EvidenceSource],
    settings,
) -> dict:
    """Send combined evidence to Qwen for final assessment."""

    evidence_block = f"""VISUAL EVIDENCE (from LLaVA vision model):
- Detected issue: {visual.detected_issue}
- Severity: {visual.severity}
- Confidence: {visual.confidence}%
- Visual details: {visual.visual_evidence}
- Vision model recommendation: {visual.recommended_action}

DOCUMENT EVIDENCE (from maintenance manual via RAG):
{rag_context}
"""

    full_prompt = f"""Equipment: {equipment}

Engineer Question: {question}

{evidence_block}

Based on the visual evidence and document evidence above, produce a maintenance assessment for {equipment}.
Follow the system prompt rules exactly. Respond ONLY with the JSON object."""

    async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={
                "model": settings.ollama_model,
                "prompt": full_prompt,
                "system": ASSESSMENT_SYSTEM_PROMPT,
                "stream": False,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    raw = data.get("response", "").strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', raw)
    cleaned = re.sub(r'\s*```$', '', cleaned).strip()

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        result = {
            "equipment": equipment,
            "visual_finding": visual.detected_issue,
            "knowledge_findings": "Could not parse assessment response",
            "severity": visual.severity,
            "assessment": raw[:1000] if raw else "No response from model",
            "recommended_action": "Review the raw model output and verify manually",
            "evidence_sources": [],
            "caveats": "Model response could not be parsed as structured JSON. Review raw output.",
        }

    return result


@router.post("/maintenance-assessment", response_model=AssessmentResponse)
async def maintenance_assessment(
    file: UploadFile = File(...),
    question: str = Form(...),
    equipment: str = Form("Unknown Equipment"),
):
    settings = get_settings()
    models_used: list[str] = []

    # Step 1: Vision analysis
    try:
        image_bytes = await file.read()
        visual = await _run_vision(image_bytes, file.content_type or "image/jpeg", settings)
        models_used.append(visual.model_used)
    except httpx.ReadTimeout:
        logger.error("Vision analysis timed out waiting for LLaVA")
        raise HTTPException(
            status_code=504,
            detail="Vision analysis timed out while waiting for local LLaVA inference. "
                   "The model may be loading or the hardware is under heavy load. Please try again.",
        )
    except Exception as e:
        logger.exception("Vision step failed")
        raise HTTPException(status_code=500, detail=f"Vision analysis failed: {type(e).__name__}")

    # Step 2: RAG retrieval
    try:
        rag_context, rag_sources = _run_rag(f"{equipment} {question}", settings)
        models_used.append(settings.ollama_model)
    except Exception as e:
        logger.exception("RAG step failed")
        raise HTTPException(status_code=500, detail=f"RAG retrieval failed: {type(e).__name__}")

    # Step 3: Combined assessment via Qwen
    try:
        assessment = await _run_assessment(equipment, question, visual, rag_context, rag_sources, settings)
    except httpx.ReadTimeout:
        logger.error("Assessment generation timed out waiting for Qwen")
        raise HTTPException(
            status_code=504,
            detail="Assessment reasoning timed out while waiting for local Qwen inference. "
                   "The model may be loading or the hardware is under heavy load. Please try again.",
        )
    except Exception as e:
        logger.exception("Assessment step failed")
        raise HTTPException(status_code=500, detail=f"Assessment generation failed: {type(e).__name__}")

    # Deduplicate models
    unique_models = list(dict.fromkeys(models_used))

    return AssessmentResponse(
        equipment=assessment.get("equipment", equipment),
        visual_finding=assessment.get("visual_finding", visual.detected_issue),
        knowledge_findings=assessment.get("knowledge_findings", ""),
        severity=assessment.get("severity", visual.severity),
        assessment=assessment.get("assessment", ""),
        recommended_action=assessment.get("recommended_action", ""),
        evidence_sources=rag_sources,
        models_used=unique_models,
        local_processing=True,
        caveats=assessment.get("caveats", ""),
    )
