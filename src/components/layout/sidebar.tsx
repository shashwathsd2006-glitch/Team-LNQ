"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, Bot, Database, FileText, ScanSearch, Network, Route,
  Shield, ScrollText, Settings, ChevronsLeft, ChevronsRight, Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const navItems = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/assistant", label: "AI Assistant", icon: Bot },
  { href: "/knowledge", label: "Knowledge Base", icon: Database },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/image-analysis", label: "Image Analysis", icon: ScanSearch },
  { href: "/agents", label: "AI Agents", icon: Network },
  { href: "/model-router", label: "Model Router", icon: Route },
  { href: "/security", label: "Security Center", icon: Shield },
  { href: "/activity", label: "Activity Logs", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-background-elevated transition-[width] duration-300",
        collapsed ? "w-[64px]" : "w-[248px]"
      )}
    >
      <div className={cn("flex items-center gap-3 border-b border-border px-4 py-4", collapsed && "justify-center px-0")}>
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft glow-accent">
          <Hexagon className="h-5 w-5 text-accent" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-[0.08em] text-foreground">SOVEREIGN</div>
            <div className="text-[10px] font-medium tracking-[0.18em] text-accent">AI WORKBENCH</div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 scrollbar-none">
        <div className={cn("px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle", collapsed && "text-center")}>
          {collapsed ? "···" : "Workspace"}
        </div>
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                active ? "text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-accent-soft border border-accent/20"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-accent" />}
              <Icon className={cn("relative z-10 h-4 w-4 shrink-0", active ? "text-accent" : "text-subtle group-hover:text-muted")} />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="relative z-10 overflow-hidden whitespace-nowrap text-sm"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && active && <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <div className={cn("mb-2 rounded-md border border-border/80 bg-surface px-3 py-2.5", collapsed && "px-0 py-2 text-center")}>
          <div className={cn("flex items-center gap-2 text-[10px] font-semibold tracking-wider", collapsed && "justify-center")}>
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full bg-green pulse-ring")} />
            {!collapsed && <span className="text-green">ON-PREMISE</span>}
          </div>
          {!collapsed && <div className="mt-1 text-[11px] leading-tight text-subtle">Isolated network · Data stays local</div>}
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : (<><ChevronsLeft className="h-4 w-4" /><span className="text-sm">Collapse</span></>)}
        </button>
      </div>
    </aside>
  );
}
