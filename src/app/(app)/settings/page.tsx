"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Cpu, Shield, Users, HardDrive, Settings, Palette,
  CloudOff, Lock, ScrollText, UserCog, AlertTriangle,
  Download, Sun, Moon, Monitor,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { PageTransition } from "@/components/layout/page-transition";
import { useToast } from "@/components/ui/toast";
import { accessRoles } from "@/data/settings";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "models", label: "AI Models", icon: Cpu },
  { id: "security", label: "Security", icon: Shield },
  { id: "users", label: "Users & Roles", icon: Users },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "system", label: "System", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
];

const installedModels = [
  { name: "Qwen2.5-32B", family: "Qwen Reasoning", enabled: true },
  { name: "Qwen2-VL-7B", family: "Qwen Vision", enabled: true },
  { name: "Llama-3.1-8B", family: "Llama General", enabled: true },
  { name: "CodeLLaMA-13B", family: "Code Model", enabled: true },
  { name: "Mistral-7B", family: "Mistral General", enabled: false },
];

const systemInfo = [
  { label: "Version", value: "v2.4.1-rc3" },
  { label: "Platform", value: "Linux x86_64" },
  { label: "GPU Cluster", value: "4× NVIDIA A100 80GB" },
  { label: "Vector Store", value: "Milvus 2.4" },
  { label: "Runtime", value: "Node.js 20 LTS" },
  { label: "Region", value: "On-Premise (Mumbai Refinery)" },
];

const storageItems = [
  { label: "Vector Database", used: 72, total: 100, unit: "GB", detail: "1,284 embeddings" },
  { label: "Document Repository", used: 41, total: 200, unit: "GB", detail: "348 documents" },
  { label: "Inference Cache", used: 18, total: 50, unit: "GB", detail: "Active sessions: 12" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState("models");
  const [modelStates, setModelStates] = React.useState<Record<string, boolean>>(
    Object.fromEntries(installedModels.map((m) => [m.name, m.enabled]))
  );
  const [cloudLock, setCloudLock] = React.useState(true);
  const [encryption, setEncryption] = React.useState(true);
  const [auditLog, setAuditLog] = React.useState(true);
  const [rbac, setRbac] = React.useState(true);
  const [extTransfer, setExtTransfer] = React.useState(false);
  const [theme, setTheme] = React.useState("dark");
  const [accent, setAccent] = React.useState("cyan");
  const [density, setDensity] = React.useState(false);

  const toggleModel = (name: string) => {
    setModelStates((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      toast({ title: `${name} ${next[name] ? "enabled" : "disabled"}`, type: "success" });
      return next;
    });
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">System</span>
            <span className="h-px w-8 bg-accent/40" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
                    activeTab === tab.id ? "bg-surface-2 text-foreground font-medium" : "text-muted hover:bg-surface-2/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0">
            {activeTab === "models" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">AI Models</CardTitle>
                  <CardDescription className="text-xs">Installed models — enable or disable inference endpoints</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {installedModels.map((m) => (
                    <div key={m.name} className="flex items-center justify-between rounded-md border border-border/60 bg-surface-2/40 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        <p className="text-[11px] text-subtle">{m.family}</p>
                      </div>
                      <Switch checked={modelStates[m.name]} onCheckedChange={() => toggleModel(m.name)} />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => toast({ title: "Import model", description: "Model import wizard coming soon.", type: "info" })}>
                    <Download className="h-3.5 w-3.5" /> Import model
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === "security" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Security Controls</CardTitle>
                  <CardDescription className="text-xs">Configure perimeter security and access policies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Cloud API Lock", desc: "Block all outbound API requests", icon: CloudOff, state: cloudLock, set: setCloudLock, locked: true },
                    { label: "Encryption at Rest", desc: "AES-256 for all stored data", icon: Lock, state: encryption, set: setEncryption, locked: false },
                    { label: "Audit Logging", desc: "Record all system actions", icon: ScrollText, state: auditLog, set: setAuditLog, locked: false },
                    { label: "Role-Based Access", desc: "Enforce RBAC policies", icon: UserCog, state: rbac, set: setRbac, locked: false },
                    { label: "External Data Transfer", desc: "Allow outbound data (dangerous)", icon: AlertTriangle, state: extTransfer, set: setExtTransfer, locked: true, danger: true },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className={cn("flex items-center justify-between rounded-md border px-4 py-3", item.danger && !item.state ? "border-border/60 bg-surface-2/40" : "border-border/60 bg-surface-2/40")}>
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-4 w-4", item.danger ? "text-amber" : "text-muted")} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-[11px] text-subtle">{item.desc}</p>
                          </div>
                        </div>
                        <Switch checked={item.state} disabled={item.locked} onCheckedChange={() => { item.set(!item.state); toast({ title: `${item.label} ${!item.state ? "enabled" : "disabled"}`, type: item.danger ? "warning" : "success" }); }} />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {activeTab === "users" && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">User Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {accessRoles.map((r) => (
                        <div key={r.role} className="rounded-md border border-border/60 bg-surface-2/40 p-3.5 text-center">
                          <p className="text-2xl font-bold text-foreground">{r.count}</p>
                          <p className="mt-1 text-xs text-muted">{r.role}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Role Matrix</CardTitle>
                    <CardDescription className="text-xs">Permission scope per role</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {accessRoles.map((r) => (
                      <div key={r.role} className="flex items-center justify-between rounded-md border border-border/60 bg-surface-2/40 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{r.role}</p>
                          <p className="text-[11px] text-subtle">{r.scope}</p>
                        </div>
                        <Badge variant="subtle">{r.count} users</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "storage" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Storage Usage</CardTitle>
                  <CardDescription className="text-xs">On-premise storage allocation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {storageItems.map((s) => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium text-foreground">{s.label}</p>
                        <p className="text-xs text-subtle">{s.used} / {s.total} {s.unit}</p>
                      </div>
                      <Progress value={(s.used / s.total) * 100} />
                      <p className="mt-1 text-[11px] text-subtle">{s.detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeTab === "system" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">System Information</CardTitle>
                  <CardDescription className="text-xs">Runtime and infrastructure details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  {systemInfo.map((s, i) => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-xs text-muted">{s.label}</span>
                        <span className="text-xs font-medium font-mono text-foreground">{s.value}</span>
                      </div>
                      {i < systemInfo.length - 1 && <Separator />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeTab === "appearance" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
                  <CardDescription className="text-xs">Customize the interface theme and layout</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Theme</p>
                    <div className="flex gap-2">
                      {[
                        { id: "dark", label: "Dark", icon: Moon },
                        { id: "light", label: "Light", icon: Sun },
                        { id: "system", label: "System", icon: Monitor },
                      ].map((t) => {
                        const Icon = t.icon;
                        return (
                          <button key={t.id} onClick={() => { setTheme(t.id); toast({ title: `Theme set to ${t.label}`, type: "success" }); }}
                            className={cn("flex items-center gap-2 rounded-md border px-4 py-2.5 text-xs transition-colors", theme === t.id ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:bg-surface-2")}>
                            <Icon className="h-3.5 w-3.5" /> {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Accent Color</p>
                    <div className="flex gap-2">
                      {["cyan", "green", "amber", "violet", "red"].map((c) => (
                        <button key={c} onClick={() => { setAccent(c); toast({ title: `Accent color: ${c}`, type: "success" }); }}
                          className={cn("h-8 w-8 rounded-full border-2 transition-colors", accent === c ? "border-foreground" : "border-transparent", `bg-${c}`)} />
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">Compact Density</p>
                      <p className="text-[11px] text-subtle">Reduce padding and spacing</p>
                    </div>
                    <Switch checked={density} onCheckedChange={(v) => { setDensity(v); toast({ title: `Density: ${v ? "compact" : "default"}`, type: "success" }); }} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
