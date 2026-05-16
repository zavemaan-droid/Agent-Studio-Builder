import { useMemo, useState } from "react";
import { Lock, Save, SlidersHorizontal, ShieldAlert } from "lucide-react";

const STORAGE_KEY = "agent-studio:constraints";

type Constraint = {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
  ownerOnly?: boolean;
  locked?: boolean;
};

const CONSTRAINTS: Constraint[] = [
  { id: "familySafe", label: "Family-safe mode", description: "Keep generated apps safe for general audiences.", defaultOn: false },
  { id: "adultAllowed", label: "Adult / mature mode allowed", description: "Allow mature app concepts when legal and permitted.", defaultOn: false, ownerOnly: true },
  { id: "unfilteredCreative", label: "Unfiltered creative mode", description: "Reduce optional creative restrictions for owner/admin or eligible Pro jobs.", defaultOn: false, ownerOnly: true },
  { id: "offlineFirst", label: "Offline-first required", description: "Prefer local storage and offline behavior where possible.", defaultOn: false },
  { id: "noPaidApis", label: "No paid APIs", description: "Avoid paid providers unless explicitly approved.", defaultOn: true },
  { id: "pollinationsDefault", label: "Pollinations default", description: "Use Pollinations/free providers first when possible.", defaultOn: true },
  { id: "noExpo", label: "No Expo", description: "Keep web/PWA/Capacitor direction; do not convert builds to Expo.", defaultOn: true, locked: true },
  { id: "pwaAndroid", label: "PWA Android target", description: "Prefer installable Android-feeling PWA output.", defaultOn: true },
  { id: "securityHardening", label: "Security hardening", description: "Ask builders to check auth, storage, injections, and unsafe flows.", defaultOn: false },
  { id: "performancePriority", label: "Performance priority", description: "Favor speed, smaller bundles, caching, and lighter assets.", defaultOn: false },
  { id: "accessibilityPriority", label: "Accessibility priority", description: "Prefer readable UI, labels, tap sizes, and keyboard/screen-reader basics.", defaultOn: false },
  { id: "allowResearch", label: "Allow internet research", description: "Permit Jarvis/builders to research current best practices when needed.", defaultOn: false },
  { id: "allowDownloads", label: "Allow downloads with approval", description: "Let builders download resources only after approval.", defaultOn: false },
  { id: "approvalInstaller", label: "Approval before installer changes", description: "Self-upgrades require approval before installer applies them.", defaultOn: true, locked: true },
  { id: "deepBuild", label: "Deep build mode", description: "Allow more time-consuming architecture or feature upgrades.", defaultOn: false },
];

function loadState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {}
  return Object.fromEntries(CONSTRAINTS.map(c => [c.id, c.defaultOn]));
}

export default function ConstraintsPage() {
  const [values, setValues] = useState(loadState);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const activeCount = useMemo(() => Object.values(values).filter(Boolean).length, [values]);

  const toggle = (item: Constraint) => {
    if (item.locked) return;
    setValues(v => ({ ...v, [item.id]: !v[item.id] }));
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    setSavedAt(Date.now());
  };

  const reset = () => {
    const next = Object.fromEntries(CONSTRAINTS.map(c => [c.id, c.defaultOn]));
    setValues(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedAt(Date.now());
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Constraints</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Global defaults and the rules shown before build or repair jobs</p>
      </div>

      <div className="p-5 space-y-4 max-w-2xl mx-auto w-full">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Pre-build / pre-repair constraint popup</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">These defaults should pre-fill the quick popup before building a new app or repairing an uploaded app. You can still override them per job.</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-primary/10 text-primary px-2 py-1">{activeCount} active</span>
            {savedAt && <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-1">Saved {new Date(savedAt).toLocaleTimeString()}</span>}
          </div>
        </div>

        <div className="space-y-2">
          {CONSTRAINTS.map(item => {
            const checked = !!values[item.id];
            return (
              <button
                key={item.id}
                onClick={() => toggle(item)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${checked ? "border-primary/40 bg-primary/10" : "border-border bg-card"} ${item.locked ? "opacity-80" : "hover:border-primary/30"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${checked ? "bg-primary border-primary" : "border-border"}`}>{checked ? "✓" : ""}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{item.label}</p>
                      {item.ownerOnly && <span className="text-[10px] rounded border border-amber-500/30 text-amber-400 px-1.5 py-0.5">Owner/Pro</span>}
                      {item.locked && <span className="text-[10px] rounded border border-border text-muted-foreground px-1.5 py-0.5 flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Locked</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-relaxed">Hard legal/safety guardrails stay on for all tiers even when optional constraints are off.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 pb-4">
          <button onClick={reset} className="h-11 rounded-lg border border-border text-sm text-muted-foreground">Reset defaults</button>
          <button onClick={save} className="h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"><Save className="w-4 h-4" />Save constraints</button>
        </div>
      </div>
    </div>
  );
}
