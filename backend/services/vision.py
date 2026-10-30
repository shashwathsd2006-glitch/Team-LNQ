import base64
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
import httpx

from config import get_settings

logger = logging.getLogger("sovereign.vision")
router = APIRouter(prefix="/vision", tags=["vision"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

INDUSTRIAL_SYSTEM_PROMPT = """\
You are an industrial inspection assistant embedded in a local on-premise system.
Your task is to analyze the uploaded image and identify any visible industrial defects, damage, anomalies, or safety concerns.

Rules:
1. ONLY describe what is visually present in the image. Do NOT assume, infer, or fabricate measurements, labels, or defects that cannot be clearly seen.
2. Distinguish between what you observe and what you infer. Use phrases like "appears to show", "visible in the image", "cannot be determined from this view".
3. If the image does not contain industrial equipment or is unclear, state that clearly.
4. Be specific about the location and type of any issue observed (e.g., corrosion on pipe surface, crack near weld joint, fluid leak at seal).

Respond ONLY with a JSON object matching this exact schema:
{
  "detected_issue": "string — concise description of what was found or 'No significant issues detected'",
  "severity": "one of: critical, high, medium, low, none",
  "confidence": "number between 0 and 100 representing visual confidence",
  "visual_evidence": "string — specific visual details that support the detection",
  "recommended_action": "string — suggested next step for this finding"
}

Do NOT include any text outside the JSON object. Do NOT use markdown code fences.
"""


class VisionResponse(BaseModel):
    detected_issue: str
    severity: str
    confidence: float
    visual_evidence: str
    recommended_action: str
    model_used: str


@router.post("/analyze", response_model=VisionResponse)
async def analyze_image(file: UploadFile = File(...)):
    settings = get_settings()

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{file.content_type}'. Allowed: JPEG, PNG, WebP, GIF.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > settings.max_image_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Image too large ({len(image_bytes)} bytes). Maximum: {settings.max_image_bytes} bytes.",
        )
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "model": settings.vision_model,
        "prompt": "Analyze this industrial inspection image. Identify any defects, damage, corrosion, leaks, or anomalies.",
        "system": INDUSTRIAL_SYSTEM_PROMPT,
        "images": [image_b64],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
            resp = await client.post(f"{settings.ollama_base_url}/api/generate", json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Ollama at {settings.ollama_base_url}. Is it running?",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e.response.status_code}")
    except Exception as e:
        logger.exception("Vision inference failed")
        raise HTTPException(status_code=500, detail=str(e))

    import json, re
    raw_response = data.get("response", "").strip()

    # Strip markdown code fences if present (LLaVA commonly wraps JSON in ```json ... ```)
    cleaned = re.sub(r'^```(?:json)?\s*', '', raw_response)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    cleaned = cleaned.strip()

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        result = {
            "detected_issue": raw_response[:500] if raw_response else "No response from model",
            "severity": "medium",
            "confidence": 0,
            "visual_evidence": raw_response,
            "recommended_action": "Review model output manually",
        }

    severity = result.get("severity", "medium").lower()
    if severity not in {"critical", "high", "medium", "low", "none"}:
        severity = "medium"

    confidence = result.get("confidence", 0)
    try:
        confidence = float(confidence)
        confidence = max(0.0, min(100.0, confidence))
    except (TypeError, ValueError):
        confidence = 0.0

    return VisionResponse(
        detected_issue=result.get("detected_issue", "No description"),
        severity=severity,
        confidence=confidence,
        visual_evidence=result.get("visual_evidence", ""),
        recommended_action=result.get("recommended_action", ""),
        model_used=data.get("model", settings.vision_model),
    )
