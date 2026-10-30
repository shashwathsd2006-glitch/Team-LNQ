"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Upload, ImageIcon, AlertTriangle, CheckCircle, XCircle,
  ChevronRight, FileText, Loader2, Shield, Database, Server,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageTransition } from "@/components/layout/page-transition";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { runMaintenanceAssessment, type MaintenanceAssessment } from "@/lib/api";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  critical: { bg: "bg-red-soft/20 border-red/30", text: "text-red", icon: XCircle },
  high: { bg: "bg-amber-soft/20 border-amber/30", text: "text-amber", icon: AlertTriangle },
  medium: { bg: "bg-amber-soft/10 border-amber/20", text: "text-amber", icon: AlertTriangle },
  low: { bg: "bg-green-soft/10 border-green/20", text: "text-green", icon: CheckCircle },
  none: { bg: "bg-green-soft/10 border-green/20", text: "text-green", icon: CheckCircle },
};

const DEFAULT_QUESTION =
  "Assess the condition of Pump P-102 using the inspection image and maintenance manual. Identify the visible issue, explain the relevant maintenance guidance, and recommend the next inspection action.";

export default function AgentsPage() {
  const { toast } = useToast();

  const [equipment, setEquipment] = React.useState("Pump P-102");
  const [question, setQuestion] = React.useState(DEFAULT_QUESTION);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<MaintenanceAssessment | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleFile = React.useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (JPEG, PNG, WebP).", type: "error" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum image size is 20 MB.", type: "error" });
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [toast]);

  const onDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const runAssessment = React.useCallback(async () => {
    if (!selectedFile) {
      toast({ title: "Image required", description: "Please upload an inspection image before running the assessment.", type: "error" });
      return;
    }
    if (!question.trim()) {
      toast({ title: "Question required", description: "Please enter a question for the agent.", type: "error" });
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    toast({ title: "Assessment started", description: "Running LLaVA vision + RAG retrieval + Qwen reasoning...", type: "info" });

    try {
      const data = await runMaintenanceAssessment(selectedFile, question.trim(), equipment.trim() || "Unknown Equipment");
      setResult(data);
      toast({ title: "Assessment complete", description: `Severity: ${data.severity.toUpperCase()} — ${data.equipment}`, type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      toast({ title: "Assessment failed", description: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedFile, question, equipment, toast]);

  const reset = React.useCallback(() => {
    setResult(null);
    setError(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const sev = result ? SEVERITY_STYLES[result.severity] || SEVERITY_STYLES.medium : null;
  const SevIcon = sev?.icon ?? AlertTriangle;

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Agents</span>
            <span className="h-px w-8 bg-accent/40" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Maintenance <span className="text-gradient">Intelligence</span></h1>
          <p className="max-w-xl text-sm text-muted">
            Combines LLaVA visual inspection, document RAG retrieval, and Qwen reasoning — all on-premise.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          {/* LEFT: Input Panel */}
          <div className="space-y-4">
            {/* Equipment Name */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Equipment</CardTitle>
                <CardDescription className="text-xs">Name or identifier of the equipment under inspection</CardDescription>
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
              className={cn("relative overflow-hidden transition-colors", dragOver && "border-accent bg-accent-soft/20")}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <CardHeader className="flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold">Inspection Image</CardTitle>
                  <CardDescription className="text-xs">
                    {selectedFile ? selectedFile.name : "Drag & drop or click to upload"}
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
                    <img src={previewUrl} alt="Inspection image" className="h-full w-full object-contain" />
                  ) : (
                    <div
                      className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 text-muted"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-12 w-12 opacity-30" />
                      <p className="text-xs">Drop an industrial inspection image here</p>
                      <p className="text-[10px] opacity-50">JPEG, PNG, WebP — max 20 MB</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Question */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Engineer Question</CardTitle>
                <CardDescription className="text-xs">What should the agent investigate?</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  placeholder="Describe the inspection question..."
                  disabled={loading}
                />
              </CardContent>
            </Card>

            {/* Action */}
            <div className="flex gap-2">
              <Button onClick={runAssessment} disabled={loading || !selectedFile} className="flex-1">
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running assessment...</>
                ) : (
                  <><Zap className="h-3.5 w-3.5" /> Run Assessment</>
                )}
              </Button>
              {(result || error) && (
                <Button variant="outline" onClick={reset} disabled={loading}>
                  Reset
                </Button>
              )}
            </div>

            {/* Agent Pipeline Indicator */}
            {loading && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-accent/20 bg-accent-soft/10">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      <span className="font-medium text-foreground">Agent pipeline running</span>
                    </div>
                    <div className="mt-2 flex gap-2 text-[10px] text-subtle">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5">1. LLaVA Vision</span>
                      <span className="rounded bg-surface-2 px-1.5 py-0.5">2. RAG Retrieval</span>
                      <span className="rounded bg-surface-2 px-1.5 py-0.5">3. Qwen Assessment</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="border-red/30 bg-red-soft/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red">
                        <XCircle className="h-4 w-4" /> Assessment Error
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted">{error}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Results Panel */}
          <div className="space-y-4">
            {!result && !error && !loading && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted">
                  <Zap className="mb-3 h-8 w-8 opacity-30" />
                  <p className="text-xs">Upload an image and run an assessment</p>
                  <p className="text-[10px] opacity-50">Results will appear here</p>
                </CardContent>
              </Card>
            )}

            {/* Severity */}
            {result && sev && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={cn("border", sev.bg)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm font-semibold">
                      <span className={cn("flex items-center gap-2", sev.text)}>
                        <SevIcon className="h-4 w-4" /> Severity: {result.severity.toUpperCase()}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{result.equipment}</Badge>
                    </CardTitle>
                  </CardHeader>
                </Card>
              </motion.div>
            )}

            {/* Visual Finding */}
            {result && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <ImageIcon className="h-4 w-4 text-accent" /> Visual Finding
                    </CardTitle>
                    <CardDescription className="text-[10px]">From LLaVA vision model</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-muted">{result.visual_finding}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Knowledge Findings */}
            {result && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Database className="h-4 w-4 text-violet" /> Knowledge Findings
                    </CardTitle>
                    <CardDescription className="text-[10px]">From maintenance manual via RAG</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-muted">{result.knowledge_findings}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Combined Assessment */}
            {result && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Card className="border-accent/20 bg-accent-soft/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-accent">
                      <Zap className="h-4 w-4" /> Combined Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-muted">{result.assessment}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recommended Action */}
            {result && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card className="border-amber/20 bg-amber-soft/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber">
                      <Shield className="h-4 w-4" /> Recommended Action
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-muted">{result.recommended_action}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Evidence Sources */}
            {result && result.evidence_sources.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Evidence Sources</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {result.evidence_sources.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-background-elevated px-2.5 py-1.5">
                        <FileText className="h-3 w-3 shrink-0 text-accent" />
                        <span className="text-[11px] text-muted">{s.document}</span>
                        <span className="font-mono text-[10px] text-subtle">p.{s.page}</span>
                        <span className="ml-auto font-mono text-[10px] text-green">{(s.score * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Meta: Models Used + Local Processing + Caveats */}
            {result && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card>
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      <Server className="h-3.5 w-3.5 text-subtle" />
                      <span className="text-subtle">Models:</span>
                      <span className="font-mono text-muted">{result.models_used.join(", ")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <CheckCircle className="h-3.5 w-3.5 text-green" />
                      <span className="text-subtle">Local processing:</span>
                      <Badge variant="success" className="text-[9px]">{result.local_processing ? "Yes — 100%" : "No"}</Badge>
                    </div>
                    {result.caveats && (
                      <div className="mt-1 rounded-md bg-surface-2 px-2.5 py-2 text-[11px] text-muted">
                        <span className="font-medium text-foreground">Caveats: </span>{result.caveats}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
