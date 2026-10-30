"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, AlertTriangle, FileText, FileSpreadsheet, FileCode, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.ms-excel": "XLSX",
  "text/csv": "CSV",
  "application/msword": "DOCX",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/plain": "TXT",
  "image/jpeg": "IMG",
  "image/png": "IMG",
  "image/tiff": "IMG",
};

const MAX_SIZE_MB = 50;

export interface PendingUpload {
  id: string;
  file: File;
  name: string;
  type: string;
  progress: number;
  status: "uploading" | "validating" | "queued" | "error";
  error?: string;
}

interface DocumentDropZoneProps {
  onUploadComplete: (doc: {
    name: string;
    type: string;
    size: string;
    raw?: File;
  }) => void;
  disabled?: boolean;
}

export function DocumentDropZone({ onUploadComplete, disabled }: DocumentDropZoneProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const [uploads, setUploads] = React.useState<PendingUpload[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES[file.type]) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["pdf", "xlsx", "xls", "csv", "docx", "doc", "txt", "jpg", "jpeg", "png", "tiff"].includes(ext)) {
        return `Unsupported file type. Allowed: PDF, XLSX, CSV, DOCX, TXT, JPG, PNG, TIFF.`;
      }
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File exceeds ${MAX_SIZE_MB} MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
    }
    return null;
  };

  const processFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const newUploads: PendingUpload[] = arr.map((file) => {
      const error = validateFile(file);
      return {
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        type: ALLOWED_TYPES[file.type] || file.name.split(".").pop()?.toUpperCase() || "FILE",
        progress: 0,
        status: error ? "error" : "uploading",
        error: error ?? undefined,
      };
    });

    setUploads((prev) => [...newUploads.filter((u) => u.status !== "error"), ...prev]);

    newUploads
      .filter((u) => u.status === "uploading")
      .forEach((u) => simulateProgress(u.id, u.name, u.type));
  };

  const simulateProgress = (id: string, name: string, type: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 12 + 3;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploads((prev) => {
          const upload = prev.find((u) => u.id === id);
          const updated = prev.map((u) => (u.id === id ? { ...u, progress: 100, status: "queued" as const } : u));
          if (upload) {
            setTimeout(() => {
              const sizeMB = (upload.file.size / (1024 * 1024)).toFixed(1);
              onUploadComplete({ name, type, size: `${sizeMB} MB`, raw: upload.file });
              setUploads((prev2) => prev2.filter((u) => u.id !== id));
            }, 600);
          }
          return updated;
        });
      } else {
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress: Math.min(progress, 99) } : u))
        );
      }
    }, 200);
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const typeIcon = (type: string) => {
    if (type === "PDF" || type === "DOCX" || type === "TXT") return FileText;
    if (type === "XLSX") return FileSpreadsheet;
    if (type === "CSV") return FileCode;
    return FileText;
  };

  return (
    <div className="mb-6">
      <Card
        className={cn(
          "border-dashed transition-all duration-200",
          dragOver
            ? "border-accent bg-accent-soft/30 shadow-[0_0_24px_-6px_var(--accent-glow)]"
            : "border-border hover:border-border/80",
          disabled && "pointer-events-none opacity-50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-10">
          <motion.div
            animate={dragOver ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Upload className={cn("mb-3 h-8 w-8", dragOver ? "text-accent" : "text-subtle")} />
          </motion.div>
          <p className="text-sm font-medium text-foreground">
            {dragOver ? "Release to upload" : "Drop files here or click to upload"}
          </p>
          <p className="mt-1 text-xs text-subtle">
            PDF, XLSX, CSV, DOCX, TXT, IMG — up to {MAX_SIZE_MB} MB per file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.txt,.jpg,.jpeg,.png,.tiff"
            className="hidden"
            onChange={onFileSelect}
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" /> Select files
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence>
        {uploads.map((u) => {
          const Icon = typeIcon(u.type);
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft">
                  <Icon className="h-4 w-4 text-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{u.name}</p>
                  {u.status === "error" && u.error ? (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-red">
                      <AlertTriangle className="h-3 w-3" /> {u.error}
                    </div>
                  ) : (
                    <>
                      <Progress value={u.progress} className="mt-1.5" />
                      <p className="mt-1 text-[11px] text-subtle">
                        {u.status === "queued" ? "Indexing\u2026" : `${Math.round(u.progress)}% uploading`}
                      </p>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => removeUpload(u.id)}
                  className="shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
