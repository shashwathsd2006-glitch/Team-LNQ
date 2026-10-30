"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MessageSquare, Paperclip, Mic, Send, Search, Bot, FileText,
  ChevronRight, Copy, ThumbsUp, ThumbsDown, Sparkles, Database,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageTransition } from "@/components/layout/page-transition";
import { useToast } from "@/components/ui/toast";
import { conversations } from "@/data/mock";
import { cn } from "@/lib/utils";
import { listDocuments, ragQuery, directQuery, type RAGSource } from "@/lib/api";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: RAGSource[];
  mode?: "rag" | "direct";
}

const suggestedPrompts = [
  { icon: FileText, text: "What is the recommended maintenance interval for Pump P-102?" },
  { icon: Database, text: "What documents are currently indexed?" },
  { icon: Search, text: "What are the vibration limits for Pump P-102?" },
  { icon: FileText, text: "Describe the seal replacement procedure" },
];

const initialMessages: ChatMessage[] = [];

export default function AssistantPage() {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [activeConv, setActiveConv] = React.useState("c1");
  const [streamedContent, setStreamedContent] = React.useState("");
  const [mode, setMode] = React.useState("Ask");
  const [docCount, setDocCount] = React.useState(0);
  const [streamMode, setStreamMode] = React.useState<"rag" | "direct" | null>(null);
  const { toast } = useToast();

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const msgId = React.useRef(100);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamedContent]);

  React.useEffect(() => {
    listDocuments().then((d) => setDocCount(d.total)).catch(() => {});
  }, []);

  const streamText = React.useCallback((content: string, onDone: () => void) => {
    setIsStreaming(true);
    setStreamedContent("");
    let i = 0;
    const chunkSize = Math.max(4, Math.ceil(content.length / 60));
    let rafId: number;
    const step = () => {
      i += chunkSize;
      if (i >= content.length) {
        setIsStreaming(false);
        setStreamedContent("");
        onDone();
        return;
      }
      setStreamedContent(content.slice(0, i));
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const sendMessage = React.useCallback(async (text?: string) => {
    const body = (text ?? input).trim();
    if (!body || isStreaming) return;
    msgId.current += 1;
    const newUserMsg: ChatMessage = { id: msgId.current, role: "user", content: body };
    setMessages((m) => [...m, newUserMsg]);
    setInput("");
    setIsStreaming(true);
    setStreamedContent("");
    setStreamMode(null);

    try {
      let answer: string;
      let sources: RAGSource[] | undefined;
      let responseMode: "rag" | "direct" = "direct";

      if (docCount > 0) {
        try {
          setStreamMode("rag");
          const ragRes = await ragQuery(body);
          answer = ragRes.answer;
          sources = ragRes.sources;
          responseMode = "rag";
        } catch (ragErr: unknown) {
          const ragMsg = ragErr instanceof Error ? ragErr.message : String(ragErr);
          console.warn("RAG query failed, falling back to direct:", ragMsg);
          setStreamMode("direct");
          toast({ title: "RAG unavailable", description: `Document search failed: ${ragMsg.slice(0, 100)}. Using direct model.`, type: "warning" });
          const directRes = await directQuery(body);
          answer = directRes.response;
        }
      } else {
        setStreamMode("direct");
        const directRes = await directQuery(body);
        answer = directRes.response;
      }

      streamText(answer, () => {
        setStreamMode(null);
        msgId.current += 1;
        setMessages((m) => [
          ...m,
          { id: msgId.current, role: "assistant", content: answer, sources, mode: responseMode },
        ]);
      });
    } catch (err: unknown) {
      setIsStreaming(false);
      setStreamedContent("");
      setStreamMode(null);
      let detail = "Unexpected error.";
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          detail = "Request timed out. The model may be processing a large request.";
        } else if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
          detail = "Cannot reach the backend. Ensure the FastAPI server is running.";
        } else {
          detail = err.message;
        }
      }
      toast({ title: "Error", description: detail, type: "error" });
    }
  }, [input, isStreaming, docCount, streamText, toast]);

  const newConversation = React.useCallback(() => {
    setMessages([]);
    setActiveConv("new");
    toast({ title: "New conversation started", type: "info" });
  }, [toast]);

  const renderContent = React.useCallback((content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*|\n)/g);
    return parts.map((part, i) => {
      if (part === "\n") return <br key={i} />;
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  }, []);

  const modes = ["Ask", "Analyze", "Agent"];

  return (
    <PageTransition>
      <div className="flex h-full">
        <div className="hidden w-64 shrink-0 flex-col border-r border-border bg-background-elevated/60 lg:flex">
          <div className="p-3">
            <Button onClick={newConversation} className="w-full justify-start bg-accent/90">
              <Plus className="h-4 w-4" /> New conversation
            </Button>
          </div>
          <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">Recent</div>
          <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3 scrollbar-none">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConv(c.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
                  activeConv === c.id ? "bg-accent-soft text-foreground" : "text-muted hover:bg-surface-2"
                )}
              >
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-subtle" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs">{c.title}</div>
                  <div className="mt-0.5 text-[10px] text-subtle">{c.time}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-1 rounded-md border border-border bg-surface-2 p-0.5">
              {modes.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn("rounded px-2.5 py-1 text-xs font-medium transition-colors", mode === m ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground")}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Select defaultValue="qwen3-coder">
                <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="qwen3-coder">qwen3-coder:latest</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="success">On-premise</Badge>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-2xl">
              {messages.length === 0 && (
                <div className="mt-20 text-center">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft glow-accent">
                    <Bot className="h-7 w-7 text-accent" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">How can I help with operations?</h2>
                  <p className="mx-auto mt-1.5 max-w-sm text-xs text-muted">
                    Ask about maintenance manuals, safety SOPs, inspection reports and
                    operational procedures — all grounded in local documents.
                  </p>
                  {docCount > 0 && (
                    <p className="mt-2 text-[10px] text-accent">
                      <Database className="mr-1 inline h-3 w-3" />
                      {docCount} document{docCount !== 1 ? "s" : ""} indexed — questions will use RAG
                    </p>
                  )}
                  <div className="mt-5 grid gap-2 text-left">
                    {suggestedPrompts.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(p.text)}
                        className="group flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-xs text-muted transition-colors hover:border-accent/30 hover:bg-surface-2 hover:text-foreground"
                      >
                        <p.icon className="h-4 w-4 shrink-0 text-subtle group-hover:text-accent" />
                        <span className="flex-1">{p.text}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <AnimatePresence>
                  {messages.map((m) => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
                      {m.role === "assistant" && (
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent-soft">
                          <Bot className="h-4 w-4 text-accent" />
                        </div>
                      )}
                      <div className={cn("max-w-[85%]", m.role === "assistant" ? "rounded-lg border border-border bg-surface px-4 py-3" : "rounded-lg bg-accent/10 px-4 py-3 ring-1 ring-accent/20")}>
                        {m.role === "user" ? (
                          <p className="text-sm leading-relaxed text-foreground">{m.content}</p>
                        ) : (
                          <>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{renderContent(m.content)}</div>
                            {m.mode === "rag" && m.sources && m.sources.length > 0 && (
                              <div className="mt-3 space-y-1.5 border-t border-border pt-2.5">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">Sources</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {m.sources.map((s, i) => (
                                    <div key={i} className="flex items-center gap-1.5 rounded-md border border-border bg-background-elevated px-2 py-1">
                                      <FileText className="h-3 w-3 text-accent" />
                                      <span className="text-[11px] text-muted">{s.document}</span>
                                      <span className="font-mono text-[10px] text-subtle">p.{s.page}</span>
                                      <span className="font-mono text-[10px] text-green">{(s.score * 100).toFixed(0)}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-1 border-t border-border pt-2">
                              {m.mode === "rag" && (
                                <Badge variant="outline" className="text-[9px] mr-1">RAG</Badge>
                              )}
                              <span className="flex gap-1">
                                <button onClick={() => toast({ title: "Marked as helpful", type: "success" })} className="rounded p-1 text-subtle transition-colors hover:bg-surface-2 hover:text-accent"><ThumbsUp className="h-3.5 w-3.5" /></button>
                                <button onClick={() => toast({ title: "Feedback recorded", type: "info" })} className="rounded p-1 text-subtle transition-colors hover:bg-surface-2 hover:text-muted"><ThumbsDown className="h-3.5 w-3.5" /></button>
                              </span>
                              <button
                                onClick={() => { navigator.clipboard?.writeText(m.content); toast({ title: "Response copied", type: "success" }); }}
                                className="ml-auto flex items-center gap-1 rounded p-1 text-[10px] text-subtle transition-colors hover:text-accent"
                              >
                                <Copy className="h-3 w-3" /> Copy
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isStreaming && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent-soft">
                      <Bot className="h-4 w-4 text-accent" />
                    </div>
                    <div className="max-w-[85%] rounded-lg border border-border bg-surface px-4 py-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                        {streamedContent}
                        <span className="typing-caret ml-0.5" />
                      </p>
                      <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-2.5">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                        <span className="text-[11px] text-muted">
                          {streamMode === "rag" ? "Searching documents and generating response…" : "Generating via local AI backend…"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-background-elevated/60 px-4 py-3">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-end gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20">
                <button onClick={() => toast({ title: "Attachments", description: "Attach documents or images", type: "info" })} className="rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Attach file"><Paperclip className="h-4 w-4" /></button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={mode === "Analyze" ? "Paste an image or describe what to analyze…" : "Ask a question about the knowledge base… (Enter to send)"}
                  rows={1}
                  className="max-h-32 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-foreground placeholder:text-subtle focus:outline-none"
                />
                <button onClick={() => toast({ title: "Voice input", description: "Microphone ready — dictation prototype", type: "info" })} className="rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Voice input"><Mic className="h-4 w-4" /></button>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isStreaming}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-background transition-all hover:bg-accent disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] text-subtle">
                <Sparkles className="h-3 w-3 text-accent" />
                {docCount > 0
                  ? `${docCount} doc${docCount !== 1 ? "s" : ""} indexed · RAG + local qwen3-coder · No data leaves the facility`
                  : "Responses generated locally using qwen3-coder · No data leaves the facility"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
