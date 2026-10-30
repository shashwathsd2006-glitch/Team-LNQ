"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  FileText, FileSpreadsheet, FileCode, ImageIcon,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, Loader2, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentStatusBadge } from "./document-status-badge";
import type { Document } from "@/data/mock";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ElementType> = {
  PDF: FileText, XLSX: FileSpreadsheet, CSV: FileCode, IMG: ImageIcon,
  DOCX: FileText, TXT: FileText,
};

interface DocumentTableProps {
  documents: Document[];
  onSelect: (doc: Document) => void;
  sortKey: "name" | "uploadedAt" | null;
  sortDir: "asc" | "desc";
  onSort: (key: "name" | "uploadedAt") => void;
  loading?: boolean;
  onDelete?: (docId: string) => void;
}

function SortIndicator({
  column,
  activeSortKey,
  activeSortDir,
}: {
  column: "name" | "uploadedAt";
  activeSortKey: "name" | "uploadedAt" | null;
  activeSortDir: "asc" | "desc";
}) {
  if (activeSortKey !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return activeSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

export function DocumentTable({
  documents,
  onSelect,
  sortKey,
  sortDir,
  onSort,
  loading,
  onDelete,
}: DocumentTableProps) {

  if (loading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="mt-3 text-sm text-subtle">Loading documents…</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2">
            <FileText className="h-6 w-6 text-subtle" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">No documents found</p>
          <p className="mt-1 text-xs text-subtle max-w-xs text-center">
            Try adjusting your search or filters, or upload new documents to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-subtle">
                <th className="px-4 py-3">Type</th>
                <th
                  className="cursor-pointer px-4 py-3 select-none"
                  onClick={() => onSort("name")}
                >
                  <span className="flex items-center gap-1">
                    Name <SortIndicator column="name" activeSortKey={sortKey} activeSortDir={sortDir} />
                  </span>
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Category</th>
                <th
                  className="cursor-pointer px-4 py-3 select-none"
                  onClick={() => onSort("uploadedAt")}
                >
                  <span className="flex items-center gap-1">
                    Uploaded <SortIndicator column="uploadedAt" activeSortKey={sortKey} activeSortDir={sortDir} />
                  </span>
                </th>
                <th className="px-4 py-3" />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, i) => {
                const Icon = typeIcons[doc.type] || FileText;
                return (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      "group cursor-pointer border-b border-border/50 transition-colors hover:bg-surface-2/60",
                      doc.status === "Failed" && "opacity-70"
                    )}
                    onClick={() => onSelect(doc)}
                  >
                    <td className="px-4 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-2">
                        <Icon className="h-4 w-4 text-accent" />
                      </span>
                    </td>
                    <td className="max-w-[300px] truncate px-4 py-3 font-medium text-foreground">
                      {doc.name}
                    </td>
                    <td className="px-4 py-3">
                      <DocumentStatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">{doc.size}</td>
                    <td className="px-4 py-3 text-muted">{doc.category}</td>
                    <td className="px-4 py-3 font-mono text-xs text-subtle">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {onDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                          className="rounded p-1 text-subtle transition-colors hover:bg-red-soft hover:text-red opacity-0 group-hover:opacity-100"
                          aria-label="Delete document"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
