"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Route, Upload, ImageIcon, Zap, ChevronRight, FileText,
  Loader2, CheckCircle, Server, Database, Clock, ArrowRight,
  Brain, Eye, MessageSquare, RotateCcw, Paperclip, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/layout/page-transition";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  classifyRequest,
  routeModelRequest,
  type ClassifyResponse,
  type ModelRouterResponse,
} from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

const PIPELINE_ICONS: Record<string, React.ElementType> = {
  VISION: Eye,
  "RAG + QWEN": Database,
  DIRECT_QWEN: MessageSquare,
};

const PIPELINE_COLORS: Record<string, string> = {
  VISION: "text-accent",
  "RAG + QWEN": "text-violet",
  DIRECT_QWEN: "text-green",
};

const DEMO_EXAMPLES = [
  {
    label: "General Text",
    question: "Explain the causes of centrifugal pump cavitation.",
    expectedType: "TEXT",
    expectedPipeline: "DIRECT_QWEN",
    expectedModel: "qwen3-coder:latest",
  },
  {
    label: "Document + RAG",
    question: "What is the recommended maintenance interval for Pump P-102?",
    expectedType: "DOCUMENT",
    expectedPipeline: "RAG + QWEN",
    expectedModel: "qwen3-coder:latest",
  },
  {
    label: "Image + Vision",
    question: "Identify the visible defect in this inspection image.",
    expectedType: "IMAGE",
    expectedPipeline: "VISION",
    expectedModel: "llava:latest",
    needsImage: true,
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function ModelRouterPage() {
  const { toast } = useToast();

  const [question, setQuestion] = React.useState("");
  const [equipment, setEquipment] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [classifyResult, setClassifyResult] = React.useState<ClassifyResponse | null>(null);
  const [result, setResult] = React.useState<ModelRouterResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<
    { question: string; type: string; pipeline: string; model: string; time: string }[]
  >([]);
  const [models, setModels] = React.useState<OllamaModel[]>([]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch(`${API_URL}/ollama/tags`)
      .then((r) => r.json())
      .then((d) => setModels(d.models || []))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = React.useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Please upload an image file.", type: "error" });
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum image size is 20 MB.", type: "error" });
        return;
      }
      setSelectedFile(file);
      setClassifyResult(null);
      setResult(null);
      setError(null);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [toast],
  );

  const onDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const runClassify = React.useCallback(() => {
    const q = question.trim();
    if (!q && !selectedFile) {
      toast({ title: "Input required", description: "Enter a question or attach an image.", type: "error" });
      return;
    }

    setClassifyResult(null);
    setResult(null);
    setError(null);

    try {
      const data = classifyRequest(q || "Analyze this image", selectedFile);
      setClassifyResult(data);
      setHistory((prev) => [
        {
          question: q.slice(0, 60) || "Image analysis",
          type: data.request_type,
          pipeline: data.selected_pipeline,
          model: data.model,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 10));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      toast({ title: "Classification failed", description: msg, type: "error" });
    }
  }, [question, selectedFile, toast]);

  const runRoute = React.useCallback(async () => {
    const q = question.trim();
    if (!q && !selectedFile) {
      toast({ title: "Input required", description: "Enter a question or attach an image.", type: "error" });
      return;
    }

    setLoading(true);
    setClassifyResult(null);
    setResult(null);
    setError(null);
    toast({ title: "Routing request", description: "Classifying and routing to optimal model...", type: "info" });

    try {
      const data = await routeModelRequest(q || "Analyze this image", selectedFile, equipment.trim() || undefined);
      setResult(data);
      setHistory((prev) => [
        {
          question: q.slice(0, 60) || "Image analysis",
          type: data.request_type,
          pipeline: data.selected_route,
          model: data.selected_model,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ].slice(0, 10));
      toast({
        title: "Request routed",
        description: `${data.request_type.toUpperCase()} → ${data.selected_model} (${Math.round(data.duration_ms)}ms)`,
        type: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      toast({ title: "Routing failed", description: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [question, selectedFile, equipment, toast]);

  const loadDemo = React.useCallback(
    (demo: (typeof DEMO_EXAMPLES)[number]) => {
      setQuestion(demo.question);
      setClassifyResult(null);
      setResult(null);
      setError(null);
      if (demo.needsImage && !selectedFile) {
        toast({ title: "Upload image", description: "Please attach an inspection image for this demo.", type: "info" });
      }
    },
    [selectedFile, toast],
  );

  const reset = React.useCallback(() => {
    setQuestion("");
    setEquipment("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setClassifyResult(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const displayData = result || classifyResult;
  const pipelineKey = result?.selected_route?.toUpperCase() || classifyResult?.selected_pipeline || "";
  const PipelineIcon = PIPELINE_ICONS[pipelineKey] ?? Zap;

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Router</span>
            <span className="h-px w-8 bg-accent/40" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Model <span className="text-gradient">Routing</span>
          </h1>
          <p className="max-w-xl text-sm text-muted">
            Deterministic request routing to the optimal specialist model — all on-premise.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          {/* LEFT: Input Panel */}
          <div className="space-y-4">
            {/* Request */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Request</CardTitle>
                <CardDescription className="text-xs">Enter your question or request</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      runClassify();
                    }
                  }}
                  rows={4}
                  placeholder="e.g. Explain the preventive maintenance schedule for Pump P-102"
                  disabled={loading}
                />
              </CardContent>
            </Card>

            {/* Equipment (optional) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Equipment (optional)</CardTitle>
                <CardDescription className="text-xs">Context for document/RAG queries</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  placeholder="e.g. Pump P-102"
                  disabled={loading}
                />
              </CardContent>
            </Card>

            {/* Image Upload */}
            <Card
              className={cn(
                "relative overflow-hidden transition-colors",
                dragOver && "border-accent bg-accent-soft/20",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <CardHeader className="flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Image (optional)</CardTitle>
                  <CardDescription className="text-xs">
                    {selectedFile ? selectedFile.name : "Attach an image for vision routing"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-border/60 bg-surface-2">
                  {previewUrl ? (
                    <div className="relative h-full w-full">
                      <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-subtle hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 text-muted"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-10 w-10 opacity-30" />
                      <p className="text-xs">Drop an image here or click to upload</p>
                      <p className="text-[10px] opacity-50">JPEG, PNG, WebP — max 20 MB</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={runClassify}
                disabled={loading || (!question.trim() && !selectedFile)}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Classifying...
                  </>
                ) : (
                  <>
                    <Route className="h-3.5 w-3.5" /> Classify Request
                  </>
                )}
              </Button>
              {(classifyResult || result) && (
                <Button
                  onClick={runRoute}
                  disabled={loading || (!question.trim() && !selectedFile)}
                  variant="default"
                  className="flex-1"
                >
                  <Zap className="h-3.5 w-3.5" /> Run Full Pipeline
                </Button>
              )}
              {(result || error || classifyResult) && (
                <Button variant="outline" onClick={reset} disabled={loading}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="border-red/30 bg-red-soft/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red">
                        <Zap className="h-4 w-4" /> Routing Error
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted">{error}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Demo Examples */}
            {!result && !classifyResult && !loading && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-subtle">
                    Quick Demo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {DEMO_EXAMPLES.map((demo) => (
                    <button
                      key={demo.label}
                      onClick={() => loadDemo(demo)}
                      className="flex w-full items-center gap-3 rounded-md border border-border/60 bg-surface-2/40 px-3 py-2.5 text-left transition-colors hover:border-accent/30 hover:bg-accent-soft/10"
                    >
                      <Zap className="h-3.5 w-3.5 shrink-0 text-accent" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">{demo.label}</p>
                        <p className="truncate text-[10px] text-subtle">{demo.question}</p>
                      </div>
                      <ChevronRight className="h-3 w-3 shrink-0 text-subtle" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Results Panel */}
          <div className="space-y-4">
            {!displayData && !error && !loading && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted">
                  <Route className="mb-3 h-8 w-8 opacity-30" />
                  <p className="text-xs">Enter a request or select a demo example</p>
                  <p className="text-[10px] opacity-50">Results will appear here</p>
                </CardContent>
              </Card>
            )}

            {/* Classification / Route Decision */}
            {displayData && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-accent/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm font-semibold">
                      <span className={cn("flex items-center gap-2", PIPELINE_COLORS[pipelineKey])}>
                        <PipelineIcon className="h-4 w-4" /> {pipelineKey}
                      </span>
                      <Badge variant="accent" className="text-[10px]">
                        {displayData.request_type}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      {"reason" in displayData ? displayData.reason : displayData.routing_reason}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-[11px]">
                      <Server className="h-3.5 w-3.5 text-subtle" />
                      <span className="text-subtle">Model:</span>
                      <span className="font-mono text-muted">
                        {result ? result.selected_model : classifyResult?.model}
                      </span>
                    </div>
                    {result && (
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <Clock className="h-3.5 w-3.5 text-subtle" />
                        <span className="text-subtle">Duration:</span>
                        <span className="font-mono text-muted">{Math.round(result.duration_ms)}ms</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Processing Path (full pipeline only) */}
            {result && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Processing Path</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {result.processing_path.map((step, i) => (
                        <React.Fragment key={i}>
                          <span className="rounded bg-surface-2 px-2 py-1 font-mono text-[10px] text-muted">
                            {step}
                          </span>
                          {i < result.processing_path.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-subtle" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Response (full pipeline only) */}
            {result && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                <Card className="border-accent/20 bg-accent-soft/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-accent">
                      <Brain className="h-4 w-4" /> Response
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap text-xs leading-relaxed text-muted">
                      {result.response}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Sources (full pipeline only) */}
            {result && result.sources.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Sources</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {result.sources.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md border border-border bg-background-elevated px-2.5 py-1.5"
                      >
                        <FileText className="h-3 w-3 shrink-0 text-accent" />
                        <span className="text-[11px] text-muted">{s.document}</span>
                        <span className="font-mono text-[10px] text-subtle">p.{s.page}</span>
                        <span className="ml-auto font-mono text-[10px] text-green">
                          {(s.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Meta: Local Processing */}
            {displayData && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card>
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      <CheckCircle className="h-3.5 w-3.5 text-green" />
                      <span className="text-subtle">Local processing:</span>
                      <Badge variant="success" className="text-[9px]">
                        {displayData.local_processing ? "Yes — 100%" : "No"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Route History */}
            {history.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-subtle">
                      Routing History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {history.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md px-3 py-2 bg-surface-2/40 text-xs"
                      >
                        <span className="min-w-0 flex-1 truncate text-foreground">{h.question}</span>
                        <ArrowRight className="mx-2 h-3 w-3 shrink-0 text-subtle" />
                        <Badge variant="outline" className="shrink-0 text-[9px]">
                          {h.pipeline}
                        </Badge>
                        <span className="ml-2 font-mono text-[10px] text-subtle">{h.type}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Active Models */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Active Models</CardTitle>
                <CardDescription className="text-[10px]">Local Ollama models</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {models.length === 0 ? (
                  <p className="py-2 text-center text-xs text-subtle">Loading...</p>
                ) : (
                  models.map((m) => {
                    const isHighlighted = (result?.selected_model || classifyResult?.model) === m.name;
                    return (
                      <div
                        key={m.name}
                        className={cn(
                          "rounded-lg border p-3 transition-colors",
                          isHighlighted ? "border-green/30 bg-green-soft/20" : "border-border/60 bg-surface-2/40",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-foreground">{m.name}</p>
                          <Badge variant={isHighlighted ? "success" : "subtle"} className="text-[9px]">
                            <span className={cn("h-1.5 w-1.5 rounded-full", isHighlighted ? "bg-green" : "bg-subtle")} />
                            Online
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[10px] text-subtle">{formatBytes(m.size)}</p>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Architecture Info */}
            {!displayData && !loading && (
              <Card className="border-accent/20 bg-accent-soft/10">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-2.5">
                    <Eye className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Image → LLaVA</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                        Image attached? Routed to llava:latest for visual analysis.
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-border/50" />
                  <div className="flex items-start gap-2.5">
                    <Database className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Document → RAG + Qwen</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                        Maintenance/manual keywords? ChromaDB retrieval + qwen3-coder reasoning.
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-border/50" />
                  <div className="flex items-start gap-2.5">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">General → Direct Qwen</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                        No match? Direct qwen3-coder reasoning with no retrieval.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
