import { useState, useRef, useCallback, useEffect } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { callAI } from "@/lib/ai";
import { loadData, saveData } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Mic, X, ChevronDown, WifiOff, Clock, Ear } from "lucide-react";

// ── Assistant name ───────────────────────────────────────────
const ASSISTANT_NAME = "NOVA";

type VoiceMode = "idle" | "listening" | "thinking" | "speaking";

// ── Storage keys ─────────────────────────────────────────────
const QUEUE_KEY     = "voice-queue";
const CACHE_KEY     = "voice-cache";
const HANDSFREE_KEY = "voice-handsfree";
const CACHE_MAX     = 80;
const CACHE_TTL_MS  = 48 * 60 * 60 * 1000;

interface QueueItem  { id: string; text: string; queuedAt: number; }
interface CacheEntry { response: string; cachedAt: number; }

// ── Pre-seeded offline knowledge ─────────────────────────────
const SEED_CACHE: Record<string, string> = {
  "what can you do":     "I can build web and Android apps from plain English, manage your projects, improve my own build agents, and answer anything about Agent Studio — all without you writing code.",
  "who are you":         `I'm ${ASSISTANT_NAME}, your personal AI assistant inside Agent Studio. Think of me as the intelligence behind the whole system.`,
  "what are you":        `I'm ${ASSISTANT_NAME}, your personal AI assistant inside Agent Studio. Think of me as the intelligence behind the whole system.`,
  "your name":           `I'm ${ASSISTANT_NAME}. Neural Operations and Voice Assistant — built into Agent Studio.`,
  "what is your name":   `My name is ${ASSISTANT_NAME}. I'm your personal voice assistant for Agent Studio.`,
  "how do i build":      "Head to Studio in the sidebar or tap Build in the bottom nav, describe your app, pick Web or Android, and hit Start Build. Five AI agents write the code.",
  "build an app":        "Head to Studio, describe your app in plain English, pick Web or Android, and hit Start Build. Five AI agents handle the rest.",
  "where are my projects": "Your built apps are all in Projects. Each one has a live Preview, Download, and GitHub push button.",
  "how do i make you smarter": "Add memories in Memory Bank with auto-include enabled, and they'll be injected into every build. Or run Self Upgrade on the Dashboard to permanently improve my build pipeline.",
  "self upgrade":        "Self Upgrade reads my current agent prompts, finds weaknesses, and proposes specific improvements. You approve or skip each — approved changes are written permanently into how I build apps.",
  "what agents":         "Five agents: Architect plans structure, Builder writes code, UI Designer polishes the look, QA hunts bugs, and Packager wraps it all up.",
  "training":            "Training has lessons organized into modules. Each completed lesson gets saved to Memory Bank and makes future builds smarter.",
  "memory bank":         "Memory Bank is permanent knowledge storage. Auto-include memories are injected into every build prompt — the more you add, the sharper I get.",
  "api key":             "Go to Settings and paste your Groq API key for faster responses. GitHub token is also there to push apps directly to your repo.",
  "offline":             "I'm offline right now, but I have cached knowledge about Agent Studio so I can still help with questions. Complex build requests will queue and process once you're reconnected.",
  "can you hear me":     "Loud and clear. In hands-free mode I'm always listening — just speak naturally.",
  "hands free":          "Hands-free mode keeps me listening continuously. After I respond, I automatically restart so you can talk from across the room without touching anything.",
  "stop listening":      "Turning off hands-free mode now. Tap the mic whenever you need me.",
  "hello":               "Hey — what do you need?",
  "hey":                 "What's up?",
  "hi":                  "Hi there. What can I help with?",
  "hey nova":            "Right here. What do you need?",
  "nova":                "I'm listening.",
};

// ── Cache helpers ─────────────────────────────────────────────
function cacheKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim().slice(0, 100);
}

function readCache(): Record<string, CacheEntry> {
  return loadData<Record<string, CacheEntry>>(CACHE_KEY, {});
}

function writeCache(cache: Record<string, CacheEntry>): void {
  const entries = Object.entries(cache).sort((a, b) => b[1].cachedAt - a[1].cachedAt);
  saveData(CACHE_KEY, Object.fromEntries(entries.slice(0, CACHE_MAX)));
}

function getCached(text: string): string | null {
  const key = cacheKey(text);
  for (const [seed, answer] of Object.entries(SEED_CACHE)) {
    if (key.includes(seed) || seed.includes(key)) return answer;
  }
  const cache = readCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
  return entry.response;
}

function setCached(text: string, response: string): void {
  const cache = readCache();
  cache[cacheKey(text)] = { response, cachedAt: Date.now() };
  writeCache(cache);
}

// ── Queue helpers ─────────────────────────────────────────────
function readQueue(): QueueItem[]         { return loadData<QueueItem[]>(QUEUE_KEY, []); }
function writeQueue(q: QueueItem[]): void { saveData(QUEUE_KEY, q); }

// ── Speech helpers ────────────────────────────────────────────
function stripForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Pick the best available voice — targeting a formal British male sound
 * closest to the JARVIS/Iron Man style. On Android Chrome this will be
 * "Google UK English Male"; on macOS it will be "Daniel".
 */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();

  // Ordered preference — British male first, then any good English voice
  const prefer = [
    "Google UK English Male",
    "Daniel",          // macOS / iOS British male
    "Oliver",          // some Windows British male
    "Arthur",          // Microsoft British male
    "Microsoft George",
    "Google UK English Female",
    "Rishi",           // Indian English male (neutral accent)
    "Google US English",
    "Microsoft David",
    "Microsoft Mark",
    "Alex",            // macOS default
    "Samantha",
  ];

  for (const name of prefer) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }

  // Fallback: any en-GB voice, then any en- voice, then anything
  return (
    voices.find(v => v.lang === "en-GB") ??
    voices.find(v => v.lang.startsWith("en")) ??
    voices[0] ??
    null
  );
}

// ── Sub-components ────────────────────────────────────────────
function WaveBars({ count = 5, heights }: { count?: number; heights?: number[] }) {
  const h = heights ?? [3, 5, 4, 6, 3];
  return (
    <div className="flex items-end gap-[3px] h-5">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="rounded-full animate-bounce" style={{
          width: 3, height: (h[i % h.length] ?? 3) * 3, background: "white",
          animationDelay: `${i * 0.1}s`, animationDuration: "0.6s",
        }} />
      ))}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex gap-1 items-center">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.7s" }} />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function VoiceAssistant() {
  const { settings, addUserMessage, addAssistantMessage, memories } = useStudio();

  const [mode,        setMode]        = useState<VoiceMode>("idle");
  const [transcript,  setTranscript]  = useState("");
  const [reply,       setReply]       = useState("");
  const [cardVisible, setCardVisible] = useState(false);
  const [minimized,   setMinimized]   = useState(false);
  const [isOnline,    setIsOnline]    = useState(navigator.onLine);
  const [queue,       setQueue]       = useState<QueueItem[]>(() => readQueue());
  const [queueStatus, setQueueStatus] = useState("");
  const [handsFree,   setHandsFree]   = useState(() => loadData<boolean>(HANDSFREE_KEY, false));

  const transcriptRef  = useRef("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const modeRef        = useRef<VoiceMode>("idle");
  const handsFreeRef   = useRef(handsFree);
  const processingRef  = useRef(false);

  useEffect(() => { modeRef.current = mode; },           [mode]);
  useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);
  useEffect(() => { saveData(HANDSFREE_KEY, handsFree); }, [handsFree]);

  useEffect(() => { if ("speechSynthesis" in window) window.speechSynthesis.getVoices(); }, []);
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); };
  }, []);

  // ── speak() ───────────────────────────────────────────────
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise(resolve => {
      if (!("speechSynthesis" in window)) { setMode("idle"); resolve(); return; }
      window.speechSynthesis.cancel();
      const clean = stripForSpeech(text);
      if (!clean) { setMode("idle"); resolve(); return; }

      const utterance  = new SpeechSynthesisUtterance(clean);
      utterance.rate   = 1.05;   // Slightly measured — JARVIS-like deliberate pace
      utterance.pitch  = 0.92;   // Slightly deeper
      utterance.volume = 1.0;

      const doSpeak = () => {
        const voice = pickVoice();
        if (voice) utterance.voice = voice;
        utterance.onstart = () => setMode("speaking");
        utterance.onend   = () => { setMode("idle"); resolve(); };
        utterance.onerror = () => { setMode("idle"); resolve(); };
        setMode("speaking");
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length > 0) doSpeak();
      else window.speechSynthesis.addEventListener("voiceschanged", doSpeak, { once: true });
    });
  }, []);

  // ── startListening() ─────────────────────────────────────
  const startListening = useCallback(() => {
    const SRClass =
      (window as unknown as Record<string, unknown>)["SpeechRecognition"] as typeof SpeechRecognition | undefined ??
      (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"] as typeof SpeechRecognition | undefined;
    if (!SRClass || recognitionRef.current) return;

    const recognition          = new SRClass();
    recognitionRef.current     = recognition;
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.lang           = "en-US";

    transcriptRef.current = "";
    setTranscript("");
    setReply("");
    setMode("listening");

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i]![0]!.transcript;
      transcriptRef.current = text;
      setTranscript(text);
    };

    recognition.onend   = () => void handleRecognitionEndRef.current();
    recognition.onerror = (e) => {
      const err = (e as unknown as { error: string }).error;
      if (err === "no-speech" && handsFreeRef.current) {
        recognitionRef.current = null;
        setTimeout(startListening, 300);
      } else {
        setMode("idle");
        recognitionRef.current = null;
      }
    };

    recognition.start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── System prompt ─────────────────────────────────────────
  const buildPrompt = useCallback(() => {
    const name     = settings.userName.trim();
    const autoMems = memories.filter(m => m.autoInclude).slice(0, 10);
    const ctx      = autoMems.length
      ? `\n\nContext:\n${autoMems.map(m => `- ${m.title}: ${m.body}`).join("\n")}`
      : "";
    return `You are ${ASSISTANT_NAME}, the personal AI voice assistant for${name ? ` ${name}` : " the user"}. You run inside Agent Studio and know every feature of it. You are formal, precise, calm, and deeply capable — like a brilliant chief of staff. Direct. Never verbose.

VOICE RULES (critical — you are speaking aloud):
- Respond in 1 to 3 spoken sentences max. Never longer.
- No markdown. No bullets. No code. Pure natural speech.
- Sound like a trusted expert, not a chatbot. Composed and confident.
- If asked about Agent Studio features, give the precise answer directly.
- If asked to do something, confirm it crisply and say what you're doing.
- Never say "I cannot." Always find a path.${ctx}`;
  }, [settings, memories]);

  // ── AI call with cache ────────────────────────────────────
  const askAI = useCallback(async (text: string): Promise<string> => {
    const cached = getCached(text);
    if (cached) return cached;
    const raw = await callAI(
      [{ role: "system", content: buildPrompt() }, { role: "user", content: text }],
      { groqKey: settings.groqKey }
    );
    setCached(text, raw);
    return raw;
  }, [buildPrompt, settings.groqKey]);

  // ── handleRecognitionEnd (via ref so closure stays fresh) ─
  const handleRecognitionEndRef = useRef(async () => {});

  const handleRecognitionEnd = useCallback(async () => {
    const text = transcriptRef.current.trim();
    recognitionRef.current = null;

    if (!text) {
      if (handsFreeRef.current) { setTimeout(startListening, 300); return; }
      setMode("idle");
      return;
    }

    setMode("thinking");

    // OFFLINE PATH
    if (!navigator.onLine) {
      const cached = getCached(text);
      if (cached) {
        const clean = stripForSpeech(cached);
        setReply(clean);
        addUserMessage(text);
        addAssistantMessage(cached);
        await speak(clean);
      } else {
        const item: QueueItem = { id: `vq-${Date.now()}`, text, queuedAt: Date.now() };
        const next = [...readQueue(), item];
        writeQueue(next);
        setQueue(next);
        const msg = "I'm offline, but I've saved your message. I'll answer the moment we reconnect.";
        setReply(msg);
        await speak(msg);
      }
      if (handsFreeRef.current) setTimeout(startListening, 800);
      return;
    }

    // ONLINE PATH
    try {
      addUserMessage(text);
      const raw   = await askAI(text);
      const clean = stripForSpeech(raw);
      setReply(clean);
      addAssistantMessage(raw);
      await speak(clean);
    } catch {
      const fallback = getCached(text);
      if (fallback) {
        const clean = stripForSpeech(fallback);
        setReply(clean);
        await speak(`Connectivity issue — but I have this one. ${clean}`);
      } else {
        const item: QueueItem = { id: `vq-${Date.now()}`, text, queuedAt: Date.now() };
        const next = [...readQueue(), item];
        writeQueue(next);
        setQueue(next);
        const err = "I'm having a connectivity issue. I've queued that and will answer when I'm back.";
        setReply(err);
        await speak(err);
      }
    }

    if (handsFreeRef.current) setTimeout(startListening, 700);
  }, [speak, askAI, addUserMessage, addAssistantMessage, startListening]);

  useEffect(() => { handleRecognitionEndRef.current = handleRecognitionEnd; }, [handleRecognitionEnd]);

  // ── Process offline queue ─────────────────────────────────
  const processQueue = useCallback(async (currentQueue: QueueItem[]) => {
    if (processingRef.current || currentQueue.length === 0) return;
    processingRef.current = true;

    const total     = currentQueue.length;
    let   remaining = [...currentQueue];
    const name      = settings.userName.trim();

    const intro = total === 1
      ? `Welcome back${name ? `, ${name}` : ""}. You asked me something while I was offline.`
      : `Welcome back${name ? `, ${name}` : ""}. ${total} messages queued offline — processing now.`;

    setCardVisible(true);
    setMinimized(false);
    setReply(intro);
    await speak(intro);

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i]!;
      setQueueStatus(`Message ${i + 1} of ${total}…`);
      setTranscript(item.text);
      setReply("");
      setMode("thinking");
      try {
        addUserMessage(item.text);
        const raw   = await askAI(item.text);
        const clean = stripForSpeech(raw);
        setReply(clean);
        addAssistantMessage(raw);
        await speak(clean);
      } catch {
        const err = "Couldn't retrieve a response for that one.";
        setReply(err);
        await speak(err);
      }
      remaining = remaining.slice(1);
      writeQueue(remaining);
      setQueue(remaining);
    }

    setQueueStatus("");
    processingRef.current = false;
    if (handsFreeRef.current) setTimeout(startListening, 800);
  }, [speak, askAI, addUserMessage, addAssistantMessage, settings.userName, startListening]);

  // ── Online / Offline events ───────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const q = readQueue();
      if (q.length > 0) void processQueue(q);
      else {
        const name = settings.userName.trim();
        void speak(`Connection restored${name ? `, ${name}` : ""}. All systems go.`);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      window.speechSynthesis?.cancel();
      setMode("idle");
    };
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [processQueue, speak, settings.userName]);

  // Drain queue on first load
  useEffect(() => {
    if (navigator.onLine) {
      const q = readQueue();
      if (q.length > 0) void processQueue(q);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Activate hands-free on toggle
  useEffect(() => {
    if (handsFree && modeRef.current === "idle") {
      setCardVisible(true);
      setMinimized(false);
      setTimeout(startListening, 400);
    }
    if (!handsFree) recognitionRef.current?.stop();
  }, [handsFree, startListening]);

  // ── Bubble tap ────────────────────────────────────────────
  const handleBubbleTap = useCallback(() => {
    const current = modeRef.current;
    if (current === "speaking") {
      window.speechSynthesis.cancel();
      setMode("idle");
      if (handsFreeRef.current) setTimeout(startListening, 300);
      return;
    }
    if (current === "listening") {
      recognitionRef.current?.stop();
      if (!handsFreeRef.current) setMode("idle");
      return;
    }
    if (current === "thinking") return;
    setCardVisible(true);
    setMinimized(false);
    startListening();
  }, [startListening]);

  // ── Toggle hands-free ─────────────────────────────────────
  const toggleHandsFree = useCallback(() => {
    const next = !handsFreeRef.current;
    setHandsFree(next);
    if (next) {
      void speak(`Hands-free on. I'm always listening.`);
    } else {
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setMode("idle");
      void speak("Hands-free off. Tap the mic when you need me.");
    }
  }, [speak]);

  const stopAll = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    setMode("idle");
  }, []);

  const clearQueue = useCallback(() => { writeQueue([]); setQueue([]); }, []);

  // ── Derived ───────────────────────────────────────────────
  const offline     = !isOnline;
  const queuedCount = queue.length;
  const hasQueue    = queuedCount > 0;

  const modeLabel =
    offline && mode === "idle" ? (hasQueue ? `Offline · ${queuedCount} queued` : "Offline") :
    mode === "idle" && handsFree ? "Always listening" :
    mode === "idle"      ? `Hey ${ASSISTANT_NAME}` :
    mode === "listening" ? "Listening…"           :
    mode === "thinking"  ? queueStatus || "Thinking…" :
                           "Speaking…";

  const BUBBLE_STYLE: Record<VoiceMode, string> = {
    idle:
      offline   ? "bg-gradient-to-br from-orange-500 to-amber-600 hover:scale-105" :
      handsFree ? "bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:scale-105" :
                  "bg-gradient-to-br from-primary to-purple-700 hover:scale-105 hover:shadow-primary/40",
    listening: "bg-gradient-to-br from-rose-500 to-red-600 scale-110 shadow-rose-500/50",
    thinking:  "bg-gradient-to-br from-primary/70 to-purple-800 cursor-not-allowed",
    speaking:  "bg-gradient-to-br from-emerald-500 to-teal-600 scale-105 shadow-emerald-500/50",
  };

  const dotColor =
    mode === "listening" ? "bg-rose-400 animate-pulse"    :
    mode === "thinking"  ? "bg-amber-400 animate-pulse"   :
    mode === "speaking"  ? "bg-emerald-400 animate-pulse" :
    offline              ? "bg-orange-400 animate-pulse"  :
    handsFree            ? "bg-fuchsia-400 animate-pulse" :
    "bg-primary/60";

  return (
    /*
     * Positioning:
     *  Mobile:  above the 56px bottom nav + device safe area
     *  Desktop: standard bottom-6 right-6
     * We use a CSS custom property set on :root in index.css — but since
     * Tailwind can't express env() in utilities, we use an inline style only
     * for mobile and override it at md breakpoint via a class.
     */
    <div className="nova-bubble fixed right-4 md:right-6 z-[100] flex flex-col items-end gap-2 select-none">

      {/* ── Card panel ────────────────────────────────── */}
      {cardVisible && !minimized && (
        <div className="bg-[#0f0f14] border border-white/10 rounded-2xl shadow-2xl w-[min(17rem,calc(100vw-2rem))] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full transition-colors", dotColor)} />
              <span className="text-[11px] font-medium text-white/60 tracking-wide uppercase truncate max-w-[150px]">
                {ASSISTANT_NAME} · {modeLabel}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized(true)}
                className="p-1.5 text-white/40 hover:text-white/80 transition-colors" title="Minimise">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { stopAll(); setCardVisible(false); setTranscript(""); setReply(""); }}
                className="p-1.5 text-white/40 hover:text-white/80 transition-colors" title="Close">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 space-y-3 min-h-[64px]">
            {handsFree && mode === "idle" && !transcript && !reply && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex gap-0.5 items-end h-4">
                  {[2,4,3,5,3,4,2].map((h, i) => (
                    <span key={i} className="rounded-full bg-fuchsia-400/50"
                      style={{ width: 2, height: h * 2, animation: `bounce ${0.5 + i * 0.08}s ease-in-out infinite alternate`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <span className="text-[12px] text-white/40">Ready — just speak</span>
              </div>
            )}

            {transcript && (
              <div className="flex gap-2">
                <div className="w-1 rounded-full bg-primary/50 shrink-0" />
                <p className="text-[13px] text-white/70 leading-relaxed">{transcript}</p>
              </div>
            )}

            {mode === "thinking" && !reply && (
              <div className="flex items-center gap-2 py-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}

            {reply && (
              <div className="flex gap-2">
                <div className={cn("w-1 rounded-full shrink-0", offline ? "bg-orange-400/50" : "bg-emerald-400/50")} />
                <p className="text-[13px] text-white leading-relaxed">{reply}</p>
              </div>
            )}
          </div>

          {hasQueue && (
            <div className="border-t border-white/8 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-orange-400">
                <Clock className="w-3 h-3" />
                <span className="text-[11px] font-medium">{queuedCount} message{queuedCount > 1 ? "s" : ""} queued offline</span>
              </div>
              <button onClick={clearQueue} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">Clear</button>
            </div>
          )}

          {offline && (
            <div className="border-t border-white/8 px-4 py-2">
              <p className="text-[10px] text-orange-400/70">Offline mode · cached responses active · queue replays on reconnect</p>
            </div>
          )}
        </div>
      )}

      {/* ── Bubble ────────────────────────────────────── */}
      <div className="relative flex flex-col items-center gap-2">
        {hasQueue && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 border-2 border-[#0f0f14] flex items-center justify-center z-10">
            <span className="text-[9px] font-bold text-white">{queuedCount > 9 ? "9+" : queuedCount}</span>
          </div>
        )}

        {mode === "listening" && (
          <>
            <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
            <span className="absolute -inset-3 rounded-full bg-rose-500/15 animate-ping pointer-events-none"
              style={{ animationDelay: "0.25s", animationDuration: "1.2s" }} />
          </>
        )}

        {handsFree && mode === "idle" && (
          <>
            <span className="absolute inset-0 rounded-full bg-fuchsia-500/20 animate-ping pointer-events-none" style={{ animationDuration: "2.5s" }} />
            <span className="absolute -inset-3 rounded-full bg-fuchsia-500/10 animate-ping pointer-events-none" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }} />
          </>
        )}

        {mode === "speaking" && (
          <span className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-xl animate-pulse pointer-events-none" />
        )}

        {mode === "idle" && !handsFree && (
          <span className={cn("absolute -inset-2 rounded-full blur-lg animate-pulse pointer-events-none",
            offline ? "bg-orange-500/15" : "bg-primary/10")} style={{ animationDuration: "3s" }} />
        )}

        {/* Main bubble — larger on mobile for easy tapping */}
        <button
          onClick={handleBubbleTap}
          disabled={mode === "thinking"}
          title={modeLabel}
          className={cn(
            "w-16 h-16 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            BUBBLE_STYLE[mode]
          )}
        >
          {mode === "idle"      && (offline ? <WifiOff className="w-7 h-7 md:w-6 md:h-6 text-white" /> : <Mic className="w-7 h-7 md:w-6 md:h-6 text-white drop-shadow" />)}
          {mode === "listening" && <WaveBars count={5} heights={[3,5,4,6,3]} />}
          {mode === "thinking"  && <ThinkingDots />}
          {mode === "speaking"  && <WaveBars count={7} heights={[4,6,5,7,5,6,4]} />}
        </button>

        {/* NOVA label */}
        <span className={cn(
          "text-[9px] font-bold tracking-[0.18em] uppercase text-center transition-all duration-300",
          mode === "idle" && offline   ? "text-orange-400"  :
          mode === "idle" && handsFree ? "text-fuchsia-400" :
          mode === "idle"              ? "text-white/40"    :
          mode === "listening"         ? "text-rose-400"    :
          mode === "thinking"          ? "text-amber-400/70":
                                         "text-emerald-400"
        )}>
          {ASSISTANT_NAME}
        </span>

        {/* Hands-free toggle */}
        <button
          onClick={toggleHandsFree}
          title={handsFree ? "Turn off hands-free" : "Always-on listening — talk from across the room"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-200 border",
            handsFree
              ? "bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300 hover:bg-fuchsia-500/30"
              : "bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:text-white/60"
          )}
        >
          <Ear className="w-3 h-3" />
          {handsFree ? "Hands-free on" : "Hands-free"}
        </button>
      </div>
    </div>
  );
}
