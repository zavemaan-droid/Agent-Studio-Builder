import { useState, useEffect } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import { pingPollinations } from "@/lib/ai";
import { saveData, KEYS } from "@/lib/storage";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, Circle, Volume2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAvailableVoices } from "@/components/VoiceAssistant";

type HealthState = "idle" | "checking" | "ok" | "fail";

export default function SettingsPage() {
  const { settings, updateSettings, memories, projects } = useStudio();
  const [showGroq, setShowGroq] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [health, setHealth] = useState<Record<string, HealthState>>({
    pollinations: "idle", groq: "idle", github: "idle",
  });
  const [testing, setTesting] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testingVoice, setTestingVoice] = useState(false);

  // Load available voices — Android needs a small delay for neural voices
  useEffect(() => {
    const load = () => {
      const v = getAvailableVoices().filter(v => v.lang.startsWith("en"));
      if (v.length > 0) setVoices(v);
    };
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    const t = setTimeout(load, 1200);
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", load);
      clearTimeout(t);
    };
  }, []);

  const testVoice = () => {
    if (!("speechSynthesis" in window) || testingVoice) return;
    window.speechSynthesis.cancel();
    setTestingVoice(true);
    const u = new SpeechSynthesisUtterance(
      `Good day, ${settings.userName.split(" ")[0] || "sir"}. All systems are fully operational.`
    );
    u.rate   = settings.voiceRate;
    u.pitch  = settings.voicePitch;
    u.volume = 1.0;
    if (settings.voiceName) {
      const v = getAvailableVoices().find(v => v.name === settings.voiceName);
      if (v) u.voice = v;
    } else {
      // Auto-pick best voice same as Jarvis does
      const all = getAvailableVoices();
      const best = all.find(v => v.name === "Google UK English Male")
        ?? all.find(v => v.name.includes("Google UK"))
        ?? all.find(v => !v.localService && v.lang.startsWith("en"))
        ?? all.find(v => v.lang === "en-GB")
        ?? all.find(v => v.lang.startsWith("en"))
        ?? null;
      if (best) u.voice = best;
    }
    u.onend   = () => setTestingVoice(false);
    u.onerror = () => setTestingVoice(false);
    window.speechSynthesis.speak(u);
  };

  // Settings save IMMEDIATELY on every change — no local state buffering
  const set = (patch: Partial<typeof settings>) => updateSettings(patch);

  const runHealthChecks = async () => {
    setTesting(true);
    setHealth({ pollinations: "checking", groq: "checking", github: "checking" });

    const [polOk, groqOk, githubOk] = await Promise.all([
      pingPollinations(),
      (async () => {
        if (settings.groqKey.trim().length <= 20) return true;
        try {
          const res = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { Authorization: `Bearer ${settings.groqKey}` },
            signal: AbortSignal.timeout(5000),
          });
          return res.ok;
        } catch {
          return false;
        }
      })(),
      (async () => {
        if (settings.githubToken.trim().length <= 10) return true;
        try {
          const res = await fetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${settings.githubToken}` },
            signal: AbortSignal.timeout(5000),
          });
          return res.ok;
        } catch {
          return false;
        }
      })(),
    ]);
    setHealth(h => ({ ...h, pollinations: polOk ? "ok" : "fail" }));
    setHealth(h => ({ ...h, groq: groqOk ? "ok" : "fail" }));
    setHealth(h => ({ ...h, github: githubOk ? "ok" : "fail" }));

    setTesting(false);
  };

  const handleClearAll = () => {
    if (!clearConfirm) { setClearConfirm(true); return; }
    Object.values(KEYS).forEach(k => saveData(k, null));
    saveData("modules", null);
    window.location.reload();
  };

  const exportAll = () => {
    const data = {
      settings, memories, projects,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "agent-studio-backup.json";
    a.click();
  };

  const appLink = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

  const HealthChip = ({ name, label }: { name: string; label: string }) => {
    const state = health[name] ?? "idle";
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          {state === "idle" && <Circle className="w-3 h-3 text-muted-foreground/40" />}
          {state === "checking" && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
          {state === "ok" && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          {state === "fail" && <XCircle className="w-3 h-3 text-destructive" />}
          <span className={cn("text-xs",
            state === "ok" ? "text-emerald-400" :
            state === "fail" ? "text-destructive" :
            state === "checking" ? "text-amber-400" :
            "text-muted-foreground"
          )}>
            {state === "idle" ? "not tested" : state === "checking" ? "checking..." : state === "ok" ? "connected" : "failed"}
          </span>
        </div>
      </div>
    );
  };

  const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#ef4444","#84cc16"];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">All settings save automatically</p>
      </div>

      <div className="p-5 space-y-6 max-w-lg">

        {/* Profile */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
                style={{ background: settings.userColor || "#6366f1" }}
              >
                {settings.userName.trim()
                  ? settings.userName.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)
                  : "?"}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={settings.userName}
                  onChange={e => set({ userName: e.target.value })}
                  placeholder="Your name"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                  maxLength={32}
                />
                <div className="flex gap-1.5 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => set({ userColor: c })}
                      className={cn(
                        "w-5 h-5 rounded-full transition-all",
                        settings.userColor === c ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : "hover:scale-110"
                      )}
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Configuration */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Configuration</h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            {/* Pollinations (always on) */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <p className="text-sm font-medium">Pollinations AI</p>
                <p className="text-xs text-muted-foreground">Free forever · No key needed · Always active</p>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                <Circle className="w-2 h-2 fill-emerald-400" />
                Active
              </div>
            </div>

            {/* Groq (optional boost) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Groq API Key <span className="text-muted-foreground font-normal">(optional)</span></p>
                  <p className="text-xs text-muted-foreground">Faster responses · Free at console.groq.com</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showGroq ? "text" : "password"}
                  value={settings.groqKey}
                  onChange={e => set({ groqKey: e.target.value })}
                  placeholder="gsk_..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 pr-9 font-mono"
                  data-testid="groq-key-input"
                />
                <button
                  onClick={() => setShowGroq(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showGroq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {settings.groqKey.length > 0 && settings.groqKey.length < 20 && (
                <p className="text-xs text-destructive">Key looks too short — check it's complete</p>
              )}
            </div>
          </div>
        </section>

        {/* GitHub */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">GitHub <span className="font-normal normal-case text-muted-foreground">(optional)</span></h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Personal Access Token</label>
              <div className="relative">
                <input
                  type={showGithub ? "text" : "password"}
                  value={settings.githubToken}
                  onChange={e => set({ githubToken: e.target.value })}
                  placeholder="ghp_..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 pr-9 font-mono"
                  data-testid="github-token-input"
                />
                <button onClick={() => setShowGithub(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showGithub ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Repository (user/repo)</label>
              <input
                value={settings.githubRepo}
                onChange={e => set({ githubRepo: e.target.value })}
                placeholder="username/my-apps"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                data-testid="github-repo-input"
              />
            </div>
          </div>
        </section>

        {/* Build preferences */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Build Preferences</h2>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {[
              { key: "autoDownload" as const, label: "Auto-download on complete", desc: "Automatically download project files when build finishes" },
              { key: "liveCodeFeed" as const, label: "Live code feed", desc: "Show agent output in real-time as it's generated" },
              { key: "selfUpgrading" as const, label: "Self-learning", desc: "Automatically add build patterns to memory after each build" },
              { key: "browserEnabled" as const, label: "Browser research", desc: "Let Jarvis use built-in web research and browser support" },
              { key: "webResearchEnabled" as const, label: "Web lookups", desc: "Let Jarvis search the internet for current information when needed" },
              { key: "memoryRecallEnabled" as const, label: "Memory recall", desc: "Let Jarvis use saved memory for faster, more relevant answers" },
              { key: "voiceIdentityEnabled" as const, label: "Trusted speaker mode", desc: "Only listen automatically when the trusted speaker is detected" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <button
                  onClick={() => set({ [key]: !settings[key] })}
                  className={cn(
                    "w-10 h-5.5 rounded-full relative transition-colors",
                    settings[key] ? "bg-primary" : "bg-muted"
                  )}
                  data-testid={`toggle-${key}`}
                >
                  <span className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                    settings[key] ? "left-[22px]" : "left-0.5"
                  )} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Speaker identity */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Speaker Identity</h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Trusted speaker name</label>
              <input
                type="text"
                value={settings.trustedSpeakerName}
                onChange={e => set({ trustedSpeakerName: e.target.value })}
                placeholder="Your name"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
              <p className="text-[10px] text-muted-foreground">
                This is a simple trust label, not true biometric voiceprint recognition.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={() => set({ voiceIdentityEnabled: !settings.voiceIdentityEnabled })}
            >
              {settings.voiceIdentityEnabled ? "Trusted speaker mode on" : "Enable trusted speaker mode"}
            </Button>
          </div>
        </section>

        {/* Jarvis Voice */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jarvis Voice</h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">

            {/* Voice picker */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Voice</label>
              <select
                value={settings.voiceName}
                onChange={e => set({ voiceName: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 appearance-none"
              >
                <option value="">Auto (best available)</option>
                {voices.map(v => (
                  <option key={v.name} value={v.name}>
                    {v.name}{!v.localService ? " ✦" : ""}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                ✦ = neural cloud voice (sounds best) · "Google UK English Male" is closest to JARVIS
              </p>
            </div>

            {/* Speed slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-muted-foreground">Speed</label>
                <span className="text-xs font-mono text-foreground">{settings.voiceRate.toFixed(2)}×</span>
              </div>
              <input
                type="range" min="0.5" max="1.4" step="0.02"
                value={settings.voiceRate}
                onChange={e => set({ voiceRate: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Slower</span>
                <span>JARVIS default: 0.88</span>
                <span>Faster</span>
              </div>
            </div>

            {/* Pitch slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-muted-foreground">Pitch</label>
                <span className="text-xs font-mono text-foreground">{settings.voicePitch.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0.5" max="1.2" step="0.02"
                value={settings.voicePitch}
                onChange={e => set({ voicePitch: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Deeper</span>
                <span>JARVIS default: 0.80</span>
                <span>Higher</span>
              </div>
            </div>

            {/* Test button + reset */}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 text-xs"
                onClick={testVoice}
                disabled={testingVoice}
              >
                {testingVoice
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Speaking…</>
                  : <><Volume2 className="w-3.5 h-3.5 mr-1.5" />Test Voice</>
                }
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs px-3"
                onClick={() => set({ voiceName: "", voiceRate: 0.88, voicePitch: 0.80 })}
                title="Reset to JARVIS defaults"
              >
                Reset
              </Button>
            </div>

            {/* Wake word toggle */}
            <div className="flex items-start justify-between gap-4 pt-3 border-t border-border/50">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-sm font-medium">Hey Jarvis — Wake Word</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-5.5">
                  Jarvis listens passively for your voice. Say <span className="text-cyan-400 font-medium">"Hey Jarvis"</span> to activate hands-free — no button tap needed. The bubble glows cyan when active.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.wakeWordEnabled}
                onClick={() => set({ wakeWordEnabled: !settings.wakeWordEnabled })}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-0.5",
                  settings.wakeWordEnabled ? "bg-cyan-500" : "bg-input"
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200",
                  settings.wakeWordEnabled ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>
        </section>

        {/* Health */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service Health</h2>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={runHealthChecks} disabled={testing} data-testid="health-check">
              {testing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Check All
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 divide-y divide-border">
            <HealthChip name="pollinations" label="Pollinations AI (free)" />
            <HealthChip name="groq" label="Groq API" />
            <HealthChip name="github" label="GitHub" />
          </div>
        </section>

        {/* Data */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data</h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex gap-2 text-xs text-muted-foreground mb-3">
              <span>{projects.length} projects</span>
              <span>·</span>
              <span>{memories.length} memories</span>
              <span>·</span>
              <span>All stored on this device</span>
            </div>
            {appLink && (
              <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground break-all">
                App link: <span className="text-foreground">{appLink}</span>
              </div>
            )}
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={exportAll} data-testid="export-data">
              Export All Data
            </Button>
            <Button
              size="sm"
              variant={clearConfirm ? "destructive" : "ghost"}
              className="w-full text-xs text-destructive hover:text-destructive"
              onClick={handleClearAll}
              data-testid="clear-data"
            >
              {clearConfirm ? "Click again to confirm — this cannot be undone" : "Clear All Data"}
            </Button>
            {clearConfirm && (
              <button onClick={() => setClearConfirm(false)} className="w-full text-xs text-muted-foreground text-center">Cancel</button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
