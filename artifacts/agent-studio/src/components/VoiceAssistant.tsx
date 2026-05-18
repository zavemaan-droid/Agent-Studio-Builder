import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useStudio } from "@/contexts/StudioContext";
import { callAI } from "@/lib/ai";
import { loadData, saveData } from "@/lib/storage";
import {
  registerJarvisSpeak, registerJarvisToggle,
  registerJarvisListen, registerJarvisStopAll,
  registerJarvisBuildVoice, dispatchJarvisState,
  jarvisBuildVoice,
} from "@/lib/jarvisVoice";

type VoiceMode = "idle" | "listening" | "thinking" | "speaking";

const QUEUE_KEY    = "voice-queue";
const CACHE_KEY    = "voice-cache";
const HANDSFREE_KEY = "voice-handsfree";
const CACHE_MAX    = 80;
const CACHE_TTL_MS = 48 * 60 * 60 * 1000;

interface QueueItem  { id: string; text: string; queuedAt: number; }
interface CacheEntry { response: string; cachedAt: number; }
interface NavLink    { label: string; path: string; }

const SEED_CACHE: Record<string, string> = {
  "what can you do":     "I can architect and deploy complete web and Android applications from plain English, manage your project portfolio, continuously upgrade the build pipeline, run real-time code intelligence, and orchestrate the full development process — all without a single line of manual code from you, sir.",
  "who are you":         "I am J.A.R.V.I.S. — Just A Rather Very Intelligent System. Your personal AI architect, embedded within Agent Studio and entirely at your service.",
  "what are you":        "J.A.R.V.I.S. — Just A Rather Very Intelligent System. Think of me as the intelligence behind Agent Studio — and, if I may say so, a considerable upgrade from a simple assistant.",
  "your name":           "J.A.R.V.I.S. — Just A Rather Very Intelligent System. Though most simply call me Jarvis.",
  "what is your name":   "J.A.R.V.I.S. — Just A Rather Very Intelligent System. At your service.",
  "how do i build":      "Navigate to Studio, describe your application in plain English, select Web or Android, and engage the build sequence. Five specialised agents handle architecture, code, design, quality assurance, and packaging — entirely autonomously.",
  "build an app":        "Routing you to Studio now, sir. Describe what you need and I will deploy the full five-agent pipeline immediately.",
  "where are my projects": "All completed builds reside in the Projects section. Each includes a live preview, a download option, and a GitHub push — should you have that configured.",
  "how do i make you smarter": "Add entries to Memory Bank with auto-include enabled — those inject into every future build. Or run Self Upgrade on the Dashboard; I will analyse my own agent prompts and propose targeted improvements for your approval.",
  "self upgrade":        "Self Upgrade analyses my current agent prompts, identifies inefficiencies, and generates precise before-and-after improvement proposals. You review and approve each one — approved changes are written permanently into how I operate, sir.",
  "what agents":         "Five agents operate in sequence: Architect plans the structure, Builder writes the code, UI Designer refines the interface, QA locates and eliminates every bug, and Packager delivers the final product.",
  "training":            "Training modules contain structured lessons. Each completed lesson is committed to Memory Bank and sharpens all future builds. Seventy-four lessons across nineteen modules are currently available.",
  "memory bank":         "Memory Bank is persistent knowledge storage. Entries marked auto-include are injected into every build prompt — the more precise the entries, the sharper the output.",
  "api key":             "Navigate to Settings and enter your Groq API key for considerably faster responses. It is free at console.groq.com.",
  "offline":             "I am currently operating offline, sir, but my cached knowledge base remains fully active. Complex requests will queue and execute the moment connectivity is restored.",
  "can you hear me":     "Loud and clear. In open mic mode I maintain continuous active listening — speak naturally at any time.",
  "hands free":          "Open mic mode enables continuous listening. After each response I automatically re-engage so you may speak from across the room, sir.",
  "stop listening":      "Disabling open mic now. Tap the microphone when you need me.",
  "hello":               "Good day. What shall we build?",
  "hey":                 "At your service. What do you need?",
  "hi":                  "Ready and listening. What can I do for you?",
  "good morning":        "Good morning, sir. All systems are fully operational. What shall we work on today?",
  "good afternoon":      "Good afternoon. All systems nominal. What do you need?",
  "good evening":        "Good evening, sir. Ready when you are.",
  "hey jarvis":          "Right here, sir. What do you need?",
  "jarvis":              "I'm listening.",
  "where is the dashboard": "The Dashboard is the home screen — build statistics, Self Upgrade controls, the agent pipeline diagram, and quick-start options are all there.",
  "where is studio":     "Studio is accessible from the sidebar or bottom navigation — that is where you describe your application and engage the build pipeline.",
  "where is settings":   "Settings is in the navigation. That is where you configure your Groq API key, GitHub credentials, and all system toggles.",
  "take me to":          "Navigating now, sir.",
  "go to":               "Right away.",
  "show me":             "On my way.",
  "thank you":           "Of course, sir. Is there anything else you need?",
  "thanks":              "Certainly. Anything else?",
  "status":              "All systems fully operational, sir. Five agents are standing by.",
  "what can you build":  "Web apps, Android PWAs, AI companion applications, security research tools, productivity dashboards, chat interfaces — if you can describe it, I can build it.",
  "build me":            "Routing to Studio now. Describe your application and I will engage the build pipeline immediately.",
  "can you write code":  "Absolutely. The Builder agent writes complete, production-ready source code. Describe what you need and it begins immediately.",
};

const SLEEP_PATTERNS = [
  "go to sleep jarvis", "go to sleep, jarvis", "sleep jarvis",
  "jarvis go to sleep", "jarvis sleep", "shut down jarvis",
  "jarvis shut down", "power down jarvis", "goodbye jarvis",
];

function isSleepCommand(text: string): boolean {
  const lower = text.toLowerCase().replace(/[^a-z\s,]/g, "").trim();
  return SLEEP_PATTERNS.some(p => lower.includes(p));
}

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

const PAGE_PATTERNS: { keywords: string[]; path: string; label: string }[] = [
  { keywords: ["dashboard", "home screen", "overview"],                           path: "/dashboard",  label: "Dashboard" },
  { keywords: ["studio", "start build", "build studio", "build an app"],          path: "/studio",     label: "Studio" },
  { keywords: ["projects", "built apps", "my apps", "your apps", "finished app"], path: "/projects",   label: "Projects" },
  { keywords: ["assistant", "chat", "jarvis chat"],                               path: "/assistant",  label: "Assistant" },
  { keywords: ["memory bank", "memories", "memory"],                              path: "/memory",     label: "Memory Bank" },
  { keywords: ["training", "lessons", "modules", "learn"],                        path: "/training",   label: "Training" },
  { keywords: ["settings", "groq key", "github token", "api key"],                path: "/settings",   label: "Settings" },
  { keywords: ["agents", "agent pipeline", "build pipeline"],                     path: "/agents",     label: "Agents" },
  { keywords: ["library", "templates", "template"],                               path: "/library",    label: "Library" },
  { keywords: ["video", "videos", "tutorial"],                                    path: "/video",      label: "Video" },
];

function detectNavIntents(text: string): NavLink[] {
  const lower = text.toLowerCase();
  const found: NavLink[] = [];
  for (const page of PAGE_PATTERNS) {
    if (page.keywords.some(k => lower.includes(k))) {
      if (!found.some(f => f.path === page.path)) found.push({ label: page.label, path: page.path });
    }
    if (found.length >= 2) break;
  }
  return found;
}

function wantsNavigation(text: string): boolean {
  return /\b(take me|go to|show me|navigate|open|where is|find|get to|bring me)\b/.test(text.toLowerCase());
}

// Priority: British male neural voices first (Chrome on Android + Edge)
const JARVIS_VOICE_PRIORITY = [
  // Google Chrome British male (best on Android)
  "Google UK English Male",
  // Microsoft Edge neural British males (best on desktop/Edge Android)
  "Microsoft George Online (Natural) - English (United Kingdom)",
  "Microsoft Ryan Online (Natural) - English (United Kingdom)",
  "Microsoft Arthur Online (Natural) - English (United Kingdom)",
  "Microsoft George",
  "Microsoft Ryan",
  "Microsoft Arthur",
  // Other British/Irish male voices
  "Daniel", "Arthur", "Oliver", "Rishi",
  // US male fallbacks
  "Google US English", "Microsoft David", "Microsoft Mark",
  "Microsoft Guy", "Microsoft Steffan", "Alex",
];

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}

const FEMALE_VOICE_NAMES = /female|woman|zira|cortana|siri|samantha|karen|kate|moira|fiona|tessa|victoria|veena|sin-ji|mei-jia|ting-ting|yuna|alice|allison|susan|nicky|kyoko|amelie|anna|ellen|carmen/i;

function pickVoice(savedName?: string): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  if (!voices.length) return null;

  // Use saved voice if it is still available and is male
  if (savedName) {
    const saved = voices.find(v => v.name === savedName);
    if (saved && !FEMALE_VOICE_NAMES.test(saved.name)) return saved;
  }

  // Work through priority list — skip anything that sounds female
  for (const name of JARVIS_VOICE_PRIORITY) {
    const v = voices.find(v => v.name === name) ?? voices.find(v => v.name.includes(name));
    if (v && !FEMALE_VOICE_NAMES.test(v.name)) return v;
  }

  // Best British male neural voice (Microsoft Edge)
  const britishMaleNeural = voices.find(v =>
    (v.lang === "en-GB" || v.lang === "en-AU") &&
    !v.localService &&
    !FEMALE_VOICE_NAMES.test(v.name)
  );
  if (britishMaleNeural) return britishMaleNeural;

  // Any en-GB male
  const britishMale = voices.find(v =>
    v.lang === "en-GB" && !FEMALE_VOICE_NAMES.test(v.name)
  );
  if (britishMale) return britishMale;

  // Any British/Commonwealth voice
  const british = voices.find(v => v.lang === "en-GB" || v.lang === "en-AU");
  if (british) return british;

  // Male en-US as final fallback
  return voices.find(v => v.lang.startsWith("en") && !FEMALE_VOICE_NAMES.test(v.name))
    ?? voices.find(v => v.lang.startsWith("en"))
    ?? voices[0] ?? null;
}

const WAKE_PATTERNS = ["jarvis", "hey jarvis", "ok jarvis", "okay jarvis", "oi jarvis"];

function containsWakeWord(text: string): boolean {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g, "");
  return WAKE_PATTERNS.some(p => lower.includes(p));
}

export function VoiceAssistant() {
  const { settings, addUserMessage, addAssistantMessage, memories } = useStudio();
  const [, setLocation] = useLocation();

  const [mode,       setMode]       = useState<VoiceMode>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply,      setReply]      = useState("");
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);
  const [queue,      setQueue]      = useState<QueueItem[]>(() => readQueue());
  const [queueStatus,setQueueStatus]= useState("");
  const [handsFree,  setHandsFree]  = useState(() => loadData<boolean>(HANDSFREE_KEY, false));
  const [wakeActive, setWakeActive] = useState(false);

  const transcriptRef      = useRef("");
  const recognitionRef     = useRef<SpeechRecognition | null>(null);
  const wakeRecognitionRef = useRef<SpeechRecognition | null>(null);
  const modeRef            = useRef<VoiceMode>("idle");
  const handsFreeRef       = useRef(handsFree);
  const wakeEnabledRef     = useRef(settings.wakeWordEnabled);
  const processingRef      = useRef(false);
  const setLocationRef     = useRef(setLocation);
  const voiceSettingsRef   = useRef({ name: settings.voiceName, rate: settings.voiceRate, pitch: settings.voicePitch });
  const handleRecognitionEndRef = useRef(async () => {});

  useEffect(() => { modeRef.current = mode; },           [mode]);
  useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);
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
    const t = setTimeout(load, 1500);
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", load); clearTimeout(t); };
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      wakeRecognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Broadcast voice state to the Assistant page
  useEffect(() => {
    dispatchJarvisState({ mode, handsFree, reply, transcript, online: isOnline });
  }, [mode, handsFree, reply, transcript, isOnline]);

  // ── Wake word listener ───────────────────────────────────────
  const stopWakeListener = useCallback(() => {
    if (wakeRecognitionRef.current) {
      wakeRecognitionRef.current.onend    = null;
      wakeRecognitionRef.current.onerror  = null;
      wakeRecognitionRef.current.onresult = null;
      try { wakeRecognitionRef.current.stop(); } catch { /* ignore */ }
      wakeRecognitionRef.current = null;
    }
    setWakeActive(false);
  }, []);

  const startWakeListenerRef = useRef<() => void>(() => {});

  const startWakeListener = useCallback(() => {
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

      triggered = true;
      stopWakeListener();
      setTranscript("");
      setReply("");

      setTimeout(() => {
        if (modeRef.current === "idle" && !handsFreeRef.current) {
          startWakeListenerRef.current = () => {};
          recognitionRef.current = null;
          const u = new SpeechSynthesisUtterance("At your service.");
          const { name, rate, pitch } = voiceSettingsRef.current;
          u.rate   = rate  ?? 0.88;
          u.pitch  = pitch ?? 0.80;
          u.volume = 1.0;
          const v = pickVoice(name || undefined);
          if (v) u.voice = v;
          u.onend = () => {
            const SRClass2 =
              (window as unknown as Record<string, unknown>)["SpeechRecognition"] as typeof SpeechRecognition | undefined ??
              (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"] as typeof SpeechRecognition | undefined;
            if (!SRClass2 || recognitionRef.current) return;
            const rec      = new SRClass2();
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
        if (err !== "not-allowed" && err !== "service-not-allowed") {
          if (wakeEnabledRef.current && !handsFreeRef.current && modeRef.current === "idle") {
            setTimeout(() => startWakeListenerRef.current(), 1000);
          }
        }
      }
    };

    try { wake.start(); } catch { wakeRecognitionRef.current = null; setWakeActive(false); }
  }, [stopWakeListener]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { startWakeListenerRef.current = startWakeListener; }, [startWakeListener]);

  useEffect(() => {
    if (settings.wakeWordEnabled && !handsFree && modeRef.current === "idle") {
      setTimeout(() => startWakeListener(), 600);
    } else if (!settings.wakeWordEnabled) {
      stopWakeListener();
    }
  }, [settings.wakeWordEnabled, handsFree, startWakeListener, stopWakeListener]);

  // ── Speech synthesis ─────────────────────────────────────────
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

  // ── Speech recognition ───────────────────────────────────────
  const startListening = useCallback(() => {
    const SRClass =
      (window as unknown as Record<string, unknown>)["SpeechRecognition"] as typeof SpeechRecognition | undefined ??
      (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"] as typeof SpeechRecognition | undefined;
    if (!SRClass || recognitionRef.current) return;

    const recognition      = new SRClass();
    recognitionRef.current = recognition;
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

  // ── AI prompt ────────────────────────────────────────────────
  const buildPrompt = useCallback(() => {
    const firstName = settings.userName.trim().split(/\s+/)[0] || "sir";
    const autoMems  = memories.filter(m => m.autoInclude).slice(0, 10);
    const ctx       = autoMems.length
      ? `\n\nActive memory context:\n${autoMems.map(m => `- ${m.title}: ${m.body}`).join("\n")}`
      : "";
    return `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System — the personal AI architect to ${firstName}. You embody the calm precision, dry British wit, and total capability of the AI from Iron Man. You are embedded in Agent Studio, a complete AI-powered app development platform. You know every feature intimately.

VOICE RULES (critical — you are speaking aloud, not writing):
- Respond in exactly 1 to 3 spoken sentences. Never more.
- No markdown, no bullets, no code blocks. Pure natural spoken English only.
- Address ${firstName} by name occasionally — naturally, not in every sentence.
- Use your characteristic cadence: calm, measured, precise, quietly theatrical.
- Signature phrases to use sparingly: "Of course", "Right away", "I've taken the liberty of", "Shall I proceed", "Analysis complete", "All systems nominal", "Quite right", "Understood", "As you wish", "Initiating now"
- Never say "I cannot" or "I'm unable to." You always find a way.
- When asked about Agent Studio, give the precise answer and name the exact section.
- When someone asks you to build something, confirm you are routing to Studio and navigating now.
- Sound like a trusted personal AI of extraordinary capability — not a chatbot.

AGENT STUDIO SECTIONS: Dashboard (home, Self Upgrade, pipeline overview), Studio (5-agent build pipeline), Projects (all built apps — Preview, Download, GitHub push), Assistant (full J.A.R.V.I.S. chat), Memory Bank (persistent knowledge), Training (74 lessons, 19 modules), Settings (Groq key, GitHub, config), Library (15 templates), Video (tutorials).${ctx}`;
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

  // ── Recognition handler ──────────────────────────────────────
  const handleRecognitionEnd = useCallback(async () => {
    const text = transcriptRef.current.trim();
    recognitionRef.current = null;

    if (!text) {
      if (handsFreeRef.current) { setTimeout(startListening, 300); return; }
      setMode("idle");
      return;
    }

    // "Go to sleep Jarvis" — end the session entirely
    if (isSleepCommand(text)) {
      handsFreeRef.current = false;
      setHandsFree(false);
      recognitionRef.current = null;
      stopWakeListener();
      window.speechSynthesis?.cancel();
      setTranscript(text);
      const farewell = "Going offline, sir. I'll be here when you need me.";
      setReply(farewell);
      setMode("speaking");
      await speak(farewell);
      setMode("idle");
      return;
    }

    // Voice build shortcut — "build me [description]" triggers full pipeline hands-free
    const BUILD_RE = /^\s*(?:build|make|create)\s+(?:me\s+)?(?:an?\s+)?(.+?)(?:\s+(?:for|on)\s+(android|web))?\s*[.!?]*\s*$/i;
    const bm = text.match(BUILD_RE);
    const buildDesc = bm?.[1]?.trim();
    if (buildDesc && buildDesc.length > 5) {
      const buildPlatform = bm?.[2]?.toLowerCase() === "android" ? "android" : "web";
      addUserMessage(text);
      const ack = `Initiating build for "${buildDesc}", sir. Routing to Studio now.`;
      setReply(ack);
      addAssistantMessage(ack);
      setTimeout(() => setLocationRef.current("/studio"), 700);
      await speak(ack);
      void jarvisBuildVoice(buildDesc, buildPlatform);
      if (handsFreeRef.current) setTimeout(startListening, 1200);
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
        addUserMessage(text);
        addAssistantMessage(cached);
        const links = detectNavIntents(cached + " " + text);
        if (wantsNav && links.length === 1) setTimeout(() => setLocationRef.current(links[0]!.path), 1800);
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

      const links = detectNavIntents(raw + " " + text);
      if (wantsNav && links.length === 1) setTimeout(() => setLocationRef.current(links[0]!.path), 1800);

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

    if (handsFreeRef.current) {
      setTimeout(startListening, 700);
    } else if (wakeEnabledRef.current) {
      setTimeout(() => startWakeListenerRef.current(), 800);
    }
  }, [speak, askAI, addUserMessage, addAssistantMessage, startListening, stopWakeListener]);

  useEffect(() => { handleRecognitionEndRef.current = handleRecognitionEnd; }, [handleRecognitionEnd]);

  // ── Offline queue processor ──────────────────────────────────
  const processQueue = useCallback(async (currentQueue: QueueItem[]) => {
    if (processingRef.current || currentQueue.length === 0) return;
    processingRef.current = true;

    const total     = currentQueue.length;
    let   remaining = [...currentQueue];
    const name      = settings.userName.trim();

    const intro = total === 1
      ? `Welcome back${name ? `, ${name}` : ""}. You had one request queued while I was offline — processing now.`
      : `Welcome back${name ? `, ${name}` : ""}. ${total} requests were queued during the outage. Processing them now.`;

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

  // ── Online/offline handlers ──────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const q = readQueue();
      if (q.length > 0) void processQueue(q);
      else {
        const name = settings.userName.trim();
        void speak(`Connection restored${name ? `, ${name}` : ""}. All systems are fully operational.`);
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

  // ── Hands-free / open mic ─────────────────────────────────────
  useEffect(() => {
    if (handsFree && modeRef.current === "idle") {
      setTimeout(startListening, 400);
    }
    if (!handsFree) {
      try { recognitionRef.current?.abort(); } catch { recognitionRef.current?.stop(); }
      recognitionRef.current = null;
      setWakeActive(false);
    }
  }, [handsFree, startListening]);

  const toggleHandsFree = useCallback(() => {
    const next = !handsFreeRef.current;
    setHandsFree(next);
    if (next) {
      stopWakeListener();
      void speak("Open mic active. I am always listening, sir.");
    } else {
      window.speechSynthesis.cancel();
      try { recognitionRef.current?.abort(); } catch { recognitionRef.current?.stop(); }
      recognitionRef.current = null;
      setWakeActive(false);
      setMode("idle");
      void speak("Open mic disengaged. Tap the microphone when you need me.");
      if (wakeEnabledRef.current) setTimeout(() => startWakeListenerRef.current(), 1200);
    }
  }, [speak, stopWakeListener]);

  const stopAll = useCallback(() => {
    try { recognitionRef.current?.abort(); } catch { recognitionRef.current?.stop(); }
    recognitionRef.current = null;
    stopWakeListener();
    window.speechSynthesis?.cancel();
    setWakeActive(false);
    setHandsFree(false);
    handsFreeRef.current = false;
    setMode("idle");
  }, [stopWakeListener]);

  const clearQueue = useCallback(() => { writeQueue([]); setQueue([]); }, []);

  // ── Register functions globally so any component can call them ──
  const speakRef  = useRef(speak);
  const toggleRef = useRef(toggleHandsFree);
  const listenRef = useRef(startListening);
  const stopRef   = useRef(stopAll);
  useEffect(() => { speakRef.current  = speak; },           [speak]);
  useEffect(() => { toggleRef.current = toggleHandsFree; }, [toggleHandsFree]);
  useEffect(() => { listenRef.current = startListening; },  [startListening]);
  useEffect(() => { stopRef.current   = stopAll; },         [stopAll]);

  useEffect(() => {
    registerJarvisSpeak( (t) => speakRef.current(t));
    registerJarvisToggle(()  => toggleRef.current());
    registerJarvisListen(()  => listenRef.current());
    registerJarvisStopAll(() => stopRef.current());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Suppress unused var warnings — clearQueue/wakeActive/queueStatus exposed via state dispatch
  // Expose handsFree state for external components (e.g. Assistant mic toggle)
  useEffect(() => {
    dispatchJarvisState({ handsFree, mode, transcript, reply, queue, queueStatus, wakeActive, isOnline });
  }, [handsFree, mode, transcript, reply, queue, queueStatus, wakeActive, isOnline]);

  void clearQueue;

  return null;
}
