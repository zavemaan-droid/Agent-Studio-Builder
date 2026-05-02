import { useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import { pingPollinations } from "@/lib/ai";
import { saveData, KEYS } from "@/lib/storage";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  // Settings save IMMEDIATELY on every change — no local state buffering
  const set = (patch: Partial<typeof settings>) => updateSettings(patch);

  const runHealthChecks = async () => {
    setTesting(true);
    setHealth({ pollinations: "checking", groq: "checking", github: "checking" });

    const [polOk] = await Promise.all([
      pingPollinations(),
    ]);
    setHealth(h => ({ ...h, pollinations: polOk ? "ok" : "fail" }));

    // Groq check
    if (settings.groqKey.trim().length > 20) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${settings.groqKey}` },
          signal: AbortSignal.timeout(5000),
        });
        setHealth(h => ({ ...h, groq: res.ok ? "ok" : "fail" }));
      } catch {
        setHealth(h => ({ ...h, groq: "fail" }));
      }
    } else {
      setHealth(h => ({ ...h, groq: "idle" }));
    }

    // GitHub check
    if (settings.githubToken.trim().length > 10) {
      try {
        const res = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${settings.githubToken}` },
          signal: AbortSignal.timeout(5000),
        });
        setHealth(h => ({ ...h, github: res.ok ? "ok" : "fail" }));
      } catch {
        setHealth(h => ({ ...h, github: "fail" }));
      }
    } else {
      setHealth(h => ({ ...h, github: "idle" }));
    }

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

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">All settings save automatically</p>
      </div>

      <div className="p-5 space-y-6 max-w-lg">

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
