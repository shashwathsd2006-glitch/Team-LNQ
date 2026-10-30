"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, FileText, Bot, Shield, LayoutGrid } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CommandItem {
  label: string;
  keyword: string;
  href: string;
  icon: React.ReactNode;
}

const searchItems: CommandItem[] = [
  { label: "Overview", keyword: "dashboard home overview", href: "/", icon: <LayoutGrid className="h-4 w-4" /> },
  { label: "AI Assistant", keyword: "chat ask assistant llm", href: "/assistant", icon: <Bot className="h-4 w-4" /> },
  { label: "Knowledge Base", keyword: "knowledge docs sops search", href: "/knowledge", icon: <FileText className="h-4 w-4" /> },
  { label: "Documents", keyword: "documents files upload", href: "/documents", icon: <FileText className="h-4 w-4" /> },
  { label: "Image Analysis", keyword: "vision image scan inspect", href: "/image-analysis", icon: <Search className="h-4 w-4" /> },
  { label: "AI Agents", keyword: "agents orchestration run", href: "/agents", icon: <Bot className="h-4 w-4" /> },
  { label: "Model Router", keyword: "models llm router routes", href: "/model-router", icon: <LayoutGrid className="h-4 w-4" /> },
  { label: "Security Center", keyword: "security privacy on-premise access", href: "/security", icon: <Shield className="h-4 w-4" /> },
  { label: "Activity Logs", keyword: "logs audit activity trail", href: "/activity", icon: <FileText className="h-4 w-4" /> },
  { label: "Settings", keyword: "settings config preferences", href: "/settings", icon: <LayoutGrid className="h-4 w-4" /> },
];

export function CommandBar() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filtered = query
    ? searchItems.filter((i) => i.keyword.toLowerCase().includes(query.toLowerCase()) || i.label.toLowerCase().includes(query.toLowerCase()))
    : searchItems;

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex h-9 w-full items-center gap-2 rounded-md border border-border bg-background-elevated px-3 text-sm text-subtle transition-colors hover:border-border hover:bg-surface-2 hover:text-muted"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search or navigate…</span>
        <kbd className="flex items-center gap-0.5 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-mono text-subtle">Ctrl K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] max-w-lg p-0">
          <DialogTitle className="sr-only">Command search</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 text-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search the workbench…"
              className="h-12 flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
            />
            <kbd className="text-[10px] font-mono text-subtle">ESC</kbd>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-subtle">No results for “{query}”</p>}
            {filtered.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.href)}
                className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted">{item.icon}</span>
                <span className="flex-1 text-foreground">{item.label}</span>
                <CornerDownLeft className="h-3.5 w-3.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[10px] text-subtle">
            <span className="flex items-center gap-1"><kbd className={cn("rounded border border-border bg-surface px-1")}>↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className={cn("rounded border border-border bg-surface px-1")}>↵</kbd> select</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
