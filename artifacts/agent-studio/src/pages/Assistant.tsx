import { useState, useRef, useEffect } from "react";
import { useStudio, parseFilesFromText } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import {
  Send, Trash2, Copy, Check, MemoryStick, Cpu, Settings2, Star,
  PlusSquare, CircleCheck, HammerIcon, Mic, MicOff, Radio, Square,
  Paperclip
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
  "What kinds of apps can you build for me?",
  "Build me a notes app with search and tags",
];

const ACTION_ICONS: Record<AssistantAction["type"], React.ReactNode> = {
  addMemory: <MemoryStick className="w-3.5 h-3.5" />,
  upgradeAgent: <Cpu className="w-3.5 h-3.5" />,
  updateSetting: <Settings2 className="w-3.5 h-3.5" />,
  featureRequest: <Star className="w-3.5 h-3.5" />,
  addTemplate: <PlusSquare className="w-3.5 h-3.5" />,
  startBuild: <HammerIcon className="w-3.5 h-3.5" />,
  scanCode: <Cpu className="w-3.5 h-3.5" />,
};

const ACTION_COLORS: Record<AssistantAction["type"], string> = {
  addMemory: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  upgradeAgent: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  updateSetting: "bg-orange-500/10 border-orange-500/30 text-orange-400",
  featureRequest: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  addTemplate: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  startBuild: "bg-primary/10 border-primary/30 text-primary",
  scanCode: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
};

const ACTION_DEST: Record<AssistantAction["type"], { label: string; path: string }> = {
  addMemory: { label: "View Memory", path: "/memory" },
  upgradeAgent: { label: "View Dashboard", path: "/dashboard" },
  updateSetting: { label: "Open Settings", path: "/settings" },
  featureRequest: { label: "View Memory", path: "/memory" },
  addTemplate: { label: "View Library", path: "/library" },
  startBuild: { label: "Watch build →", path: "/studio" },
  scanCode: { label: "Open Dashboard", path: "/dashboard" },
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
      <button onClick={() => setLocation(dest.path)} className="shrink-0 underline underline-offset-2 opacity-70 hover:opacity-100 whitespace-nowrap">
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
        <span className="text-xs font-medium text-muted-foreground">Generated Files · {files.length}</span>
        <button onClick={copy} className="text-muted-foreground hover:text-foreground">
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
      </div>
    </div>
  );
}

function formatMessage(text: string): string {
  return text.replace(/```fix[\s\S]*?```/g, "").replace(/```files[\s\S]*?```/g, "").trim();
}

function TypingDots() {
  return <div className="flex items-center gap-1 px-1 py-0.5">{[0, 1, 2].map(i => <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>;
}

function WaveBars({ mode }: { mode: string }) {
  const bars = mode === "speaking" ? [4, 6, 5, 7, 5, 6, 4] : [3, 5, 4, 6, 3];
  return <div className="flex items-end gap-[2px] h-4">{bars.map((h, i) => <span key={i} className={cn("rounded-full animate-bounce", mode === "speaking" ? "bg-emerald-400" : "bg-rose-400")} style={{ width: 2, height: h * 2.5, animationDelay: `${i * 0.1}s`, animationDuration: "0.6s" }} />)}</div>;
}

function UserAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.trim() ? name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2) : "JT";
  return <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white" style={{ background: color || "#6366f1" }}>{initials}</div>;
}

function OpenMicPanel({ voiceMode, handsFree, voiceReply, voiceTranscript, voiceOnline, onToggle, onListen, onStop }: {
  voiceMode: string; handsFree: boolean; voiceReply: string; voiceTranscript: string; voiceOnline: boolean;
  onToggle: () => void; onListen: () => void; onStop: () => void;
}) {
  const isActive = voiceMode !== "idle" || handsFree;
  const label = voiceMode === "listening" ? "Listening…" : voiceMode === "thinking" ? "Thinking…" : voiceMode === "speaking" ? "Speaking…" : handsFree ? "Open Mic Active" : "Jarvis voice ready";

  return (
    <div className={cn("rounded-xl border p-3 space-y-2", handsFree ? "bg-fuchsia-950/40 border-fuchsia-500/30" : isActive ? "bg-card border-primary/30" : "bg-card border-border")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("w-2 h-2 rounded-full shrink-0", handsFree ? "bg-fuchsia-400 animate-ping" : voiceMode === "listening" ? "bg-rose-400 animate-pulse" : voiceMode === "speaking" ? "bg-emerald-400 animate-pulse" : "bg-white/30")} />
          {(voiceMode === "listening" || voiceMode === "speaking") && <WaveBars mode={voiceMode} />}
          <span className="text-[11px] font-medium truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onListen} className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40">
            <Mic className="w-3.5 h-3.5 inline mr-1" />Speak once
          </button>
          <button onClick={onToggle} className={cn("px-2.5 py-1.5 rounded-lg border text-xs font-medium", handsFree ? "border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-300" : "border-border text-muted-foreground hover:text-fuchsia-300 hover:border-fuchsia-500/40")}>
            {handsFree ? <><MicOff className="w-3.5 h-3.5 inline mr-1" />Turn off</> : <><Radio className="w-3.5 h-3.5 inline mr-1" />Open mic</>}
          </button>
          <button onClick={onStop} className="p-1.5 text-muted-foreground hover:text-foreground" title="Stop voice"><Square className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {(voiceTranscript || voiceReply || handsFree || !voiceOnline) && (
        <div className="space-y-1.5 text-[11px]">
          {!voiceOnline && <p className="text-orange-400">Offline — responses queued</p>}
          {handsFree && !voiceTranscript && !voiceReply && <p className="text-fuchsia-300/70">Hands-free stays on until you turn it off. Say “Go to sleep Jarvis” to end.</p>}
          {voiceTranscript && <p className="text-white/55">You: {voiceTranscript}</p>}
          {voiceReply && <p className="text-white/80">Jarvis: {voiceReply}</p>}
        </div>
      )}
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
  const fileRef = useRef<HTMLInputElement>(null);

  const [voiceMode, setVoiceMode] = useState("idle");
  const [voiceHandsFree, setVoiceHandsFree] = useState(false);
  const [voiceReply, setVoiceReply] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceOnline, setVoiceOnline] = useState(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const { mode, handsFree, reply, transcript, online } = (e as CustomEvent<JarvisStateEvent>).detail;
      setVoiceMode(mode); setVoiceHandsFree(handsFree); setVoiceReply(reply); setVoiceTranscript(transcript); setVoiceOnline(online);
    };
    window.addEventListener("jarvis:state", handler);
    return () => window.removeEventListener("jarvis:state", handler);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  useEffect(() => {
    const last = chatHistory[chatHistory.length - 1];
    if (last?.role === "assistant" && last.actions) {
      const buildAction = last.actions.find(a => a.type === "startBuild" && a.data.buildId);
      if (buildAction?.data.buildId) setTimeout(() => setLocation(`/studio?build=${String(buildAction.data.buildId)}`), 800);
    }
  }, [chatHistory, setLocation]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput(""); setSending(true);
    try { await sendChat(msg); } finally { setSending(false); setTimeout(() => inputRef.current?.focus(), 100); }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const parts: string[] = [];
    for (const file of Array.from(files).slice(0, 6)) {
      const text = file.type.startsWith("text/") || /\.(txt|js|jsx|ts|tsx|json|css|html|md|xml|yml|yaml)$/i.test(file.name)
        ? await file.text().catch(() => "[unreadable text]")
        : `[binary file: ${file.type || "unknown"}, ${file.size} bytes]`;
      parts.push(`File: ${file.name}\n\`\`\`\n${text.slice(0, 12000)}\n\`\`\``);
    }
    await handleSend(`Jarvis, analyze these uploaded file(s) for build, repair, or upgrade work:\n\n${parts.join("\n\n")}`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shadow-lg shadow-primary/20"><span className="text-[10px] font-bold text-white tracking-widest">J</span></div>
          <div>
            <h1 className="text-sm font-semibold">J.A.R.V.I.S.</h1>
            <p className="text-[11px] text-muted-foreground">Natural Builder Studio assistant · {settings.groqKey ? "Groq active" : "Free via Pollinations"}</p>
          </div>
        </div>
        <button onClick={clearChat} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded hover:bg-destructive/10" title="Clear conversation"><Trash2 className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center"><span className="text-2xl font-bold text-primary tracking-wider">J</span></div>
            <div className="text-center space-y-2"><h2 className="text-lg font-semibold">Good day, {firstName}. What shall I build?</h2><p className="text-sm text-muted-foreground max-w-sm">Talk naturally, upload files, or use open mic. I can build, repair, upgrade, explain, and route work into the Builder Studio pipeline.</p></div>
            <div className="grid gap-2 w-full max-w-md">{SUGGESTIONS.map((s, i) => <button key={i} onClick={() => void handleSend(s)} className="text-left text-sm px-4 py-2.5 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground">{s}</button>)}</div>
          </div>
        )}

        {chatHistory.map((msg) => {
          const isUser = msg.role === "user";
          const displayText = formatMessage(msg.content);
          const hasFiles = parseFilesFromText(msg.content).length > 0;
          const actions = msg.actions ?? [];
          return (
            <div key={msg.id} className={cn("flex gap-3 slide-up", isUser && "flex-row-reverse")}>
              {isUser ? <UserAvatar name={settings.userName} color={settings.userColor} /> : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[9px] font-bold text-white tracking-widest">J</span></div>}
              <div className={cn("max-w-[82%] space-y-2", isUser && "items-end flex flex-col")}>
                {(displayText || msg.content === "") && <div className={cn("px-3.5 py-2.5 rounded-xl text-sm leading-relaxed", isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm")}>{msg.content === "" ? <TypingDots /> : <div className="whitespace-pre-wrap break-words">{displayText}</div>}</div>}
                {!isUser && actions.length > 0 && <div className="w-full space-y-1.5">{actions.map((action, i) => <ActionCard key={i} action={action} />)}</div>}
                {!isUser && hasFiles && <CodeBlock text={msg.content} />}
              </div>
            </div>
          );
        })}

        {sending && chatHistory[chatHistory.length - 1]?.role !== "assistant" && <div className="flex gap-3"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center shrink-0"><span className="text-[9px] font-bold text-white tracking-widest">J</span></div><div className="px-3.5 py-2.5 rounded-xl bg-card border border-border rounded-tl-sm"><TypingDots /></div></div>}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-border shrink-0 space-y-2">
        <OpenMicPanel voiceMode={voiceMode} handsFree={voiceHandsFree} voiceReply={voiceReply} voiceTranscript={voiceTranscript} voiceOnline={voiceOnline} onToggle={jarvisToggle} onListen={jarvisListen} onStop={jarvisStopAll} />
        <div className="flex gap-2 items-end bg-card border border-border rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={e => void handleFiles(e.target.files)} />
          <button onClick={() => fileRef.current?.click()} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Upload files for Jarvis to analyze"><Paperclip className="w-3.5 h-3.5" /></button>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={'Talk to Jarvis or describe what to build...'} rows={1} className="flex-1 bg-transparent resize-none text-sm outline-none placeholder:text-muted-foreground max-h-32 leading-relaxed py-0.5" style={{ scrollbarWidth: "none" }} />
          <button onClick={() => void handleSend()} disabled={!input.trim() || sending} className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all", input.trim() && !sending ? "bg-primary text-white hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed")}><Send className="w-3.5 h-3.5" /></button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">One Jarvis voice toggle lives here · open mic stays on until you turn it off</p>
      </div>
    </div>
  );
}
