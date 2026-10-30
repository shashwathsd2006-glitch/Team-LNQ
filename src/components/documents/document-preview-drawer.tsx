"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, FolderOpen, Clock, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentStatusBadge } from "./document-status-badge";
import type { Document } from "@/data/mock";
import { cn } from "@/lib/utils";

interface DocumentPreviewDrawerProps {
  document: Document | null;
  onClose: () => void;
}

const typeColors: Record<string, string> = {
  PDF: "text-red",
  XLSX: "text-green",
  CSV: "text-amber",
  DOCX: "text-accent",
  IMG: "text-violet",
  TXT: "text-muted",
};

export function DocumentPreviewDrawer({ document: doc, onClose }: DocumentPreviewDrawerProps) {
  if (!doc) return null;

  return (
    <AnimatePresence>
      {doc && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border bg-surface shadow-2xl"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold text-foreground">Document Details</h2>
                <Button variant="ghost" size="iconSm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-5 p-5">
                  <div className="rounded-lg border border-border/60 bg-surface-2 p-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface",
                        )}
                      >
                        <FileText className={cn("h-5 w-5", typeColors[doc.type] || "text-accent")} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground break-all leading-snug">{doc.name}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline">{doc.type}</Badge>
                          <DocumentStatusBadge status={doc.status} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <DetailCell label="Size" value={doc.size} />
                    <DetailCell label="Pages" value={String(doc.pages)} />
                    <DetailCell label="Version" value={doc.version} />
                    <DetailCell label="Category" value={doc.category} />
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-3">
                    <DetailRow icon={User} label="Uploaded by" value={doc.uploadedBy} />
                    <DetailRow icon={FolderOpen} label="Department" value={doc.department} />
                    <DetailRow
                      icon={Clock}
                      label="Uploaded"
                      value={new Date(doc.uploadedAt).toLocaleString()}
                    />
                    {doc.indexedAt && (
                      <DetailRow
                        icon={CheckCircle2}
                        label="Indexed"
                        value={new Date(doc.indexedAt).toLocaleString()}
                        valueClass="text-green"
                      />
                    )}
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <p className="text-xs text-subtle mb-1">Storage Path</p>
                    <p className="rounded-md bg-surface-2 px-3 py-2 font-mono text-xs text-muted break-all">
                      {doc.path}
                    </p>
                  </div>

                  {doc.status === "Processing" && (
                    <div className="rounded-lg border border-accent/20 bg-accent-soft/40 p-4">
                      <p className="text-xs font-medium text-accent mb-2">Indexing in Progress</p>
                      <Progress value={62} />
                      <p className="mt-1.5 text-[11px] text-subtle">
                        Chunking, embedding and building vector index — 62% complete
                      </p>
                    </div>
                  )}

                  {doc.status === "Failed" && doc.failReason && (
                    <div className="rounded-lg border border-red/20 bg-red-soft/40 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-red" />
                        <p className="text-xs font-medium text-red">Indexing Failed</p>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{doc.failReason}</p>
                      <Button variant="outline" size="sm" className="mt-3">
                        Retry Indexing
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-subtle mb-1">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2">
        <Icon className="h-3.5 w-3.5 text-subtle" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-subtle">{label}</p>
        <p className={cn("text-sm text-foreground truncate", valueClass)}>{value}</p>
      </div>
    </div>
  );
}
