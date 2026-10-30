"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search, FileText, Database, Plus, ChevronRight, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { listDocuments, ragQuery, type ApiDocument } from "@/lib/api";

export default function KnowledgePage() {
  const [query, setQuery] = React.useState("");
  const [docs, setDocs] = React.useState<ApiDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchResult, setSearchResult] = React.useState<{ answer: string; sources: { document: string; page: number; snippet: string; score: number }[] } | null>(null);
  const [searching, setSearching] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    listDocuments()
      .then((d) => setDocs(d.documents))
      .catch(() => toast({ title: "Error", description: "Failed to load documents", type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const indexedDocs = React.useMemo(() => docs.filter((d) => d.status === "Indexed"), [docs]);
  const totalChunks = React.useMemo(() => indexedDocs.reduce((sum, d) => sum + d.chunks, 0), [indexedDocs]);

  const handleSearch = React.useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await ragQuery(query);
      setSearchResult({ answer: res.answer, sources: res.sources });
    } catch {
      toast({ title: "Search failed", description: "Could not query the knowledge base.", type: "error" });
    } finally {
      setSearching(false);
    }
  }, [query, toast]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] px-6 py-6">
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Knowledge</span>
            <span className="h-px w-8 bg-accent/40" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Enterprise <span className="text-gradient">Knowledge Base</span></h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Searchable, verbatim-retrieved technical knowledge. Every answer cites the exact source document.
          </p>
        </div>

        <div className="relative mb-6 max-w-2xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="Search indexed documents, SOPs, procedures…"
            className="h-11 pl-9 pr-20"
          />
          <Button
            size="sm"
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
          >
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
          </Button>
        </div>

        {searchResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Search Result</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{searchResult.answer}</p>
              {searchResult.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {searchResult.sources.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-md border border-border bg-background-elevated px-2 py-1">
                      <FileText className="h-3 w-3 text-accent" />
                      <span className="text-[11px] text-muted">{s.document}</span>
                      <span className="font-mono text-[10px] text-subtle">p.{s.page}</span>
                      <span className="font-mono text-[10px] text-green">{(s.score * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card className="lg:row-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold"><Database className="mr-2 inline h-4 w-4 text-accent" /> Indexed Documents</CardTitle>
              <CardDescription className="text-xs">
                {loading ? "Loading…" : `${indexedDocs.length} documents · ${totalChunks} chunks`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                </div>
              )}
              {!loading && indexedDocs.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-xs text-subtle">No documents indexed yet.</p>
                  <Link href="/documents" className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                    <Plus className="h-3 w-3" /> Upload documents
                  </Link>
                </div>
              )}
              {indexedDocs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft">
                    <FileText className="h-4 w-4 text-accent" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground">{d.name}</div>
                    <div className="text-[10px] text-subtle">{d.pages} pages · {d.chunks} chunks</div>
                  </div>
                  <Badge variant="subtle">{d.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Knowledge Base Status</CardTitle>
              <CardDescription className="text-xs">Local RAG pipeline information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-[10px] text-subtle">Documents</p>
                  <p className="text-lg font-semibold text-foreground">{indexedDocs.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-[10px] text-subtle">Chunks</p>
                  <p className="text-lg font-semibold text-accent">{totalChunks}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-[10px] text-subtle">Embeddings</p>
                  <p className="text-lg font-semibold text-green">Local</p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-[10px] text-subtle">Vector DB</p>
                  <p className="text-lg font-semibold text-violet">ChromaDB</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-border/60 bg-surface p-3">
                <p className="text-xs text-muted">
                  All document processing, embeddings, and retrieval happen locally using
                  sentence-transformers (all-MiniLM-L6-v2) and ChromaDB. No data leaves the facility.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">All Documents</CardTitle>
                <CardDescription className="text-xs">Including non-indexed files</CardDescription>
              </div>
              <Link href="/documents" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-transparent text-foreground hover:bg-surface-2 h-8 px-3 text-xs font-medium transition-colors">
                Manage
              </Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                </div>
              )}
              {!loading && docs.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-subtle">No documents uploaded yet.</p>
              )}
              {docs.map((d, i) => (
                <motion.div key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="group flex items-center gap-3 rounded-md px-2.5 py-2.5 transition-colors hover:bg-surface-2">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border", d.status === "Indexed" ? "border-accent/30 bg-accent-soft" : "border-border bg-surface")}>
                    <FileText className={cn("h-4 w-4", d.status === "Indexed" ? "text-accent" : "text-subtle")} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground">{d.name}</div>
                    <div className="text-[10px] text-subtle">
                      {d.pages} pages · {d.chunks} chunks · {d.status}
                    </div>
                  </div>
                  <Badge variant={d.status === "Indexed" ? "success" : d.status === "Failed" ? "danger" : "subtle"}>
                    {d.status}
                  </Badge>
                  <ChevronRight className="h-3.5 w-3.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
