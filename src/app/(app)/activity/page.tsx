"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown, Upload, MessageSquare,
  ScanLine, Bot, ShieldCheck, Server, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageTransition } from "@/components/layout/page-transition";
import { activityLogs, type ActivityLog } from "@/data/mock";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

const statusVariant: Record<string, "success" | "warning" | "danger"> = {
  Success: "success", Warning: "warning", Blocked: "danger", Failed: "danger",
};

const typeIcon: Record<string, React.ElementType> = {
  upload: Upload, query: MessageSquare, analysis: ScanLine,
  agent: Bot, security: ShieldCheck, system: Server,
};

export default function ActivityPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [typeFilter, setTypeFilter] = React.useState("All");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    let list = [...activityLogs];
    if (statusFilter !== "All") list = list.filter((l) => l.status === statusFilter);
    if (typeFilter !== "All") list = list.filter((l) => l.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        l.action.toLowerCase().includes(q) || l.resource.toLowerCase().includes(q) ||
        l.user.toLowerCase().includes(q) || l.model.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const order = ["Blocked", "Failed", "Warning", "Success"];
      const ia = order.indexOf(a.status);
      const ib = order.indexOf(b.status);
      return sortDir === "asc" ? ia - ib : ib - ia;
    });
    return list;
  }, [activityLogs, search, statusFilter, typeFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const effectivePage = Math.min(page, totalPages);
  const paged = filtered.slice((effectivePage - 1) * PAGE_SIZE, effectivePage * PAGE_SIZE);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Audit</span>
            <span className="h-px w-8 bg-accent/40" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity <span className="text-gradient">Trail</span></h1>
          <p className="max-w-xl text-sm text-muted">Complete enterprise audit log — every action, query and security event recorded.</p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actions, resources…" className="h-9 pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Success">Success</SelectItem>
              <SelectItem value="Warning">Warning</SelectItem>
              <SelectItem value="Blocked">Blocked</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="upload">Upload</SelectItem>
              <SelectItem value="query">Query</SelectItem>
              <SelectItem value="analysis">Analysis</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-subtle">
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">AI Model</th>
                    <th className="cursor-pointer select-none px-4 py-3" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>
                      <span className="flex items-center gap-1">Status
                        {sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((log, i) => {
                    const TypeIcon = typeIcon[log.type] || Server;
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border/50 transition-colors hover:bg-surface-2/60"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-subtle">{log.timestamp}</td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-foreground">{log.user}</div>
                          <div className="text-[10px] text-subtle">{log.role}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-3.5 w-3.5 text-subtle" />
                            <span className="text-xs text-foreground">{log.action}</span>
                          </div>
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted">{log.resource}</td>
                        <td className="px-4 py-3 text-xs text-muted">{log.model}</td>
                        <td className="px-4 py-3"><Badge variant={statusVariant[log.status]}>{log.status}</Badge></td>
                      </motion.tr>
                    );
                  })}
                  {paged.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-subtle">No activity logs match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-subtle">
            Showing {Math.min((effectivePage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(effectivePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={effectivePage <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={effectivePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
