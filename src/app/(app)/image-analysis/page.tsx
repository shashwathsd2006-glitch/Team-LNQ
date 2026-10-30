"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crosshair, Upload, ShieldAlert, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, ImageIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { analyzeImage, type VisionAnalysis } from "@/lib/api";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  critical: { bg: "bg-red-soft/20 border-red/30", text: "text-red", icon: XCircle },
  high: { bg: "bg-amber-soft/20 border-amber/30", text: "text-amber", icon: AlertTriangle },
  medium: { bg: "bg-amber-soft/10 border-amber/20", text: "text-amber", icon: AlertTriangle },
  low: { bg: "bg-green-soft/10 border-green/20", text: "text-green", icon: CheckCircle },
  none: { bg: "bg-green-soft/10 border-green/20", text: "text-green", icon: CheckCircle },
};

export default function ImageAnalysisPage() {
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<VisionAnalysis | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  React.useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const runAnalysis = React.useCallback(async () => {
    if (!selectedFile || analyzing) return;
    setAnalyzing(true);
    setResult(null);
    setError(null);
    toast({ title: "Analysis started", description: "Running LLaVA vision model locally...", type: "info" });

    try {
      const data = await analyzeImage(selectedFile);
      setResult(data);
      toast({ title: "Analysis complete", description: `Issue detected: ${data.detected_issue.slice(0, 60)}...`, type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      toast({ title: "Analysis failed", description: msg, type: "error" });
    } finally {
      setAnalyzing(false);
    }
  }, [selectedFile, analyzing, toast]);

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

  const sev = result ? SEVERITY_STYLES[result.severity] || SEVERITY_STYLES.medium : null;
  const SevIcon = sev?.icon ?? AlertTriangle;

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Vision</span>
            <span className="h-px w-8 bg-accent/40" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Image <span className="text-gradient">Analysis</span></h1>
          <p className="max-w-xl text-sm text-muted">
            Multimodal inspection analysis — powered by local LLaVA vision model, zero cloud dependency.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* Image Panel */}
          <Card
            className={cn(
              "relative overflow-hidden transition-colors",
              dragOver && "border-accent bg-accent-soft/20",
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Inspection Image</CardTitle>
                <CardDescription className="text-xs">
                  {selectedFile ? selectedFile.name : "Drag & drop or click to upload"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileInput}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={analyzing}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runAnalysis}
                  disabled={!selectedFile || analyzing}
                >
                  <Crosshair className="h-3.5 w-3.5" /> Run analysis
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-border/60 bg-surface-2">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Inspection image"
                    className="h-full w-full object-contain"
                  />
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

                <AnimatePresence>
                  {analyzing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      >
                        <Crosshair className="h-12 w-12 text-accent" />
                      </motion.div>
                      <p className="absolute mt-20 text-xs font-medium text-accent">Analyzing with LLaVA...</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <div className="space-y-4">
            {/* Error State */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="border-red/30 bg-red-soft/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red">
                        <XCircle className="h-4 w-4" /> Analysis Error
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted">{error}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Severity Badge */}
            {result && sev && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={cn("border", sev.bg)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm font-semibold">
                      <span className={cn("flex items-center gap-2", sev.text)}>
                        <SevIcon className="h-4 w-4" /> Severity: {result.severity.toUpperCase()}
                      </span>
                      <Badge variant="outline" className={cn("text-xs font-mono", sev.text)}>
                        {result.confidence.toFixed(0)}% confidence
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                </Card>
              </motion.div>
            )}

            {/* Detected Issue */}
            {result && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Detected Issue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-muted">{result.detected_issue}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Visual Evidence */}
            {result && (
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Visual Evidence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-muted">{result.visual_evidence}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recommended Action */}
            {result && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-amber/20 bg-amber-soft/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber">
                      <ShieldAlert className="h-4 w-4" /> Recommended Action
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs leading-relaxed text-muted">{result.recommended_action}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted">
                      <span className="font-mono">model: {result.model_used}</span>
                      <span className="h-px flex-1 bg-border" />
                      <span className="font-mono">100% local inference</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Empty State */}
            {!result && !error && !analyzing && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted">
                  <ImageIcon className="mb-3 h-8 w-8 opacity-30" />
                  <p className="text-xs">Upload an image to begin analysis</p>
                  <p className="text-[10px] opacity-50">Results will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
