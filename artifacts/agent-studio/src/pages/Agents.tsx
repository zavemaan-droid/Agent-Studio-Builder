import { useState } from "react";
import { cn } from "@/lib/utils";
import { Bot, Globe, Smartphone, Zap, ChevronRight } from "lucide-react";

type TeamId = "android" | "web";

const TEAMS: Record<TeamId, {
  label: string; icon: React.ElementType; color: string; description: string;
  keywords: string[]; stack: string;
  agents: { name: string; color: string; role: string; step: number; description: string }[];
}> = {
  android: {
    label: "Android Team",
    icon: Smartphone,
    color: "#10b981",
    description: "Best for Android-installable PWAs with offline support and a native app feel.",
    keywords: ["todo app", "chat app", "fitness", "weather", "camera", "android"],
    stack: "HTML + CSS + JS + PWA (manifest + service worker)",
    agents: [
      { name: "Architect", color: "#f59e0b", role: "architect", step: 1, description: "Plans app structure, offline strategy, and PWA manifest" },
      { name: "Builder", color: "#6b7280", role: "builder", step: 2, description: "Writes HTML, CSS, and JavaScript with mobile-first layout" },
      { name: "UI Designer", color: "#7c3aed", role: "designer", step: 3, description: "Applies Material-style design, touch targets, and animations" },
      { name: "QA", color: "#10b981", role: "qa", step: 4, description: "Checks offline behaviour, viewport fit, and installability" },
      { name: "Packager", color: "#ec4899", role: "packager", step: 5, description: "Finalises manifest.json, sw.js, and zips all PWA files" },
    ],
  },
  web: {
    label: "Web Team",
    icon: Globe,
    color: "#3b82f6",
    description: "Best for web apps with HTML, CSS, and JavaScript — runs in any browser.",
    keywords: ["landing page", "dashboard", "portfolio", "game", "calculator", "web"],
    stack: "HTML + CSS + Vanilla JavaScript",
    agents: [
      { name: "Architect", color: "#f59e0b", role: "architect", step: 1, description: "Plans page structure, data models, and component layout" },
      { name: "Builder", color: "#6b7280", role: "builder", step: 2, description: "Writes HTML, CSS, and JavaScript source files" },
      { name: "UI Designer", color: "#7c3aed", role: "designer", step: 3, description: "Polishes CSS, adds animations, improves responsiveness" },
      { name: "QA", color: "#10b981", role: "qa", step: 4, description: "Finds bugs, adds error handling, tests edge cases" },
      { name: "Packager", color: "#ec4899", role: "packager", step: 5, description: "Bundles final files, updates manifest" },
    ],
  },
};

export default function AgentsPage() {
  const [activeTeam, setActiveTeam] = useState<TeamId>("android");
  const team = TEAMS[activeTeam];
  const TeamIcon = team.icon;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Agents</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Meet your specialist teams. The system picks the right team automatically based on what you describe.
        </p>
      </div>

      <div className="p-5 space-y-4 max-w-2xl mx-auto w-full">
        {/* Smart Auto-Routing */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap className="w-4 h-4" />
            <p className="text-sm font-semibold">Smart Auto-Routing</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Just describe your app in plain English. The system automatically selects the right agent team — you never need to choose manually.
          </p>
        </div>

        {/* Team tabs */}
        <div className="flex gap-2">
          {(Object.keys(TEAMS) as TeamId[]).map((teamId) => {
            const t = TEAMS[teamId];
            const TIcon = t.icon;
            return (
              <button
                key={teamId}
                onClick={() => setActiveTeam(teamId)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                  activeTeam === teamId
                    ? "border-transparent text-white"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
                style={activeTeam === teamId ? { background: `${t.color}25`, borderColor: `${t.color}50`, color: t.color } : {}}
                data-testid={`team-tab-${teamId}`}
              >
                <TIcon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Team detail card */}
        <div className="rounded-xl border bg-card p-4 space-y-4" style={{ borderColor: `${team.color}30` }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${team.color}20` }}>
              <TeamIcon className="w-5 h-5" style={{ color: team.color }} />
            </div>
            <div>
              <p className="text-sm font-semibold">{team.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{team.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">{team.stack}</p>
            </div>
          </div>

          {/* Auto-select keywords */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Auto-selected when you say:</p>
            <div className="flex flex-wrap gap-1.5">
              {team.keywords.map(kw => (
                <span key={kw} className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{kw}</span>
              ))}
            </div>
          </div>

          {/* Agent pipeline */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Agent Pipeline</p>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {team.agents.map((agent, i) => (
                <div key={agent.role} className="flex items-center gap-1 shrink-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold"
                    style={{ background: `${agent.color}25`, border: `1px solid ${agent.color}50`, color: agent.color }}
                  >
                    {agent.name.slice(0, 2)}
                  </div>
                  {i < team.agents.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Individual agent cards */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agent Details</p>
          {team.agents.map((agent) => (
            <div key={agent.role} className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-card">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: `${agent.color}20`, color: agent.color }}
              >
                {agent.name.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{agent.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground font-mono">STEP {agent.step}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
