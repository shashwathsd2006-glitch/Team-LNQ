const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface ApiDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  pages: number;
  chunks: number;
  status: string;
  uploaded_at: string;
  indexed_at: string | null;
  fail_reason: string | null;
  path: string;
}

export interface UploadResult {
  id: string;
  name: string;
  pages: number;
  chunks: number;
  status: string;
  message: string;
}

export interface RAGSource {
  document: string;
  page: number;
  snippet: string;
  score: number;
}

export interface RAGResponse {
  answer: string;
  sources: RAGSource[];
  model: string;
}

export interface DirectResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration_ms: number | null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function listDocuments(): Promise<{ documents: ApiDocument[]; total: number }> {
  return apiFetch("/documents/");
}

export async function uploadDocument(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch("/documents/upload", { method: "POST", body: form });
}

export async function deleteDocument(docId: string): Promise<{ status: string; id: string }> {
  return apiFetch(`/documents/${docId}`, { method: "DELETE" });
}

export async function ragQuery(query: string): Promise<RAGResponse> {
  return apiFetch("/rag/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
}

export interface VisionAnalysis {
  detected_issue: string;
  severity: string;
  confidence: number;
  visual_evidence: string;
  recommended_action: string;
  model_used: string;
}

export async function analyzeImage(file: File): Promise<VisionAnalysis> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch("/vision/analyze", { method: "POST", body: form });
}

export interface EvidenceSource {
  document: string;
  page: number;
  snippet: string;
  score: number;
}

export interface MaintenanceAssessment {
  equipment: string;
  visual_finding: string;
  knowledge_findings: string;
  severity: string;
  assessment: string;
  recommended_action: string;
  evidence_sources: EvidenceSource[];
  models_used: string[];
  local_processing: boolean;
  caveats: string;
}

export async function runMaintenanceAssessment(
  file: File,
  question: string,
  equipment: string,
): Promise<MaintenanceAssessment> {
  const form = new FormData();
  form.append("file", file);
  form.append("question", question);
  form.append("equipment", equipment);
  return apiFetch("/agents/maintenance-assessment", { method: "POST", body: form });
}

export interface ClassifyResponse {
  request_type: string;
  selected_pipeline: string;
  model: string;
  reason: string;
  local_processing: boolean;
}

const DOCUMENT_KEYWORDS = [
  "maintenance", "manual", "sop", "procedure", "inspection", "schedule",
  "specification", "datasheet", "report", "certificate",
  "guideline", "standard", "regulation", "compliance", "safety",
  "corrosion", "calibration", "vibration", "lubrication",
  "recommended maintenance", "maintenance interval", "maintenance schedule",
  "preventive maintenance", "corrective maintenance",
  "inspection report", "inspection procedure",
  "replacement procedure", "repair procedure",
];

export function classifyRequest(
  question: string,
  file?: File | null,
): ClassifyResponse {
  const hasImage = file != null;
  if (hasImage) {
    return {
      request_type: "IMAGE",
      selected_pipeline: "VISION",
      model: "llava:latest",
      reason: "Image file attached — routed to LLaVA vision model",
      local_processing: true,
    };
  }
  if (!question.trim()) {
    return {
      request_type: "TEXT",
      selected_pipeline: "DIRECT_QWEN",
      model: "qwen3-coder:latest",
      reason: "No prompt provided — defaulting to direct generation",
      local_processing: true,
    };
  }
  const lower = question.toLowerCase();
  const matched = DOCUMENT_KEYWORDS.filter((kw) => lower.includes(kw));
  if (matched.length > 0) {
    return {
      request_type: "DOCUMENT",
      selected_pipeline: "RAG + QWEN",
      model: "qwen3-coder:latest",
      reason: `Query contains document-related terms (${matched.slice(0, 3).join(", ")}) — routed to RAG pipeline`,
      local_processing: true,
    };
  }
  return {
    request_type: "TEXT",
    selected_pipeline: "DIRECT_QWEN",
    model: "qwen3-coder:latest",
    reason: "No document keywords detected — routed to direct Qwen generation",
    local_processing: true,
  };
}

export interface ModelRouterSource {
  document: string;
  page: number;
  snippet: string;
  score: number;
}

export interface ModelRouterResponse {
  request_type: string;
  selected_route: string;
  selected_model: string;
  routing_reason: string;
  processing_path: string[];
  response: string;
  sources: ModelRouterSource[];
  local_processing: boolean;
  duration_ms: number;
}

export async function routeModelRequest(
  question: string,
  file?: File | null,
  equipment?: string,
): Promise<ModelRouterResponse> {
  const form = new FormData();
  if (file) form.append("file", file);
  form.append("question", question);
  if (equipment) form.append("equipment", equipment);
  return apiFetch("/model-router/route", { method: "POST", body: form });
}

export interface ModelStatus {
  name: string;
  status: string;
  size_bytes: number | null;
}

export interface SecurityStatus {
  network_mode: string;
  cloud_ai: string;
  external_ai_apis: string;
  data_processing: string;
  ollama_status: string;
  vision_model: string;
  vision_model_status: string;
  qwen_model: string;
  qwen_model_status: string;
  vector_db: string;
  vector_db_status: string;
  backend: string;
  backend_status: string;
  data_residency: string;
  audit_logging: string;
  embedding_model: string;
  embedding_model_available: boolean;
  cors_origins: string[];
  document_count: number;
  total_chunks: number;
  local_models: ModelStatus[];
  configured_model: string;
  timestamp: string;
}

export async function getSecurityStatus(): Promise<SecurityStatus> {
  return apiFetch("/security/status");
}

export async function directQuery(prompt: string): Promise<DirectResponse> {
  return apiFetch("/ollama/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      model: "qwen3-coder:latest",
      system: "You are SOVEREIGN AI, a private on-premise industrial AI assistant. Answer the user's question accurately and clearly.",
      stream: false,
    }),
  });
}
