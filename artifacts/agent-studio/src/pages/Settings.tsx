import { useState, useEffect } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import { saveData, KEYS } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { getAvailableVoices } from "@/components/VoiceAssistant";
import { BuildRepairConstraints } from "@/components/BuildRepairConstraints";
import { Eye, EyeOff, Volume2, Radio, Loader2, Circle, Download, Settings2 } from "lucide-react";

export default function SettingsPage() {
  const { settings, updateSettings, memories, projects } = useStudio();
  const [showGroq, setShowGroq] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testingVoice, setTestingVoice] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

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

  const set = (patch: Partial<typeof settings>) => updateSettings(patch);

  const testVoice = () => {
    if (!("speechSynthesis" in window) || testingVoice) return;
    window.speechSynthesis.cancel();
    setTestingVoice(true);
    const u = new SpeechSynthesisUtterance(`Good day, ${settings.userName.split(" ")[0] || "sir"}. Build and repair constraints are ready.`);
    u.rate = settings.voiceRate || 0.88;
    u.pitch = settings.voicePitch || 0.8;
    u.volume = 1;
    const selected = settings.voiceName ? getAvailableVoices().find(v => v.name === settings.voiceName) : null;
    if (selected) u.voice = selected;
    u.onend = () => setTestingVoice(false);
    u.onerror = () => setTestingVoice(false);
    window.speechSynthesis.speak(u);
  };

  const exportAll = () => {
    const data = { settings, memories, projects, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "agent-studio-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleClearAll = () => {
    if (!clearConfirm) { setClearConfirm(true); return; }
    Object.values(KEYS).forEach(k => saveData(k, null));
    saveData("modules", null);
    window.location.reload();
  };

  const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#ef4444","#84cc16"];
  const appLink = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Profile, providers, Jarvis voice, and Build & Repair rules</p>
      </div>

      <div className="p-5 space-y-6 max-w-2xl mx-auto w-full pb-24">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ background: settings.userColor || "#6366f1" }}>
                {settings.userName.trim() ? settings.userName.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?"}
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <input type="text" value={settings.userName} onChange={e => set({ userName: e.target.value })} placeholder="Your name" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50" maxLength={32} />
                <div className="flex gap-1.5 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => set({ userColor: c })} className={cn("w-5 h-5 rounded-full transition-all", settings.userColor === c ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : "hover:scale-110")} style={{ background: c }} title={c} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Providers</h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <p className="text-sm font-medium">Pollinations AI</p>
                <p className="text-xs text-muted-foreground">Free default · no key needed</p>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs"><Circle className="w-2 h-2 fill-emerald-400" />Active</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Groq API Key <span className="font-normal">(optional)</span></label>
              <div className="relative">
                <input type={showGroq ? "text" : "password"} value={settings.groqKey} onChange={e => set({ groqKey: e.target.value })} placeholder="gsk_..." className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 pr-9 font-mono" />
                <button onClick={() => setShowGroq(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showGroq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">GitHub Token <span className="font-normal">(optional)</span></label>
              <div className="relative">
                <input type={showGithub ? "text" : "password"} value={settings.githubToken} onChange={e => set({ githubToken: e.target.value })} placeholder="ghp_..." className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 pr-9 font-mono" />
                <button onClick={() => setShowGithub(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showGithub ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Repository</label>
              <input value={settings.githubRepo} onChange={e => set({ githubRepo: e.target.value })} placeholder="username/my-apps" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Build Preferences</h2>
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {[
              { key: "autoDownload" as const, label: "Auto-download on complete", desc: "Automatically download project files when build finishes" },
              { key: "liveCodeFeed" as const, label: "Live code feed", desc: "Show agent output in real time" },
              { key: "selfUpgrading" as const, label: "Self-learning", desc: "Add build patterns to memory after each build" },
              { key: "browserEnabled" as const, label: "Browser research", desc: "Let Jarvis use browser support" },
              { key: "webResearchEnabled" as const, label: "Web lookups", desc: "Let Jarvis search current information when needed" },
              { key: "memoryRecallEnabled" as const, label: "Memory recall", desc: "Let Jarvis use saved memory for faster answers" },
              { key: "voiceIdentityEnabled" as const, label: "Trusted speaker mode", desc: "Only listen automatically for the trusted speaker" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-4 gap-3">
                <div><p className="text-sm">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                <button onClick={() => set({ [key]: !settings[key] })} className={cn("w-10 h-5.5 rounded-full relative transition-colors shrink-0", settings[key] ? "bg-primary" : "bg-muted")}> <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm", settings[key] ? "left-[22px]" : "left-0.5")} /> </button>
              </div>
            ))}
          </div>
        </section>

        <BuildRepairConstraints />

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jarvis Voice</h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Voice</label>
              <select value={settings.voiceName} onChange={e => set({ voiceName: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50">
                <option value="">Auto (best available)</option>
                {voices.map(v => <option key={v.name} value={v.name}>{v.name}{!v.localService ? " ✦" : ""}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center"><label className="text-xs text-muted-foreground">Speed</label><span className="text-xs font-mono">{settings.voiceRate.toFixed(2)}×</span></div>
              <input type="range" min="0.5" max="1.4" step="0.02" value={settings.voiceRate} onChange={e => set({ voiceRate: parseFloat(e.target.value) })} className="w-full accent-primary" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center"><label className="text-xs text-muted-foreground">Pitch</label><span className="text-xs font-mono">{settings.voicePitch.toFixed(2)}</span></div>
              <input type="range" min="0.5" max="1.2" step="0.02" value={settings.voicePitch} onChange={e => set({ voicePitch: parseFloat(e.target.value) })} className="w-full accent-primary" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 text-xs" onClick={testVoice} disabled={testingVoice}>{testingVoice ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Speaking…</> : <><Volume2 className="w-3.5 h-3.5 mr-1.5" />Test Voice</>}</Button>
              <Button size="sm" variant="outline" className="text-xs px-3" onClick={() => set({ voiceName: "", voiceRate: 0.88, voicePitch: 0.80 })}>Reset</Button>
            </div>

            <div className="flex items-start justify-between gap-4 pt-3 border-t border-border/50">
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2"><Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" /><span className="text-sm font-medium">Hey Jarvis — Wake Word</span></div>
                <p className="text-xs text-muted-foreground leading-relaxed">Say “Hey Jarvis” to activate hands-free when supported.</p>
              </div>
              <button type="button" role="switch" aria-checked={settings.wakeWordEnabled} onClick={() => set({ wakeWordEnabled: !settings.wakeWordEnabled })} className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5", settings.wakeWordEnabled ? "bg-cyan-500" : "bg-input")}><span className={cn("pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform", settings.wakeWordEnabled ? "translate-x-5" : "translate-x-0")} /></button>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data</h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex gap-2 text-xs text-muted-foreground mb-3 flex-wrap"><span>{projects.length} projects</span><span>·</span><span>{memories.length} memories</span><span>·</span><span>Stored on this device</span></div>
            {appLink && <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground break-all">App link: <span className="text-foreground">{appLink}</span></div>}
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={exportAll}><Download className="w-3.5 h-3.5 mr-1.5" />Export All Data</Button>
            <Button size="sm" variant={clearConfirm ? "destructive" : "ghost"} className="w-full text-xs text-destructive hover:text-destructive" onClick={handleClearAll}>{clearConfirm ? "Click again to confirm — this cannot be undone" : "Clear All Data"}</Button>
            {clearConfirm && <button onClick={() => setClearConfirm(false)} className="w-full text-xs text-muted-foreground text-center">Cancel</button>}
          </div>
        </section>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex gap-3">
          <Settings2 className="w-5 h-5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">Build & Repair Constraints are now controlled here in Settings and used as the default rule set for both new builds and uploaded app repair/rebuild jobs.</p>
        </div>
      </div>
    </div>
  );
}
