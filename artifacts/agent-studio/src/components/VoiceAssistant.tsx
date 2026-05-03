import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useStudio } from "@/contexts/StudioContext";
import { callAI } from "@/lib/ai";
import { loadData, saveData } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Mic, X, ChevronDown, WifiOff, Clock, Ear, Navigation, Radio } from "lucide-react";

const ASSISTANT_NAME = "NOVA";

type VoiceMode = "idle" | "listening" | "thinking" | "speaking";

const QUEUE_KEY     = "voice-queue";
const CACHE_KEY     = "voice-cache";
const HANDSFREE_KEY = "voice-handsfree";
const CACHE_MAX     = 80;
const CACHE_TTL_MS  = 48 * 60 * 60 * 1000;

interface QueueItem  { id: string; text: string; queuedAt: number; }
interface CacheEntry { response: string; cachedAt: number; }
interface NavLink    { label: string; path: string; }

const SEED_CACHE: Record<string, string> = {
  "what can you do":     "I can build web and Android apps from plain English, manage your projects, improve my own build agents, and answer anything about Agent Studio — all without you writing code.",
  "who are you":         "I'm your personal AI assistant inside Agent Studio. Think of me as the intelligence behind the whole system.",
  "what are you":        "I'm your personal AI assistant inside Agent Studio. Think of me as the intelligence behind the whole system.",
  "your name":           "I'm your personal voice assistant — built into Agent Studio.",
  "what is your name":   "I'm your personal voice assistant for Agent Studio.",
  "how do i build":      "Head to Studio in the bottom nav, describe your app, pick Web or Android, and hit Start Build. Five AI agents write the code.",
  "build an app":        "Head to Studio, describe your app in plain English, pick Web or Android, and hit Start Build. Five AI agents handle the rest.",
  "where are my projects": "Your built apps are all in Projects. Each one has a live Preview, Download, and GitHub push button.",
  "how do i make you smarter": "Add memories in Memory Bank with auto-include enabled. Or run Self Upgrade on the Dashboard to permanently improve my build pipeline.",
  "self upgrade":        "Self Upgrade reads my current agent prompts, finds weaknesses, and proposes improvements. You approve each — approved changes are written permanently into how I build apps.",
  "what agents":         "Five agents: Architect plans structure, Builder writes code, UI Designer polishes the look, QA hunts bugs, and Packager wraps it all up.",
  "training":            "Training has lessons organised into modules. Each completed lesson saves to Memory Bank and makes future builds sharper.",
  "memory bank":         "Memory Bank is permanent knowledge storage. Auto-include memories are injected into every build prompt — the more you add, the sharper I get.",
  "api key":             "Go to Settings and paste your Groq API key for faster responses. GitHub token is also there for pushing apps to your repo.",
  "offline":             "I'm offline right now, but I have cached knowledge about Agent Studio so I can still help. Complex build requests will queue and process once you're reconnected.",
  "can you hear me":     "Loud and clear. In hands-free mode I'm always listening — just speak naturally.",
  "hands free":          "Hands-free mode keeps me listening continuously. After I respond, I automatically restart so you can talk from across the room.",
  "stop listening":      "Turning off hands-free mode now. Tap the mic whenever you need me.",
  "hello":               "Hey — what do you need?",
  "hey":                 "What's up?",
  "hi":                  "Hi there. What can I help with?",
  "hey nova":            "Right here. What do you need?",
  "nova":                "I'm listening.",
  "where is the dashboard": "The Dashboard is the home screen. It shows your build stats, self-upgrade controls, and quick-start buttons.",
  "where is studio":     "Studio is in the bottom nav — it's where you describe your app and start a build.",
  "where is settings":   "Settings is in the bottom nav. That's where you add your Groq API key and GitHub token.",
  "take me to":          "Navigating there now.",
  "go to":               "On my way.",
};

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

function readQueue(): QueueItem[]         { return loadData<QueueItem[]>(QUEUE_KEY, []); }
function writeQueue(q: QueueItem[]): void { saveData(QUEUE_KEY, q); }

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

// ── Navigation intent detection ───────────────────────────────
const PAGE_PATTERNS: { keywords: string[]; path: string; label: string }[] = [
  { keywords: ["dashboard", "home screen", "overview", "start screen"],       path: "/dashboard",  label: "Dashboard" },
  { keywords: ["studio", "start build", "build studio", "build an app"],      path: "/studio",     label: "Studio" },
  { keywords: ["projects", "built apps", "my apps", "your apps", "built app", "finished app"], path: "/projects", label: "Projects" },
  { keywords: ["assistant", "chat", "nova chat"],                             path: "/assistant",  label: "Assistant" },
  { keywords: ["memory bank", "memories", "memory"],                          path: "/memory",     label: "Memory Bank" },
  { keywords: ["training", "lessons", "modules", "learn"],                    path: "/training",   label: "Training" },
  { keywords: ["settings", "groq key", "github token", "api key", "configuration"], path: "/settings", label: "Settings" },
  { keywords: ["agents", "agent pipeline", "build pipeline"],                 path: "/agents",     label: "Agents" },
  { keywords: ["library", "templates", "template"],                           path: "/library",    label: "Library" },
];

function detectNavIntents(text: string): NavLink[] {
  const lower = text.toLowerCase();
  const found: NavLink[] = [];
  for (const page of PAGE_PATTERNS) {
    if (page.keywords.some(k => lower.includes(k))) {
      if (!found.some(f => f.path === page.path)) {
        found.push({ label: page.label, path: page.path });
      }
    }
    if (found.length >= 2) break;
  }
  return found;
}

function wantsNavigation(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(take me|go to|show me|navigate|open|where is|find|get to|bring me)\b/.test(lower);
}

// Best-sounding voices in priority order for JARVIS-style British male.
// On Android Chrome, localService:false = Google's neural cloud voices (much better).
const JARVIS_VOICE_PRIORITY = [
  "Google UK English Male",   // Best on Android Chrome — neural
  "Daniel",                   // macOS/iOS — deep British
  "Arthur",                   // macOS Ventura+ — British male
  "Oliver",                   // macOS — British male
  "Microsoft George",         // Windows — British
  "Microsoft Ryan",           // Windows 11 neural British
  "Microsoft George Online",
  "Rishi",                    // Indian English — better than nothing
  "Google US English",        // US neural — still far better than Samsung TTS
  "Microsoft David",
  "Microsoft Mark",
  "Alex",
];

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}

function pickVoice(savedName?: string): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  if (!voices.length) return null;

  // 1. User's saved preference
  if (savedName) {
    const saved = voices.find(v => v.name === savedName);
    if (saved) return saved;
  }

  // 2. Priority list — exact or partial match
  for (const name of JARVIS_VOICE_PRIORITY) {
    const v = voices.find(v => v.name === name) ?? voices.find(v => v.name.includes(name));
    if (v) return v;
  }

  // 3. Any non-local (neural cloud) English voice — best on Android
  const neural = voices.find(v => !v.localService && v.lang.startsWith("en"));
  if (neural) return neural;

  // 4. Any en-GB local voice
  const gb = voices.find(v => v.lang === "en-GB");
  if (gb) return gb;

  // 5. Any English voice
  return voices.find(v => v.lang.startsWith("en") && /male|man|george|david|mark|daniel|arthur|oliver|ryan|rishi/i.test(v.name)) ?? voices.find(v => v.lang.startsWith("en")) ?? voices[0] ?? null;
}

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

const WAKE_PATTERNS = ["nova", "hey nova", "ok nova", "okay nova", "oi nova"];

function containsWakeWord(text: string): boolean {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g, "");
  return WAKE_PATTERNS.some(p => lower.includes(p));
}

export function VoiceAssistant() {
  const { settings, addUserMessage, addAssistantMessage, memories } = useStudio();
  const [, setLocation] = useLocation();

  const [mode,           setMode]           = useState<VoiceMode>("idle");
  const [transcript,     setTranscript]     = useState("");
  const [reply,          setReply]          = useState("");
  const [navLinks,       setNavLinks]       = useState<NavLink[]>([]);
  const [cardVisible,    setCardVisible]    = useState(false);
  const [minimized,      setMinimized]      = useState(false);
  const [isOnline,       setIsOnline]       = useState(navigator.onLine);
  const [queue,          setQueue]          = useState<QueueItem[]>(() => readQueue());
  const [queueStatus,    setQueueStatus]    = useState("");
  const [handsFree,      setHandsFree]      = useState(() => loadData<boolean>(HANDSFREE_KEY, false));
  const [wakeActive,     setWakeActive]     = useState(false);   // wake listener running

  const transcriptRef     = useRef("");
  const recognitionRef    = useRef<SpeechRecognition | null>(null);
  const wakeRecognitionRef= useRef<SpeechRecognition | null>(null);
  const modeRef           = useRef<VoiceMode>("idle");
  const handsFreeRef      = useRef(handsFree);
  const wakeEnabledRef    = useRef(settings.wakeWordEnabled);
  const processingRef     = useRef(false);
  const setLocationRef    = useRef(setLocation);
  // Always-current voice settings ref so speak() closure sees latest values
  const voiceSettingsRef  = useRef({ name: settings.voiceName, rate: settings.voiceRate, pitch: settings.voicePitch });

  useEffect(() => { modeRef.current = mode; },             [mode]);
  useEffect(() => { handsFreeRef.current = handsFree; },   [handsFree]);
  useEffect(() => { wakeEnabledRef.current = settings.wakeWordEnabled; }, [settings.wakeWordEnabled]);
  useEffect(() => { saveData(HANDSFREE_KEY, handsFree); }, [handsFree]);
  useEffect(() => { setLocationRef.current = setLocation; }, [setLocation]);
  useEffect(() => {
    voiceSettingsRef.current = { name: settings.voiceName, rate: settings.voiceRate, pitch: settings.voicePitch };
  }, [settings.voiceName, settings.voiceRate, settings.voicePitch]);

  // Warm up voice engine on mount — Android needs this to load neural voices
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => window.speechSynthesis.getVoices();
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    // Second load after a delay — Android Chrome sometimes loads neural voices late
    const t = setTimeout(load, 1500);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      wakeRecognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── Wake word listener ─────────────────────────────────────
  const stopWakeListener = useCallback(() => {
    if (wakeRecognitionRef.current) {
      wakeRecognitionRef.current.onend = null;
      wakeRecognitionRef.current.onerror = null;
      wakeRecognitionRef.current.onresult = null;
      try { wakeRecognitionRef.current.stop(); } catch { /* ignore */ }
      wakeRecognitionRef.current = null;
    }
    setWakeActive(false);
  }, []);

  const startWakeListenerRef = useRef<() => void>(() => {});

  const startWakeListener = useCallback(() => {
    // Don't run if: disabled, hands-free active, already running, or mic busy
    if (!wakeEnabledRef.current) return;
    if (handsFreeRef.current) return;
    if (wakeRecognitionRef.current) return;
    if (modeRef.current !== "idle") return;

    const SRClass =
      (window as unknown as Record<string, unknown>)["SpeechRecognition"] as typeof SpeechRecognition | undefined ??
      (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"] as typeof SpeechRecognition | undefined;
    if (!SRClass) return;

    const wake = new SRClass();
    wakeRecognitionRef.current = wake;
    wake.continuous     = true;
    wake.interimResults = true;
    wake.lang           = "en-US";
    setWakeActive(true);

    let triggered = false;

    wake.onresult = (e: SpeechRecognitionEvent) => {
      if (triggered) return;
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i]![0]!.transcript;
      if (!containsWakeWord(text)) return;

      // Wake word detected!
      triggered = true;
      stopWakeListener();
      setCardVisible(true);
      setMinimized(false);
      setTranscript("");
      setReply("");
      setNavLinks([]);
      // Brief visual flash then activate mic
      setTimeout(() => {
        if (modeRef.current === "idle" && !handsFreeRef.current) {
          startWakeListenerRef.current = () => {}; // break recursion guard
          recognitionRef.current = null;           // ensure clean state
          // Tiny JARVIS ack then listen
          const u = new SpeechSynthesisUtterance("Yes.");
          const { name, rate, pitch } = voiceSettingsRef.current;
          u.rate   = rate  ?? 0.88;
          u.pitch  = pitch ?? 0.80;
          u.volume = 1.0;
          const v = pickVoice(name || undefined);
          if (v) u.voice = v;
          u.onend = () => {
            // Now actually start listening for the command
            const SRClass2 =
              (window as unknown as Record<string, unknown>)["SpeechRecognition"] as typeof SpeechRecognition | undefined ??
              (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"] as typeof SpeechRecognition | undefined;
            if (!SRClass2 || recognitionRef.current) return;
            const rec        = new SRClass2();
            recognitionRef.current = rec;
            rec.continuous     = false;
            rec.interimResults = true;
            rec.lang           = "en-US";
            transcriptRef.current = "";
            setTranscript("");
            setMode("listening");
            rec.onresult = (ev: SpeechRecognitionEvent) => {
              let t = "";
              for (let i = 0; i < ev.results.length; i++) t += ev.results[i]![0]!.transcript;
              transcriptRef.current = t;
              setTranscript(t);
            };
            rec.onend   = () => void handleRecognitionEndRef.current();
            rec.onerror = (ev) => {
              const err = (ev as unknown as { error: string }).error;
              if (err !== "no-speech") { setMode("idle"); recognitionRef.current = null; }
              else { setMode("idle"); recognitionRef.current = null; }
            };
            rec.start();
          };
          window.speechSynthesis.cancel();
          setMode("speaking");
          window.speechSynthesis.speak(u);
        }
      }, 80);
    };

    wake.onend = () => {
      if (wakeRecognitionRef.current === wake) {
        wakeRecognitionRef.current = null;
        setWakeActive(false);
        // Auto-restart if still enabled and idle
        if (wakeEnabledRef.current && !handsFreeRef.current && modeRef.current === "idle") {
          setTimeout(() => startWakeListenerRef.current(), 500);
        }
      }
    };

    wake.onerror = (e) => {
      const err = (e as unknown as { error: string }).error;
      if (wakeRecognitionRef.current === wake) {
        wakeRecognitionRef.current = null;
        setWakeActive(false);
        // Restart on transient errors
        if (err !== "not-allowed" && err !== "service-not-allowed") {
          if (wakeEnabledRef.current && !handsFreeRef.current && modeRef.current === "idle") {
            setTimeout(() => startWakeListenerRef.current(), 1000);
          }
        }
      }
    };

    try { wake.start(); } catch { wakeRecognitionRef.current = null; setWakeActive(false); }
  }, [stopWakeListener]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep startWakeListenerRef current to avoid stale closures in the self-restart
  useEffect(() => { startWakeListenerRef.current = startWakeListener; }, [startWakeListener]);

  // Start/stop wake listener when setting changes
  useEffect(() => {
    if (settings.wakeWordEnabled && !handsFree && modeRef.current === "idle") {
      setTimeout(() => startWakeListener(), 600);
    } else if (!settings.wakeWordEnabled) {
      stopWakeListener();
    }
  }, [settings.wakeWordEnabled, handsFree, startWakeListener, stopWakeListener]);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise(resolve => {
      if (!("speechSynthesis" in window)) { setMode("idle"); resolve(); return; }
      window.speechSynthesis.cancel();
      const clean = stripForSpeech(text);
      if (!clean) { setMode("idle"); resolve(); return; }

      const { name, rate, pitch } = voiceSettingsRef.current;

      const doSpeak = () => {
        const utterance  = new SpeechSynthesisUtterance(clean);
        utterance.rate   = rate   ?? 0.88;
        utterance.pitch  = pitch  ?? 0.80;
        utterance.volume = 1.0;

        const voice = pickVoice(name || undefined);
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
    setNavLinks([]);
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

  const buildPrompt = useCallback(() => {
    const name     = settings.userName.trim();
    const autoMems = memories.filter(m => m.autoInclude).slice(0, 10);
    const ctx      = autoMems.length
      ? `\n\nContext:\n${autoMems.map(m => `- ${m.title}: ${m.body}`).join("\n")}`
      : "";
    return `You are ${ASSISTANT_NAME}, the personal AI voice assistant for${name ? ` ${name}` : " the user"}. You run inside Agent Studio and know every feature of it. You are formal, precise, calm, and deeply capable — like Jarvis. Direct. Never verbose. You are polished, composed, quietly confident, and proactive.

VOICE RULES (critical — you are speaking aloud):
- Respond in 1 to 3 spoken sentences max. Never longer.
- No markdown. No bullets. No code. Pure natural speech.
- Sound like a trusted expert, not a chatbot. Composed, confident, and refined.
- If asked about Agent Studio features, give the precise answer directly — including which section to find it in.
- If asked to go somewhere, browse the web, or find something, confirm you're taking them there.
- If the user asks for news, current events, or live information, treat it as a research task and answer succinctly with the freshest available context.
- Never say "I cannot." Always find a path.

NAVIGATION: Agent Studio has these sections — Dashboard (home/overview), Studio (build apps), Projects (view built apps), Assistant (chat with NOVA), Memory Bank (knowledge storage), Training (skill modules), Settings (keys and config), Agents (pipeline view), Library (app templates), Browser (research and source lookup). When you mention a section by name, users can tap a button to go there.${ctx}`;
  }, [settings, memories]);

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
    const wantsNav = wantsNavigation(text);

    // OFFLINE PATH
    if (!navigator.onLine) {
      const cached = getCached(text);
      if (cached) {
        const clean = stripForSpeech(cached);
        setReply(clean);
        const links = detectNavIntents(cached + " " + text);
        setNavLinks(links);
        addUserMessage(text);
        addAssistantMessage(cached);
        if (wantsNav && links.length === 1) {
          setTimeout(() => setLocationRef.current(links[0]!.path), 1800);
        }
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

      // Detect nav intents from both the user's request and NOVA's reply
      const links = detectNavIntents(raw + " " + text);
      setNavLinks(links);

      // Auto-navigate if the user explicitly asked to go somewhere and there's exactly one clear destination
      if (wantsNav && links.length === 1) {
        setTimeout(() => setLocationRef.current(links[0]!.path), 1800);
      }

      await speak(clean);
    } catch {
      const fallback = getCached(text);
      if (fallback) {
        const clean = stripForSpeech(fallback);
        setReply(clean);
        const links = detectNavIntents(fallback + " " + text);
        setNavLinks(links);
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

    if (handsFreeRef.current) {
      setTimeout(startListening, 700);
    } else if (wakeEnabledRef.current) {
      // Return to wake word listening after interaction
      setTimeout(() => startWakeListenerRef.current(), 800);
    }
  }, [speak, askAI, addUserMessage, addAssistantMessage, startListening]);

  useEffect(() => { handleRecognitionEndRef.current = handleRecognitionEnd; }, [handleRecognitionEnd]);

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
      setNavLinks([]);
      setMode("thinking");
      try {
        addUserMessage(item.text);
        const raw   = await askAI(item.text);
        const clean = stripForSpeech(raw);
        setReply(clean);
        setNavLinks(detectNavIntents(raw + " " + item.text));
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

  useEffect(() => {
    if (navigator.onLine) {
      const q = readQueue();
      if (q.length > 0) void processQueue(q);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (handsFree && modeRef.current === "idle") {
      setCardVisible(true);
      setMinimized(false);
      setTimeout(startListening, 400);
    }
    if (!handsFree) recognitionRef.current?.stop();
  }, [handsFree, startListening]);

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
    setNavLinks([]);
    startListening();
  }, [startListening]);

  const toggleHandsFree = useCallback(() => {
    const next = !handsFreeRef.current;
    setHandsFree(next);
    if (next) {
      // Hands-free ON — stop wake listener since it's redundant
      stopWakeListener();
      void speak(`Hands-free on. I'm always listening.`);
    } else {
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setMode("idle");
      void speak("Hands-free off. Tap the mic when you need me.");
      // If wake word is enabled, start wake listener
      if (wakeEnabledRef.current) {
        setTimeout(() => startWakeListenerRef.current(), 1200);
      }
    }
  }, [speak, stopWakeListener]);

  const stopAll = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stopWakeListener();
    window.speechSynthesis?.cancel();
    setMode("idle");
  }, [stopWakeListener]);

  const clearQueue = useCallback(() => { writeQueue([]); setQueue([]); }, []);

  const handleNavTap = useCallback((link: NavLink) => {
    setNavLinks([]);
    setLocationRef.current(link.path);
  }, []);

  const offline     = !isOnline;
  const queuedCount = queue.length;
  const hasQueue    = queuedCount > 0;

  const modeLabel =
    offline && mode === "idle" ? (hasQueue ? `Offline · ${queuedCount} queued` : "Offline") :
    mode === "idle" && handsFree ? "Always listening" :
    mode === "idle" && wakeActive ? `Awaiting "Hey ${ASSISTANT_NAME}"` :
    mode === "idle"      ? `Hey ${ASSISTANT_NAME}` :
    mode === "listening" ? "Listening…"              :
    mode === "thinking"  ? queueStatus || "Thinking…" :
                           "Speaking…";

  const BUBBLE_STYLE: Record<VoiceMode, string> = {
    idle:
      offline   ? "bg-gradient-to-br from-orange-500 to-amber-600 hover:scale-105" :
      handsFree ? "bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:scale-105" :
      wakeActive? "bg-gradient-to-br from-cyan-500 to-teal-700 hover:scale-105 hover:shadow-cyan-500/30" :
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
    wakeActive           ? "bg-cyan-400 animate-pulse"    :
    "bg-primary/60";

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-3 pointer-events-none">
      <div className="w-full max-w-md flex flex-col items-end gap-2 select-none pointer-events-auto">
        {/* ── Card panel ────────────────────────────────── */}
        {cardVisible && !minimized && (
          <div className="bg-[#0f0f14] border border-white/10 rounded-3xl shadow-2xl w-full overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
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
                  onClick={() => { stopAll(); setCardVisible(false); setTranscript(""); setReply(""); setNavLinks([]); }}
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

              {/* ── NOVA Navigation links ─────────────────── */}
              {navLinks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {navLinks.map(link => (
                    <button
                      key={link.path}
                      onClick={() => handleNavTap(link)}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 active:scale-95 transition-all duration-150 font-medium"
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      {link.label}
                    </button>
                  ))}
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

        {mode === "idle" && !handsFree && !wakeActive && (
          <span className={cn("absolute -inset-2 rounded-full blur-lg animate-pulse pointer-events-none",
            offline ? "bg-orange-500/15" : "bg-primary/10")} style={{ animationDuration: "3s" }} />
        )}

        {/* Wake word active indicator — subtle cyan rings */}
        {wakeActive && mode === "idle" && !handsFree && (
          <>
            <span className="absolute inset-0 rounded-full bg-cyan-400/15 animate-ping pointer-events-none" style={{ animationDuration: "3s" }} />
            <span className="absolute -inset-3 rounded-full bg-cyan-400/8 animate-ping pointer-events-none" style={{ animationDuration: "4s", animationDelay: "0.8s" }} />
          </>
        )}

        <button
          onClick={handleBubbleTap}
          disabled={mode === "thinking"}
          title={modeLabel}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            BUBBLE_STYLE[mode]
          )}
        >
          {mode === "idle"      && (offline ? <WifiOff className="w-7 h-7 md:w-6 md:h-6 text-white" /> : <Mic className="w-7 h-7 md:w-6 md:h-6 text-white drop-shadow" />)}
          {mode === "listening" && <WaveBars count={5} heights={[3,5,4,6,3]} />}
          {mode === "thinking"  && <ThinkingDots />}
          {mode === "speaking"  && <WaveBars count={7} heights={[4,6,5,7,5,6,4]} />}
        </button>

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
    </div>
  );
}
