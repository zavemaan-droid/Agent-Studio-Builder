import { useState, useRef, useEffect } from "react";
import { useStudio, parseFilesFromText } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import {
  Send, Trash2, Bot, Copy, Check, ExternalLink,
  MemoryStick, Cpu, Settings2, Star, PlusSquare, CircleCheck, HammerIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import type { AssistantAction } from "@/lib/types";

const SUGGESTIONS = [
  "Build me a todo list app",
  "Make me a fun game I can play in my browser",
  "Create a notes app for my phone",
  "Build me a simple weather app",
  "I want a habit tracker app",
  "What kinds of apps can you build for me?",
  "Make me a recipe app with favorites",
  "Build a budget tracker for me",
  "Create a workout planner app",
  "Make me a birthday reminder app",
  "Build a simple chat app",
  "Create a photo gallery app",
];

const ACTION_ICONS: Record<AssistantAction["type"], React.ReactNode> = {
  addMemory:      <MemoryStick className="w-3.5 h-3.5" />,
  upgradeAgent:   <Cpu className="w-3.5 h-3.5" />,
  updateSetting:  <Settings2 className="w-3.5 h-3.5" />,
  featureRequest: <Star className="w-3.5 h-3.5" />,
  addTemplate:    <PlusSquare className="w-3.5 h-3.5" />,
  startBuild:     <HammerIcon className="w-3.5 h-3.5" />,
};

const ACTION_COLORS: Record<AssistantAction["type"], string> = {
  addMemory:      "bg-blue-500/10 border-blue-500/30 text-blue-400",
  upgradeAgent:   "bg-purple-500/10 border-purple-500/30 text-purple-400",
  updateSetting:  "bg-orange-500/10 border-orange-500/30 text-orange-400",
  featureRequest: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  addTemplate:    "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  startBuild:     "bg-primary/10 border-primary/30 text-primary",
};

const ACTION_DEST: Record<AssistantAction["type"], { label: string; path: string }> = {
  addMemory:      { label: "View in Memory Bank", path: "/memory" },
  upgradeAgent:   { label: "View in Dashboard", path: "/dashboard" },
  updateSetting:  { label: "Open Settings", path: "/settings" },
  featureRequest: { label: "View in Memory Bank", path: "/memory" },
  addTemplate:    { label: "View in Library", path: "/library" },
  startBuild:     { label: "Watch it build live →", path: "/studio" },
};

function ActionCard({ action }: { action: AssistantAction }) {
  const [, setLocation] = useLocation();
  const color = ACTION_COLORS[action.type];
  const icon = ACTION_ICONS[action.type];
  const dest = ACTION_DEST[action.type];
  return (
    <div className={cn("flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs", color)}>
      <div className="flex items-center gap-2 min-w-0">
        <CircleCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
        {icon}
        <span className="truncate font-medium">{action.label}</span>
      </div>
      <button
        onClick={() => setLocation(dest.path)}
        className="shrink-0 underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity whitespace-nowrap"
      >
        {dest.label}
      </button>
    </div>
  );
}

function CodeBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const files = parseFilesFromText(text);
  if (files.length === 0) return null;

  const copy = () => {
    navigator.clipboard.writeText(files.map(f => `// ${f.path}\n${f.content}`).join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Generated Files</span>
          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
            {files.length} file{files.length > 1 ? "s" : ""}
          </span>
        </div>
        <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="divide-y divide-border">
        {files.slice(0, 3).map((f, i) => (
          <div key={i} className="px-3 py-2">
            <p className="text-[11px] font-mono text-muted-foreground mb-1">{f.path}</p>
            <pre className="text-xs text-foreground/80 font-mono overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
              {f.content.slice(0, 300)}{f.content.length > 300 ? "..." : ""}
            </pre>
          </div>
        ))}
        {files.length > 3 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">+{files.length - 3} more files</div>
        )}
      </div>
    </div>
  );
}

function formatMessage(text: string): string {
  // Remove ```fix ... ``` blocks (they're shown as action cards)
  // Remove ```files ... ``` blocks (they're shown as code cards)
  return text
    .replace(/```fix[\s\S]*?```/g, "")
    .replace(/```files[\s\S]*?```/g, "")
    .trim();
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

function UserAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.trim()
    ? name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "JT";
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white"
      style={{ background: color || "#6366f1" }}
    >
      {initials}
    </div>
  );
}

export default function AssistantPage() {
  const { chatHistory, sendChat, clearChat, settings } = useStudio();
  const firstName = settings.userName.trim().split(/\s+/)[0] || "there";
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [, setLocation] = useLocation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Auto-navigate to Studio when Jarvis kicks off a build
  useEffect(() => {
    const last = chatHistory[chatHistory.length - 1];
    if (last?.role === "assistant" && last.actions) {
      const buildAction = last.actions.find(a => a.type === "startBuild" && a.data.buildId);
      if (buildAction?.data.buildId) {
        const id = String(buildAction.data.buildId);
        setTimeout(() => setLocation(`/studio?build=${id}`), 800);
      }
    }
  }, [chatHistory, setLocation]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    try {
      await sendChat(msg);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-[10px] font-bold text-white tracking-widest">N</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold">Jarvis</h1>
            <p className="text-[11px] text-muted-foreground">
              Self-aware assistant · Fixes Agent Studio instantly{settings.groqKey ? " · Groq active" : " · Free via Pollinations"}
            </p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded hover:bg-destructive/10"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold">Hey {firstName}! What would you like to build?</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Just tell me in plain English — "build me a todo app", "make me a game", anything you want. I'll handle all the technical stuff and build it for you.
              </p>
            </div>
            <div className="grid gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="text-left text-sm px-4 py-2.5 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg) => {
          const isUser = msg.role === "user";
          const displayText = formatMessage(msg.content);
          const hasFiles = parseFilesFromText(msg.content).length > 0;
          const actions = msg.actions ?? [];

          return (
            <div key={msg.id} className={cn("flex gap-3 slide-up", isUser && "flex-row-reverse")}>
              {/* Avatar */}
              {isUser
                ? <UserAvatar name={settings.userName} color={settings.userColor} />
                : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-white tracking-widest">N</span>
                  </div>
              }

              {/* Bubble + actions */}
              <div className={cn("max-w-[82%] space-y-2", isUser && "items-end flex flex-col")}>
                {/* Message bubble */}
                {(displayText || msg.content === "") && (
                  <div className={cn(
                    "px-3.5 py-2.5 rounded-xl text-sm leading-relaxed",
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border rounded-tl-sm"
                  )}>
                    {msg.content === "" ? <TypingDots /> : (
                      <div className="whitespace-pre-wrap break-words">{displayText}</div>
                    )}
                  </div>
                )}

                {/* Action confirmation cards */}
                {!isUser && actions.length > 0 && (
                  <div className="w-full space-y-1.5">
                    {actions.map((action, i) => (
                      <ActionCard key={i} action={action} />
                    ))}
                  </div>
                )}

                {!isUser && hasFiles && <CodeBlock text={msg.content} />}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {sending && chatHistory[chatHistory.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-card border border-border rounded-tl-sm">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
        <div className="flex gap-2 items-end bg-card border border-border rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'Tell me what to build, e.g. "make me a todo app"...'}
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm outline-none placeholder:text-muted-foreground max-h-32 leading-relaxed py-0.5"
            style={{ scrollbarWidth: "none" }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
              input.trim() && !sending
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Changes apply instantly · No code needed · Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
