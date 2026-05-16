import { useMemo, useState } from "react";
import { Lock, Save, ShieldAlert, SlidersHorizontal } from "lucide-react";

export const BUILD_REPAIR_CONSTRAINTS_KEY = "agent-studio:constraints";

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
  { id: "noCloudDependency", label: "No cloud dependency", description: "Avoid features that require cloud services to work.", defaultOn: false },
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
  { id: "timeWarning", label: "Warn on time-consuming upgrades", description: "Show an extra warning before deep or slow upgrades.", defaultOn: true },
];

function getDefaults(): Record<string, boolean> {
  return Object.fromEntries(CONSTRAINTS.map(c => [c.id, c.defaultOn]));
}

function loadState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(BUILD_REPAIR_CONSTRAINTS_KEY);
    if (raw) return { ...getDefaults(), ...(JSON.parse(raw) as Record<string, boolean>) };
  } catch {}
  return getDefaults();
}

export function getBuildRepairConstraints() {
  return loadState();
}

export function BuildRepairConstraints() {
  const [values, setValues] = useState(loadState);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const activeCount = useMemo(() => Object.values(values).filter(Boolean).length, [values]);

  const toggle = (item: Constraint) => {
    if (item.locked) return;
    setValues(v => ({ ...v, [item.id]: !v[item.id] }));
  };

  const save = () => {
    localStorage.setItem(BUILD_REPAIR_CONSTRAINTS_KEY, JSON.stringify(values));
    setSavedAt(Date.now());
  };

  const reset = () => {
    const next = getDefaults();
    setValues(next);
    localStorage.setItem(BUILD_REPAIR_CONSTRAINTS_KEY, JSON.stringify(next));
    setSavedAt(Date.now());
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Build &amp; Repair Constraints</h2>
          <p className="text-[11px] text-muted-foreground mt-1">Global defaults used by new builds and Repair/Rebuild/Fix uploads.</p>
        </div>
        <span className="rounded-full bg-primary/10 text-primary text-[11px] px-2 py-1 shrink-0">{activeCount} active</span>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Settings-controlled rules</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              These settings pre-fill the quick popup before normal builds and before repairing or upgrading uploaded apps. You can still override them per job.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {CONSTRAINTS.map(item => {
            const checked = !!values[item.id];
            return (
              <button
                key={item.id}
                onClick={() => toggle(item)}
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/20 transition-colors"
              >
                <span className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center text-[11px] ${checked ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>{checked ? "✓" : ""}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.ownerOnly && <span className="text-[10px] rounded border border-amber-500/30 text-amber-400 px-1.5 py-0.5">Owner/Pro</span>}
                    {item.locked && <span className="text-[10px] rounded border border-border text-muted-foreground px-1.5 py-0.5 flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Locked</span>}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 leading-relaxed">Hard legal/safety guardrails stay on for every tier even when optional constraints are off.</p>
          </div>
          {savedAt && <p className="text-[11px] text-emerald-400">Saved {new Date(savedAt).toLocaleTimeString()}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={reset} className="h-10 rounded-lg border border-border text-xs text-muted-foreground">Reset defaults</button>
            <button onClick={save} className="h-10 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2"><Save className="w-3.5 h-3.5" />Save</button>
          </div>
        </div>
      </div>
    </section>
  );
}
