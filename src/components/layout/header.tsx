"use client";

import * as React from "react";
import {
  ChevronDown, Bell, Check, LogOut, User, Settings, RotateCw, Factory, ShieldCheck,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CommandBar } from "@/components/layout/command-bar";
import { useToast } from "@/components/ui/toast";

export function Header() {
  const { toast } = useToast();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background-elevated/80 px-5 backdrop-blur">
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2 focus:outline-none">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-accent">
              <Factory className="h-4 w-4" />
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-medium leading-tight text-foreground">MRPL</span>
              <span className="block text-[10px] leading-tight text-subtle">Private Infrastructure</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-subtle" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            <DropdownMenuItem className="justify-between">
              <span className="flex items-center gap-2"><Factory className="h-4 w-4 text-accent" /> MRPL · Refinery & Petrochemicals</span>
              <Check className="h-4 w-4 text-accent" />
            </DropdownMenuItem>
            <DropdownMenuItem className="justify-between text-muted">
              <span className="flex items-center gap-2"><Factory className="h-4 w-4" /> Gujarat State Fertilizers</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="justify-between text-muted">
              <span className="flex items-center gap-2"><Factory className="h-4 w-4" /> NTPC Thermal Plant</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast({ title: "Organization scoped", description: "Viewing MRPL · Private Infrastructure", type: "info" })}>
              Manage organizations
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden h-6 w-px bg-border lg:block" />
        <div className="hidden items-center gap-2 lg:flex">
          <span className="flex items-center gap-1.5 rounded-full border border-green/20 bg-green-soft px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-green">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            SECURE
          </span>
          <Badge variant="subtle" className="font-mono text-[10px]">ON-PREMISE • SECURE</Badge>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xs">
        <CommandBar />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => toast({ title: "3 notifications", description: "Indexing complete · 1 document needs review", type: "info" })}
          className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background-elevated text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-2 focus:outline-none">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-accent-soft text-accent text-xs font-semibold">RK</AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <div className="text-xs font-medium leading-tight text-foreground">R. Krishnan</div>
              <div className="text-[10px] leading-tight text-subtle">Administrator</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-subtle" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
            <div className="px-2 pb-2">
              <div className="text-sm font-medium text-foreground">R. Krishnan</div>
              <div className="text-xs text-subtle">rk@mrpl-private.local</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem><User className="h-4 w-4" /> Profile</DropdownMenuItem>
            <DropdownMenuItem><Settings className="h-4 w-4" /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2 text-green"><ShieldCheck className="h-4 w-4" /> All systems secure</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem><LogOut className="h-4 w-4" /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => toast({ title: "Workbench synced", description: "Local state is up to date", type: "success" })}
          className="hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-background-elevated text-muted transition-colors hover:bg-surface-2 md:flex"
          aria-label="Sync"
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
