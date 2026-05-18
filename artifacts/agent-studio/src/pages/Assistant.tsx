import { useState, useRef, useEffect } from "react";
import { useStudio, parseFilesFromText } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import {
  Send, Trash2, Copy, Check, ExternalLink,
  MemoryStick, Cpu, Settings2, Star, PlusSquare, CircleCheck, HammerIcon,
  Mic, MicOff, Radio, Square,
} from "lucide-react";
import { useLocation } from "wouter";
import type { AssistantAction } from "@/lib/types";
import { jarvisToggle, jarvisListen, jarvisStopAll } from "@/lib/jarvisVoice";
import type { JarvisStateEvent } from "@/lib/jarvisVoice";

const SUGGESTIONS = [
  "Build me an AI companion Android app with image generation",
  "Create a security scanner that finds vulnerabilities in websites",
  "Build me a todo app for Android I can install from Chrome",
  "Make me an offline AI chat app — no API key needed",
  "Create a security monitor that logs exploits and tests them",
  "Build me a budget tracker with charts",
  "What kinds of apps can you build for me?",
  "Build me a notes app with search and tags",
  "Create an Android PWA fitness tracker",
  "Make me a password manager with local encryption",
  "Build a habit tracker with streak counters",
  "Create a web scraper and data extractor tool",
];

const ACTION_ICONS: Record<AssistantAction["type"], React.ReactNode> = {
  addMemory:      <MemoryStick className="w-3.5 h-3.5" />,
  upgradeAgent:   <Cpu className="w-3.5 h-3.5" />,
  updateSetting:  <Settings2 className="w-3.5 h-3.5" />,
  featureRequest: <Star className="w-3.5 h-3.5" />,
  addTemplate:    <PlusSquare className="w-3.5 h-3.5" />,
  startBuild:     <HammerIcon className="w-3.5 h-3.5" />,
  scanCode:       <Cpu className="w-3.5 h-3.5" />,
};

const ACTION_COLORS: Record<AssistantAction["type"], string> = {
  addMemory:      "bg-blue-500/10 border-blue-500/30 text-blue-400",
  upgradeAgent:   "bg-purple-500/10 border-purple-500/30 text-purple-400",
  updateSetting:  "bg-orange-500/10 border-orange-500/30 text-orange-400",
  featureRequest: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  addTemplate:    "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  startBuild:     "bg-primary/10 border-primary/30 text-primary",
  scanCode:       "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
};

const ACTION_DEST: Record<AssistantAction["type"], { label: string; path: string }> = {
  addMemory:      { label: "View in Memory Bank", path: "/memory" },
  upgradeAgent:   { label: "View in Dashboard",   path: "/dashboard" },
  updateSetting:  { label: "Open Settings",        path: "/settings" },
  featureRequest: { label: "View in Memory Bank", path: "/memory" },
  addTemplate:    { label: "View in Library",      path: "/library" },
  startBuild:     { label: "Watch it build live →", path: "/studio" },
  scanCode:       { label: "Open Dashboard",       path: "/dashboard" },
};

function ActionCard({ action }: { action: AssistantAction }) {
  const [, setLocation] = useLocation();
  const color = ACTION_COLORS[action.type];
  const icon  = ACTION_ICONS[action.type];
  const dest  = ACTION_DEST[action.type];
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
  return text
    .replace(/```fix[\s\S]*?```/g, "")
    .replace(/```files[\s\S]*?```/g, "")
    .trim();
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block"
          style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

function WaveBars({ mode }: { mode: string }) {
  const bars = mode === "speaking" ? [4,6,5,7,5,6,4] : [3,5,4,6,3];
  return (
    <div className="flex items-end gap-[2px] h-4">
      {bars.map((h, i) => (
        <span key={i} className={cn("rounded-full animate-bounce", mode === "speaking" ? "bg-emerald-400" : "bg-rose-400")}
          style={{ width: 2, height: h * 2.5, animationDelay: `${i * 0.1}s`, animationDuration: "0.6s" }} />
      ))}
    </div>
  );
}

function UserAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.trim()
    ? name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "JT";
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white"
      style={{ background: color || "#6366f1" }}>
      {initials}
    </div>
  );
}

// ── Open Mic Panel ────────────────────────────────────────────
function OpenMicPanel({
  voiceMode, handsFree, voiceReply, voiceTranscript, voiceOnline,
  onToggle, onListen, onStop,
}: {
  voiceMode: string; handsFree: boolean; voiceReply: string;
  voiceTranscript: string; voiceOnline: boolean;
  onToggle: () => void; onListen: () => void; onStop: () => void;
}) {
  const isActive = voiceMode !== "idle" || handsFree;

  const modeColor =
    voiceMode === "listening" ? "text-rose-400"    :
    voiceMode === "thinking"  ? "text-amber-400"   :
    voiceMode === "speaking"  ? "text-emerald-400" :
    handsFree                 ? "text-fuchsia-400" :
    "text-white/40";

  const modeLabel =
    voiceMode === "listening" ? "Listening…"  :
    voiceMode === "thinking"  ? "Thinking…"   :
    voiceMode === "speaking"  ? "Speaking…"   :
    handsFree                 ? "Open Mic Active — always listening" :
    "";

  if (!isActive) {
    return (
      <div className="flex items-center gap-2 px-1">
        <button
          onClick={onListen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all"
          title="Tap to speak once"
        >
          <Mic className="w-3.5 h-3.5" />
          Tap to speak
        </button>
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 text-xs text-muted-foreground hover:text-fuchsia-300 transition-all"
          title="Activate continuous open mic — say 'Go to sleep Jarvis' to end"
        >
          <Radio className="w-3.5 h-3.5" />
          Activate Open Mic
        </button>
        {!voiceOnline && (
          <span className="text-[10px] text-orange-400 ml-auto">Offline — responses queued</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-all duration-300",
      handsFree
        ? "bg-fuchsia-950/40 border-fuchsia-500/30"
        : voiceMode === "listening" ? "bg-rose-950/30 border-rose-500/30"
        : voiceMode === "speaking"  ? "bg-emerald-950/30 border-emerald-500/30"
        : "bg-card border-border"
    )}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Animated indicator dot */}
          <span className={cn(
            "w-2 h-2 rounded-full shrink-0",
            voiceMode === "listening" ? "bg-rose-400 animate-pulse"    :
            voiceMode === "thinking"  ? "bg-amber-400 animate-bounce"  :
            voiceMode === "speaking"  ? "bg-emerald-400 animate-pulse" :
            handsFree                 ? "bg-fuchsia-400 animate-ping"  :
            "bg-white/30"
          )} />
          {(voiceMode === "listening" || voiceMode === "speaking") && (
            <WaveBars mode={voiceMode} />
          )}
          <span className={cn("text-[11px] font-medium tracking-wide", modeColor)}>
            {modeLabel || "J.A.R.V.I.S."}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {handsFree && (
            <button
              onClick={onToggle}
              className="text-[10px] text-fuchsia-400/60 hover:text-fuchsia-300 transition-colors px-2 py-0.5 rounded border border-fuchsia-500/20 hover:border-fuchsia-500/40"
            >
              <MicOff className="w-3 h-3 inline mr-1" />
              End Open Mic
            </button>
          )}
          <button
            onClick={onStop}
            className="p-1 text-white/30 hover:text-white/70 transition-colors"
            title="Stop all voice"
          >
            <Square className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Transcript / reply */}
      {(voiceTranscript || voiceReply) && (
        <div className="px-3 pb-3 space-y-1.5">
          {voiceTranscript && (
            <div className="flex gap-2">
              <div className="w-0.5 rounded-full bg-white/20 shrink-0" />
              <p className="text-[12px] text-white/50 leading-relaxed">{voiceTranscript}</p>
            </div>
          )}
          {voiceReply && (
            <div className="flex gap-2">
              <div className={cn("w-0.5 rounded-full shrink-0",
                voiceMode === "speaking" ? "bg-emerald-400/60" : "bg-primary/40")} />
              <p className="text-[12px] text-white/80 leading-relaxed">{voiceReply}</p>
            </div>
          )}
        </div>
      )}

      {handsFree && !voiceTranscript && !voiceReply && voiceMode === "idle" && (
        <div className="px-3 pb-3">
          <p className="text-[11px] text-fuchsia-400/50">
            Ready — speak naturally at any time · Say "Go to sleep Jarvis" to end
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AssistantPage() {
  const { chatHistory, sendChat, clearChat, settings } = useStudio();
  const firstName = settings.userName.trim().split(/\s+/)[0] || "there";
  const [input,   setInput]   = useState("");
  const [sending, setSending] = useState(false);
  const [, setLocation] = useLocation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Voice state — fed by VoiceAssistant via custom events
  const [voiceMode,       setVoiceMode]       = useState("idle");
  const [voiceHandsFree,  setVoiceHandsFree]  = useState(false);
  const [voiceReply,      setVoiceReply]      = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceOnline,     setVoiceOnline]     = useState(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const { mode, handsFree, reply, transcript, online } = (e as CustomEvent<JarvisStateEvent>).detail;
      setVoiceMode(mode);
      setVoiceHandsFree(handsFree);
      setVoiceReply(reply);
      setVoiceTranscript(transcript);
      setVoiceOnline(online);
    };
    window.addEventListener("jarvis:state", handler);
    return () => window.removeEventListener("jarvis:state", handler);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Auto-navigate to Studio when J.A.R.V.I.S. kicks off a build
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-[10px] font-bold text-white tracking-widest">J</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold">J.A.R.V.I.S.</h1>
            <p className="text-[11px] text-muted-foreground">
              Just A Rather Very Intelligent System · Builds · Codes · Deploys
              {settings.groqKey ? " · Groq active" : " · Free via Pollinations"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Open Mic Toggle */}
          <button
            onClick={() => jarvisToggle()}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
              voiceHandsFree
                ? "border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-400"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
            title={voiceHandsFree ? "Open mic active — tap to disable" : "Enable open mic — Jarvis always listens"}
          >
            {voiceHandsFree
              ? <><Radio className="w-3.5 h-3.5 animate-pulse" /><span>Listening</span></>
              : <><Mic className="w-3.5 h-3.5" /><span>Open Mic</span></>
            }
          </button>
          {/* Clear chat */}
          <button
            onClick={clearChat}
            className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded hover:bg-destructive/10"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary tracking-wider">J</span>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold">Good day, {firstName}. What shall I build?</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Describe what you want in plain English — AI companion, security scanner, Android app, anything.
                I will architect, code, design, test, and deliver it entirely.
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
          const isUser     = msg.role === "user";
          const displayText = formatMessage(msg.content);
          const hasFiles   = parseFilesFromText(msg.content).length > 0;
          const actions    = msg.actions ?? [];

          return (
            <div key={msg.id} className={cn("flex gap-3 slide-up", isUser && "flex-row-reverse")}>
              {isUser
                ? <UserAvatar name={settings.userName} color={settings.userColor} />
                : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-white tracking-widest">J</span>
                  </div>
              }
              <div className={cn("max-w-[82%] space-y-2", isUser && "items-end flex flex-col")}>
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
                {!isUser && actions.length > 0 && (
                  <div className="w-full space-y-1.5">
                    {actions.map((action, i) => <ActionCard key={i} action={action} />)}
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
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-white tracking-widest">J</span>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-card border border-border rounded-tl-sm">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Voice panel + Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border shrink-0 space-y-2">
        {/* Open Mic panel */}
        <OpenMicPanel
          voiceMode={voiceMode}
          handsFree={voiceHandsFree}
          voiceReply={voiceReply}
          voiceTranscript={voiceTranscript}
          voiceOnline={voiceOnline}
          onToggle={jarvisToggle}
          onListen={jarvisListen}
          onStop={jarvisStopAll}
        />

        {/* Text input */}
        <div className="flex gap-2 items-end bg-card border border-border rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'Describe your app — e.g. "build me an AI companion for Android with image generation"...'}
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
        <p className="text-[10px] text-muted-foreground text-center">
          Enter to send · Shift+Enter for new line · Say "Go to sleep Jarvis" to end open mic
        </p>
      </div>
    </div>
  );
}
