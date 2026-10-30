"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition } from "@/components/layout/page-transition";
import { useToast } from "@/components/ui/toast";
import {
  DocumentDropZone,
  DocumentTable,
  DocumentFilters,
  DocumentPreviewDrawer,
  DocumentErrorState,
} from "@/components/documents";
import { type Document } from "@/data/mock";
import { listDocuments, uploadDocument, deleteDocument, type ApiDocument } from "@/lib/api";

function apiDocToDoc(d: ApiDocument): Document {
  const sizeMB = d.size / (1024 * 1024);
  return {
    id: d.id,
    name: d.name,
    type: "PDF",
    category: "Uncategorized",
    status: d.status as Document["status"],
    size: sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${(d.size / 1024).toFixed(0)} KB`,
    pages: d.pages,
    uploadedBy: "API User",
    uploadedAt: d.uploaded_at,
    department: "General",
    version: "v1.0",
    path: d.path,
    indexedAt: d.indexed_at ?? undefined,
    failReason: d.fail_reason ?? undefined,
  };
}

export default function DocumentsPage() {
  const { toast } = useToast();
  const [docs, setDocs] = React.useState<Document[]>([]);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("All");
  const [sortKey, setSortKey] = React.useState<"name" | "uploadedAt" | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [drawerDoc, setDrawerDoc] = React.useState<Document | null>(null);
  const [hasError, setHasError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const fetchDocs = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await listDocuments();
      setDocs(data.documents.map(apiDocToDoc));
    } catch {
      toast({ title: "Error", description: "Failed to load documents from backend.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleSort = (key: "name" | "uploadedAt") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = React.useMemo(() => {
    let list = [...docs];
    if (statusFilter !== "All") list = list.filter((d) => d.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.department.toLowerCase().includes(q)
      );
    }
    if (sortKey) {
      list.sort((a, b) => {
        const va = sortKey === "uploadedAt" ? a.uploadedAt : a.name;
        const vb = sortKey === "uploadedAt" ? b.uploadedAt : b.name;
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return list;
  }, [docs, search, statusFilter, sortKey, sortDir]);

  const stats = React.useMemo(() => {
    const indexed = docs.filter((d) => d.status === "Indexed").length;
    const processing = docs.filter((d) => d.status === "Processing").length;
    const failed = docs.filter((d) => d.status === "Failed").length;
    return { total: docs.length, indexed, processing, failed };
  }, [docs]);

  const handleUpload = async (file: { name: string; type: string; size: string; raw?: File }) => {
    if (!file.raw) return;
    try {
      const result = await uploadDocument(file.raw);
      toast({
        title: "Upload complete",
        description: `${result.name}: ${result.pages} pages, ${result.chunks} chunks — ${result.status}`,
        type: result.status === "Indexed" ? "success" : "warning",
      });
      fetchDocs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast({ title: "Upload failed", description: msg, type: "error" });
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteDocument(docId);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      toast({ title: "Document deleted", type: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast({ title: "Delete failed", description: msg, type: "error" });
    }
  };

  if (hasError) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-[1400px] px-6 py-6">
          <PageHeader />
          <DocumentErrorState onRetry={() => { setHasError(false); fetchDocs(); }} />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <PageHeader />

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Documents" value={String(stats.total)} color="text-foreground" />
          <StatCard label="Indexed" value={String(stats.indexed)} color="text-green" />
          <StatCard label="Processing" value={String(stats.processing)} color="text-accent" />
          <StatCard
            label="Failed"
            value={String(stats.failed)}
            color="text-red"
            icon={stats.failed > 0 ? AlertTriangle : undefined}
          />
        </div>

        <DocumentDropZone onUploadComplete={handleUpload} />

        <DocumentFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <DocumentTable
          documents={filtered}
          onSelect={setDrawerDoc}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          loading={loading}
          onDelete={handleDelete}
        />

        <DocumentPreviewDrawer document={drawerDoc} onClose={() => setDrawerDoc(null)} />
      </div>
    </PageTransition>
  );
}

function PageHeader() {
  return (
    <div className="mb-6 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          Documents
        </span>
        <span className="h-px w-8 bg-accent/40" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Document <span className="text-gradient">Management</span>
      </h1>
      <p className="max-w-xl text-sm text-muted">
        Upload, index and manage enterprise documents. All processing stays on-premise.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  icon?: React.ElementType;
}) {
  return (
    <Card className="border-border/80">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-subtle">{label}</p>
            <p className={`text-lg font-semibold ${color}`}>{value}</p>
          </div>
          {Icon && <Icon className="h-4 w-4 text-red" />}
        </div>
      </CardContent>
    </Card>
  );
}
