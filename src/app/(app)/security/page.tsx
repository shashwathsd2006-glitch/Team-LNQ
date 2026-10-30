"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, CloudOff, Ban, Server, Database, Brain, Eye,
  ArrowRight, Lock, RefreshCw, Globe, HardDrive, Clock, Cpu,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { getSecurityStatus, type SecurityStatus } from "@/lib/api";

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "\u2014";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "ONLINE" || s === "AVAILABLE" || s.includes("ONLINE")) return "success";
  if (s === "OFFLINE" || s.includes("NOT CONFIGURED") || s.includes("EMPTY")) return "warning";
  if (s === "UNKNOWN") return "subtle";
  return "subtle";
}

export default function SecurityPage() {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<SecurityStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [lastChecked, setLastChecked] = React.useState<string | null>(null);

  const toastRef = React.useRef(toast);
  toastRef.current = toast;

  const fetchStatus = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSecurityStatus();
      setStatus(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      toastRef.current({ title: "Failed to load status", description: String(err), type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const postureItems = status
    ? [
        { label: "Network Mode", value: status.network_mode, icon: Globe, variant: "success" as const },
        { label: "Cloud AI", value: status.cloud_ai, icon: CloudOff, variant: "warning" as const },
        { label: "External AI APIs", value: status.external_ai_apis, icon: Ban, variant: "warning" as const },
        { label: "Data Processing", value: status.data_processing, icon: HardDrive, variant: "success" as const },
        { label: "Data Residency", value: status.data_residency, icon: Lock, variant: "success" as const },
        { label: "Audit Logging", value: status.audit_logging, icon: ShieldCheck, variant: "subtle" as const },
      ]
    : [];

  const serviceItems = status
    ? [
        { label: "Backend", value: status.backend, detail: status.backend_status, icon: Server },
        { label: "Ollama", value: "Local Runtime", detail: status.ollama_status, icon: Cpu },
        { label: "Qwen Model", value: status.qwen_model, detail: status.qwen_model_status, icon: Brain },
        { label: "Vision Model", value: status.vision_model, detail: status.vision_model_status, icon: Eye },
        { label: "Vector Database", value: status.vector_db, detail: status.vector_db_status, icon: Database },
        { label: "Embeddings", value: status.embedding_model, detail: status.embedding_model_available ? "AVAILABLE" : "NOT LOADED", icon: Database },
      ]
    : [];

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Security</span>
            <span className="h-px w-8 bg-accent/40" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Security <span className="text-gradient">Center</span>
              </h1>
              <p className="max-w-xl text-sm text-muted">
                System status and on-premise security posture — all checks are real-time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastChecked && (
                <span className="flex items-center gap-1.5 text-[10px] text-subtle">
                  <Clock className="h-3 w-3" /> Last checked: {lastChecked}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Security Posture Cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {postureItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                      <Icon className="h-4.5 w-4.5 text-muted" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-subtle">{item.label}</p>
                      <Badge variant={item.variant} className="mt-1">
                        {item.value}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {/* Service Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Service Status</CardTitle>
                <CardDescription className="text-xs">Real-time health of local services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading && !status ? (
                  <p className="py-4 text-center text-xs text-subtle">Loading status...</p>
                ) : (
                  serviceItems.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.04 }}
                        className="flex items-center justify-between rounded-md border border-border/60 bg-surface-2/40 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 text-subtle" />
                          <div>
                            <p className="text-xs font-medium text-foreground">{item.label}</p>
                            <p className="text-[10px] text-subtle">{item.value}</p>
                          </div>
                        </div>
                        <Badge variant={statusBadge(item.detail)} className="text-[9px]">
                          {item.detail}
                        </Badge>
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Architecture */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">System Architecture</CardTitle>
                <CardDescription className="text-xs">
                  Prototype design — all processing is local. This is not a formal security certification.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border/60 bg-surface-2/40 p-5">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-green">Local Data Path</p>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 items-center justify-center rounded-md bg-surface-3 px-2 text-[10px] font-semibold text-foreground">
                          Industrial Documents
                        </span>
                        <ArrowRight className="h-3 w-3 text-green" />
                        <span className="flex h-8 items-center justify-center rounded-md bg-green-soft px-2.5 text-[10px] font-semibold text-green">
                          Local RAG
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pl-1">
                        <ArrowRight className="h-3 w-3 text-green rotate-90" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 items-center justify-center rounded-md bg-green-soft px-2.5 text-[10px] font-semibold text-green">
                          ChromaDB
                        </span>
                        <ArrowRight className="h-3 w-3 text-green" />
                        <span className="flex h-8 items-center justify-center rounded-md bg-green-soft px-2.5 text-[10px] font-semibold text-green">
                          {status ? status.qwen_model : "Qwen"}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-green">
                        <Lock className="h-3 w-3" /> All processing on local infrastructure
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Inspection Images</p>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 items-center justify-center rounded-md bg-surface-3 px-2 text-[10px] font-semibold text-foreground">
                          Inspection Photos
                        </span>
                        <ArrowRight className="h-3 w-3 text-accent" />
                        <span className="flex h-8 items-center justify-center rounded-md bg-accent-soft px-2.5 text-[10px] font-semibold text-accent">
                          {status ? status.vision_model : "LLaVA"}
                        </span>
                      </div>
                      <div className="mt-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet">Application API</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="flex h-8 items-center justify-center rounded-md bg-surface-3 px-2 text-[10px] font-semibold text-foreground">
                            Frontend
                          </span>
                          <ArrowRight className="h-3 w-3 text-violet" />
                          <span className="flex h-8 items-center justify-center rounded-md bg-violet/10 px-2.5 text-[10px] font-semibold text-violet">
                            FastAPI
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
                        <Globe className="h-3 w-3" /> No cloud AI API required by this prototype
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Local Models */}
            {status && status.local_models.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Local Models</CardTitle>
                  <CardDescription className="text-[10px]">Ollama models currently available</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {status.local_models.map((m) => (
                    <div
                      key={m.name}
                      className="flex items-center justify-between rounded-md border border-border/60 bg-surface-2/40 px-3.5 py-2.5"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">{m.name}</p>
                        <p className="text-[10px] text-subtle">{formatBytes(m.size_bytes)}</p>
                      </div>
                      <Badge variant={statusBadge(m.status)} className="text-[9px]">
                        {m.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Knowledge Base Stats */}
            {status && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Knowledge Base</CardTitle>
                  <CardDescription className="text-[10px]">Verified vector database and document state</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border bg-surface p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{status.document_count}</p>
                      <p className="mt-1 text-[10px] text-subtle">Documents on disk</p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-3 text-center">
                      <p className="text-2xl font-bold text-accent">{status.total_chunks}</p>
                      <p className="mt-1 text-[10px] text-subtle">Vector chunks</p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-3 text-center">
                      <p className="text-2xl font-bold text-green">{status.embedding_model_available ? "Yes" : "No"}</p>
                      <p className="mt-1 text-[10px] text-subtle">Embeddings ready</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <Card className="border-accent/20 bg-accent-soft/10">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Prototype Architecture</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      This dashboard reports the actual configuration of the SOVEREIGN AI prototype.
                      It shows real service health checks and local system state — not marketing claims.
                    </p>
                  </div>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-start gap-2.5">
                  <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">No Cloud AI Required</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      The current prototype uses only local Ollama models. No external AI API keys are configured or needed.
                    </p>
                  </div>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-start gap-2.5">
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Local Vector Database</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      Document embeddings are stored in a local ChromaDB instance. No data is sent to external vector services.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-subtle">
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-[11px]">
                {status ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-subtle">Ollama URL</span>
                      <span className="font-mono text-muted">localhost:11434</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle">Configured Model</span>
                      <span className="font-mono text-muted">{status.qwen_model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle">Vision Model</span>
                      <span className="font-mono text-muted">{status.vision_model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle">Embedding Model</span>
                      <span className="font-mono text-muted">{status.embedding_model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle">Vector DB</span>
                      <span className="font-mono text-muted">{status.vector_db}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle">CORS Origins</span>
                      <span className="font-mono text-muted">{status.cors_origins.join(", ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle">Timestamp</span>
                      <span className="font-mono text-muted">{new Date(status.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </>
                ) : (
                  <p className="py-2 text-center text-subtle">Loading...</p>
                )}
              </CardContent>
            </Card>

            {/* Disclaimers */}
            <Card className="border-amber/20 bg-amber-soft/10">
              <CardContent className="space-y-2.5 p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Important Disclaimers</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      This prototype does not claim to be:
                    </p>
                    <ul className="mt-1.5 space-y-1 text-[11px] text-muted list-disc pl-4">
                      <li>100% secure or free of vulnerabilities</li>
                      <li>Air-gapped or physically isolated</li>
                      <li>Guaranteed to prevent all data leakage</li>
                      <li>Military-grade or formally certified</li>
                    </ul>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted">
                      The status shown reflects verifiable configuration only. Independent security audit is recommended before production deployment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
