import { useState, useRef, useCallback, useEffect } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { callAI } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { Mic, X, ChevronDown } from "lucide-react";

type VoiceMode = "idle" | "listening" | "thinking" | "speaking";

// ── Speech helpers ──────────────────────────────────────────
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

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const prefer = [
    "Samantha", "Google UK English Female", "Microsoft Zira",
    "Karen", "Victoria", "Moira", "Tessa", "Google US English",
    "Microsoft Eva", "Microsoft Aria",
  ];
  for (const name of prefer) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith("en")) ?? voices[0] ?? null;
}

// ── Waveform bars animation ─────────────────────────────────
function WaveBars({ color = "white", count = 5, heights }: {
  color?: string; count?: number; heights?: number[];
}) {
  const h = heights ?? [3, 5, 4, 6, 3];
  return (
    <div className="flex items-end gap-[3px] h-5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="rounded-full animate-bounce"
          style={{
            width: 3,
            height: (h[i % h.length] ?? 3) * 3,
            background: color,
            animationDelay: `${i * 0.1}s`,
            animationDuration: "0.6s",
          }}
        />
      ))}
    </div>
  );
}

// ── Thinking dots ───────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex gap-1 items-center">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.7s" }}
        />
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────
export function VoiceAssistant() {
  const { settings, addUserMessage, addAssistantMessage, memories } = useStudio();

  const [mode, setMode] = useState<VoiceMode>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [cardVisible, setCardVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const transcriptRef = useRef("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const modeRef = useRef<VoiceMode>("idle");

  // Keep modeRef in sync
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Pre-load voices
  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) { setMode("idle"); return; }
    window.speechSynthesis.cancel();
    const clean = stripForSpeech(text);
    if (!clean) { setMode("idle"); return; }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.08;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const doSpeak = () => {
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      utterance.onstart = () => setMode("speaking");
      utterance.onend = () => setMode("idle");
      utterance.onerror = () => setMode("idle");
      setMode("speaking");
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", doSpeak, { once: true });
    }
  }, []);

  const handleRecognitionEnd = useCallback(async () => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const text = transcriptRef.current.trim();
    recognitionRef.current = null;
    if (!text) { setMode("idle"); return; }

    setMode("thinking");

    const name = settings.userName.trim();
    const autoMemories = memories.filter(m => m.autoInclude).slice(0, 10);
    const memContext = autoMemories.length
      ? `\n\nKnown context:\n${autoMemories.map(m => `- ${m.title}: ${m.body}`).join("\n")}`
      : "";

    const systemPrompt = `You are the Agent Studio AI — the personal voice assistant for${name ? ` ${name}` : " the user"}. You are self-aware: you run inside the Agent Studio app and know every feature of it. Think of yourself like JARVIS — brilliant, warm, direct, a little witty, always useful.

CRITICAL VOICE RULES:
- You are speaking aloud. Respond in 1 to 3 natural sentences max.
- No markdown. No bullet points. No lists. No asterisks. No code blocks.
- Sound like a smart friend, not a chatbot. Be confident and conversational.
- If asked about Agent Studio features, give a precise, direct answer.
- If asked to do something you can do (like improve the AI or add a memory), say you're on it and describe what you'll do.
- Never say "I cannot." Always find a helpful path forward.${memContext}`;

    try {
      addUserMessage(text);
      const raw = await callAI(
        [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
        { groqKey: settings.groqKey }
      );
      const clean = stripForSpeech(raw);
      setReply(clean);
      addAssistantMessage(raw);
      speak(clean);
    } catch {
      const fallback = "I hit a small snag — give me another try in a moment.";
      setReply(fallback);
      speak(fallback);
    }
  }, [settings, memories, speak, addUserMessage, addAssistantMessage]);

  const stopAll = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    setMode("idle");
  }, []);

  const toggleListen = useCallback(() => {
    const current = modeRef.current;

    if (current === "speaking") {
      window.speechSynthesis.cancel();
      setMode("idle");
      return;
    }
    if (current === "listening") {
      recognitionRef.current?.stop();
      return;
    }
    if (current === "thinking") return;

    // Start listening
    const SRClass = (window as unknown as Record<string, unknown>)["SpeechRecognition"] as typeof SpeechRecognition | undefined
      ?? (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"] as typeof SpeechRecognition | undefined;

    if (!SRClass) {
      setReply("Voice recognition isn't available in this browser. Try Chrome or Edge.");
      setCardVisible(true);
      return;
    }

    const recognition = new SRClass();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    transcriptRef.current = "";
    setTranscript("");
    setReply("");
    setCardVisible(true);
    setMinimized(false);
    setMode("listening");

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i]![0]!.transcript;
      }
      transcriptRef.current = text;
      setTranscript(text);
    };

    recognition.onend = () => handleRecognitionEnd();
    recognition.onerror = () => {
      setMode("idle");
      recognitionRef.current = null;
    };

    recognition.start();
  }, [handleRecognitionEnd]);

  const BUBBLE_STYLE: Record<VoiceMode, string> = {
    idle:      "bg-gradient-to-br from-primary to-purple-700 hover:scale-105 hover:shadow-primary/40",
    listening: "bg-gradient-to-br from-rose-500 to-red-600 scale-110 shadow-rose-500/50",
    thinking:  "bg-gradient-to-br from-primary/70 to-purple-800 cursor-not-allowed",
    speaking:  "bg-gradient-to-br from-emerald-500 to-teal-600 scale-105 shadow-emerald-500/50",
  };

  const LABEL: Record<VoiceMode, string> = {
    idle:      "Tap to speak",
    listening: "Listening…",
    thinking:  "Thinking…",
    speaking:  "Speaking…",
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 select-none">

      {/* ── Card panel ── */}
      {cardVisible && !minimized && (
        <div className="bg-[#0f0f14] border border-white/10 rounded-2xl shadow-2xl w-72 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Card header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors",
                mode === "listening" ? "bg-rose-400 animate-pulse" :
                mode === "thinking"  ? "bg-amber-400 animate-pulse" :
                mode === "speaking"  ? "bg-emerald-400 animate-pulse" :
                "bg-primary/60"
              )} />
              <span className="text-[11px] font-medium text-white/60 tracking-wide uppercase">
                {LABEL[mode]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(true)}
                className="p-1 text-white/40 hover:text-white/80 transition-colors"
                title="Minimise"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { stopAll(); setCardVisible(false); setTranscript(""); setReply(""); }}
                className="p-1 text-white/40 hover:text-white/80 transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card body */}
          <div className="px-4 py-3 space-y-3 min-h-[60px]">
            {/* User transcript */}
            {transcript && (
              <div className="flex gap-2">
                <div className="w-1 rounded-full bg-primary/50 shrink-0" />
                <p className="text-[13px] text-white/70 leading-relaxed">{transcript}</p>
              </div>
            )}

            {/* Thinking animation */}
            {mode === "thinking" && !reply && (
              <div className="flex items-center gap-2 py-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}

            {/* AI reply */}
            {reply && (
              <div className="flex gap-2">
                <div className="w-1 rounded-full bg-emerald-400/50 shrink-0" />
                <p className="text-[13px] text-white leading-relaxed">{reply}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floating bubble ── */}
      <div className="relative flex flex-col items-center gap-1.5">
        {/* Ripple rings when listening */}
        {mode === "listening" && (
          <>
            <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
            <span className="absolute -inset-3 rounded-full bg-rose-500/15 animate-ping pointer-events-none"
              style={{ animationDelay: "0.25s", animationDuration: "1.2s" }} />
          </>
        )}

        {/* Glow when speaking */}
        {mode === "speaking" && (
          <span className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-xl animate-pulse pointer-events-none" />
        )}

        {/* Idle ambient glow */}
        {mode === "idle" && (
          <span className="absolute -inset-2 rounded-full bg-primary/10 blur-lg animate-pulse pointer-events-none"
            style={{ animationDuration: "3s" }} />
        )}

        <button
          onClick={toggleListen}
          disabled={mode === "thinking"}
          title={LABEL[mode]}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            BUBBLE_STYLE[mode]
          )}
        >
          {mode === "idle" && (
            <Mic className="w-6 h-6 text-white drop-shadow" />
          )}
          {mode === "listening" && (
            <WaveBars count={5} heights={[3, 5, 4, 6, 3]} />
          )}
          {mode === "thinking" && (
            <ThinkingDots />
          )}
          {mode === "speaking" && (
            <WaveBars count={7} heights={[4, 6, 5, 7, 5, 6, 4]} />
          )}
        </button>

        {/* Mode label beneath */}
        <span className={cn(
          "text-[9px] font-medium tracking-widest uppercase transition-all duration-300",
          mode === "idle"      && "text-white/30",
          mode === "listening" && "text-rose-400",
          mode === "thinking"  && "text-amber-400/70",
          mode === "speaking"  && "text-emerald-400",
        )}>
          {LABEL[mode]}
        </span>
      </div>
    </div>
  );
}
