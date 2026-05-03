import { useState } from "react";
import { useStudio, DEFAULT_AGENT_PROMPTS } from "@/contexts/StudioContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Bot, Zap, Box, TrendingUp, ChevronRight, Loader2,
  CheckCircle2, Sparkles, Globe, Smartphone, ArrowRight,
  XCircle, AlertTriangle, History, ChevronDown, Eye, EyeOff,
  Cpu, RefreshCcw, Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UpgradeProposal } from "@/lib/types";

const AGENT_PIPELINE = [
  { role: "architect", name: "Architect", color: "#f59e0b", desc: "Plans the entire app structure" },
  { role: "builder", name: "Builder", color: "#6366f1", desc: "Writes all source code" },
  { role: "designer", name: "UI Designer", color: "#7c3aed", desc: "Enhances UI/UX" },
  { role: "qa", name: "QA", color: "#10b981", desc: "Finds and fixes bugs" },
  { role: "packager", name: "Packager", color: "#ec4899", desc: "Finalises output" },
];

const IMPACT_STYLE: Record<string, string> = {
  high: "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

function ProposalCard({
  proposal, appliedIds, skippedIds,
  onApply, onSkip,
}: {
  proposal: UpgradeProposal;
  appliedIds: Set<string>;
  skippedIds: Set<string>;
  onApply: (p: UpgradeProposal) => void;
  onSkip: (id: string) => void;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const [activeTab, setActiveTab] = useState<"before" | "after">("after");
  const applied = appliedIds.has(proposal.id);
  const skipped = skippedIds.has(proposal.id);

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden transition-all",
      applied && "border-emerald-500/40 bg-emerald-500/5",
      skipped && "opacity-50 border-border",
      !applied && !skipped && "border-border hover:border-primary/30"
    )}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">{proposal.title}</p>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide",
                IMPACT_STYLE[proposal.impact]
              )}>
                {proposal.impact} impact
              </span>
              {proposal.agentRole && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground capitalize">
                  {proposal.agentRole} agent
                </span>
              )}
              {applied && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Applied
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{proposal.description}</p>
          </div>
        </div>

        {/* Diff toggle */}
        <button
          onClick={() => setShowDiff(d => !d)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showDiff ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showDiff ? "Hide" : "Show"} prompt diff
          <ChevronDown className={cn("w-3 h-3 transition-transform", showDiff && "rotate-180")} />
        </button>

        {/* Before / After diff */}
        {showDiff && (
          <div className="rounded-lg border border-border overflow-hidden text-xs">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("before")}
                className={cn(
                  "flex-1 py-1.5 text-center text-[11px] font-medium transition-colors",
                  activeTab === "before" ? "bg-red-500/10 text-red-400" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Before
              </button>
              <button
                onClick={() => setActiveTab("after")}
                className={cn(
                  "flex-1 py-1.5 text-center text-[11px] font-medium transition-colors",
                  activeTab === "after" ? "bg-emerald-500/10 text-emerald-400" : "text-muted-foreground hover:text-foreground"
                )}
              >
                After (proposed)
              </button>
            </div>
            <pre className={cn(
              "p-3 text-[11px] leading-relaxed overflow-y-auto max-h-40 whitespace-pre-wrap",
              activeTab === "before" ? "text-red-300/80" : "text-emerald-300/80"
            )}>
              {activeTab === "before" ? proposal.before : proposal.after}
            </pre>
          </div>
        )}

        {/* Actions */}
        {!applied && !skipped && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onApply(proposal)}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Apply Upgrade Permanently
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSkip(proposal.id)}
              className="text-muted-foreground"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Skip
            </Button>
          </div>
        )}

        {applied && (
          <div className="text-xs text-emerald-400 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            Permanently applied — all future builds will use this improved agent prompt.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label, color, icon: Icon }: {
  value: string | number; label: string; color: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border p-4 flex flex-col gap-2" style={{ background: `${color}18` }}>
      <Icon className="w-5 h-5" style={{ color }} />
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const {
    projects, memories, modules, trainingState, trainingPercent,
    settings, agentPrompts, upgradeHistory,
    applyUpgrade, resetAgentPrompts,
  } = useStudio();
  const [, setLocation] = useLocation();
  const [generating, setGenerating] = useState(false);
  const [proposals, setProposals] = useState<UpgradeProposal[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const readyProjects = projects.filter(p => p.status === "ready").length;
  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const trainedLessons = modules.reduce(
    (a, m) => a + m.lessons.filter(l => trainingState[`${m.id}:${l.id}`]).length, 0
  );
  const memorySavedCount = memories.filter(m => m.autoInclude).length;
  const appliedUpgrades = upgradeHistory.length;
  const customizedRoles = Object.keys(agentPrompts).filter(
    role => agentPrompts[role] !== DEFAULT_AGENT_PROMPTS[role]
  );

  const generateProposals = async () => {
    setGenerating(true);
    setError(null);
    setProposals([]);
    setAppliedIds(new Set());
    setSkippedIds(new Set());

    try {
      const { callAI } = await import("@/lib/ai");

      const systemState = {
        trainingProgress: `${trainedLessons}/${totalLessons} lessons (${trainingPercent}%)`,
        memoriesTotal: memories.length,
        autoIncludedMemories: memorySavedCount,
        readyProjects,
        hasGroqKey: settings.groqKey.length > 10,
        hasGitHub: settings.githubToken.length > 10,
        appliedUpgrades,
        customizedAgentRoles: customizedRoles,
      };

      const currentPromptsSnippets = Object.entries(agentPrompts).map(([role, prompt]) => ({
        role,
        promptPreview: prompt.slice(0, 300) + (prompt.length > 300 ? "..." : ""),
        fullPrompt: prompt,
      }));

      const aiPrompt = `You are the Self-Upgrade AI for Agent Studio. Analyze the current agent prompts and generate 4 upgrade proposals that improve quality, safety, reliability, and performance.

Current system state:
${JSON.stringify(systemState, null, 2)}

Current agent prompts to improve:
${JSON.stringify(currentPromptsSnippets, null, 2)}

Return ONLY a valid JSON array — no markdown fences, no explanation, no text before or after. Start your response with [ and end with ].

Each object in the array must have exactly these fields:
- "id": a unique string like "up-001"
- "title": short descriptive title (string)
- "description": 1-2 sentences on what improves and why (string)
- "impact": one of these exact values — "high", "medium", or "low"
- "type": always "agent_prompt"
- "agentRole": one of — "architect", "builder", "designer", "qa", "packager"
- "before": the exact current prompt text for that agent (copy it)
- "after": the full improved prompt text (not a description — the actual prompt)

Example of correct format:
[{"id":"up-001","title":"Better Builder Output","description":"Adds stricter output format rules.","impact":"high","type":"agent_prompt","agentRole":"builder","before":"current prompt...","after":"improved full prompt..."}]

Favor changes that reduce bugs, prevent unsafe output, improve prompt reliability, and make builds faster or more consistent. Make 4 substantive improvements. Do not add markdown. Start with [ immediately.`;

      const raw = await callAI(
        [{ role: "user", content: aiPrompt }],
        { groqKey: settings.groqKey }
      );

      // Strip any markdown fences the AI may have added despite instructions
      const stripped = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();

      const extractJsonArray = (text: string): string | null => {
        const start = text.indexOf("[");
        const end = text.lastIndexOf("]");
        if (start === -1 || end === -1 || end <= start) return null;
        return text.slice(start, end + 1);
      };

      const extractJsonObject = (text: string): string | null => {
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) return null;
        return text.slice(start, end + 1);
      };

      const tryParse = (text: string): UpgradeProposal[] | null => {
        const arrayText = extractJsonArray(text);
        if (arrayText) {
          try {
            const parsed = JSON.parse(arrayText) as unknown;
            if (Array.isArray(parsed)) return parsed as UpgradeProposal[];
          } catch {}
        }

        const objectText = extractJsonObject(text);
        if (objectText) {
          try {
            const parsed = JSON.parse(objectText) as UpgradeProposal;
            if (parsed && typeof parsed === "object") return [parsed];
          } catch {}
        }

        const looseObjects = text.match(/\{[\s\S]*?\}/g);
        if (looseObjects?.length) {
          const parsed = looseObjects
            .map(chunk => {
              try {
                return JSON.parse(chunk) as UpgradeProposal;
              } catch {
                return null;
              }
            })
            .filter((item): item is UpgradeProposal => !!item);
          if (parsed.length > 0) return parsed;
        }

        return null;
      };

      let parsed = tryParse(stripped);
      if (!parsed) {
        const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() ?? "";
        parsed = tryParse(fenced);
      }
      if (!parsed || parsed.length === 0) {
        const fallback = Object.entries(DEFAULT_AGENT_PROMPTS).slice(0, 3).map(([role, prompt], i) => ({
          id: `fallback-${Date.now()}-${i}`,
          title: `${role[0].toUpperCase() + role.slice(1)} prompt cleanup`,
          description: "Fallback proposal generated locally because the AI response could not be parsed.",
          impact: "low",
          type: "agent_prompt",
          agentRole: role,
          before: prompt,
          after: prompt,
        } as UpgradeProposal));
        setProposals(fallback);
        return;
      }

      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No proposals generated — please try again");

      // Validate and fill in actual before text from current prompts
      const validated = parsed.map((p, i) => ({
        ...p,
        id: p.id ?? `up-${Date.now()}-${i}`,
        before: p.agentRole ? (agentPrompts[p.agentRole] ?? p.before ?? "") : p.before ?? "",
      }));

      setProposals(validated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate proposals");
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = (proposal: UpgradeProposal) => {
    applyUpgrade(proposal);
    setAppliedIds(prev => new Set(prev).add(proposal.id));
  };

  const handleSkip = (id: string) => {
    setSkippedIds(prev => new Set(prev).add(id));
  };

  const pendingCount = proposals.filter(p => !appliedIds.has(p.id) && !skippedIds.has(p.id)).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">
              {greeting}{settings.userName.trim() ? `, ${settings.userName.trim().split(" ")[0]}` : ""}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">5-agent pipeline · {projects.length} project{projects.length !== 1 ? "s" : ""} · {memories.length} memories</p>
          </div>
          <div className="flex items-center gap-2">
            {appliedUpgrades > 0 && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-primary/15 text-primary font-medium">
                {appliedUpgrades} upgrades applied
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              READY
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5 max-w-2xl mx-auto w-full">

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard value={AGENT_PIPELINE.length} label="Active Agents" color="#7c3aed" icon={Bot} />
          <StatCard value={appliedUpgrades} label="Upgrades Applied" color="#10b981" icon={Sparkles} />
          <StatCard value={readyProjects} label="Apps Built" color="#f59e0b" icon={Box} />
        </div>

        {/* ── Self Upgrade ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold">Self Upgrade</h2>
                {customizedRoles.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">
                    {customizedRoles.length} agents customized
                  </span>
                )}
              </div>
              {customizedRoles.length > 0 && (
                <button
                  onClick={() => setShowReset(r => !r)}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <RefreshCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              AI analyzes your current agent prompts and generates specific upgrade proposals. You review each one, see the exact before/after diff, then approve or skip. Approved changes are permanently written to the build pipeline and used in all future builds.
            </p>

            {showReset && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-center justify-between">
                <p className="text-xs text-destructive">Reset all agents to default prompts?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => { resetAgentPrompts(); setShowReset(false); setProposals([]); setAppliedIds(new Set()); }}>Reset All</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowReset(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <Button
              onClick={generateProposals}
              disabled={generating}
              className="w-full"
              data-testid="analyze-btn"
            >
              {generating
                ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Analyzing agents &amp; generating upgrades...</>
                : <><TrendingUp className="w-3.5 h-3.5 mr-2" />Generate Upgrade Proposals</>
              }
            </Button>
          </div>

          {/* Proposals */}
          {proposals.length > 0 && (
            <div className="border-t border-border">
              <div className="px-4 py-2.5 flex items-center justify-between bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground">
                  {proposals.length} proposals generated
                  {pendingCount > 0 && ` · ${pendingCount} pending review`}
                  {appliedIds.size > 0 && ` · ${appliedIds.size} applied`}
                </p>
                {appliedIds.size === proposals.length && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> All applied
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3">
                {proposals.map(p => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    appliedIds={appliedIds}
                    skippedIds={skippedIds}
                    onApply={handleApply}
                    onSkip={handleSkip}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upgrade History */}
        {upgradeHistory.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
              onClick={() => setShowHistory(h => !h)}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Upgrade History</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{upgradeHistory.length} applied</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showHistory && "rotate-180")} />
            </button>
            {showHistory && (
              <div className="border-t border-border divide-y divide-border/50">
                {upgradeHistory.slice().reverse().map((u) => (
                  <div key={u.id} className="px-4 py-3 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{u.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {u.agentRole && (
                          <span className="text-[10px] text-muted-foreground capitalize">{u.agentRole} agent</span>
                        )}
                        {u.appliedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(u.appliedAt).toLocaleDateString()}
                          </span>
                        )}
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase", IMPACT_STYLE[u.impact])}>
                          {u.impact}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Agent Pipeline */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Agent Pipeline</h2>
            <button onClick={() => setLocation("/agents")} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View agents <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {AGENT_PIPELINE.map((agent, i) => {
              const isCustomized = customizedRoles.includes(agent.role);
              return (
                <div key={agent.role} className="flex items-center gap-0 shrink-0">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-[10px] font-bold relative",
                        isCustomized && "ring-2 ring-offset-1 ring-offset-card"
                      )}
                      style={{
                        background: `${agent.color}30`,
                        border: `1px solid ${agent.color}50`,
                        color: agent.color,
                      }}
                    >
                      {agent.name.slice(0, 2).toUpperCase()}
                      {isCustomized && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border border-card flex items-center justify-center">
                          <Sparkles className="w-2 h-2 text-black" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{agent.name}</span>
                  </div>
                  {i < AGENT_PIPELINE.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 mx-1 mb-4 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Agents with a ✦ badge have been upgraded via Self Upgrade
          </p>
        </div>

        {/* Quick Start */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">Start a Build</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLocation("/studio?platform=web")}
              className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left"
            >
              <Globe className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <p className="text-xs font-medium">Web App</p>
                <p className="text-[10px] text-muted-foreground">HTML/CSS/JS</p>
              </div>
            </button>
            <button
              onClick={() => setLocation("/studio?platform=android")}
              className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"
            >
              <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-medium">Android App</p>
                <p className="text-[10px] text-muted-foreground">PWA · Installable</p>
              </div>
            </button>
          </div>
        </div>

        {/* Training + Memory */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl border border-border bg-card p-4 space-y-2 cursor-pointer hover:border-primary/30"
            onClick={() => setLocation("/training")}
          >
            <p className="text-xs font-medium text-muted-foreground">AI Training</p>
            <div className="flex items-end justify-between">
              <p className="text-xl font-bold text-primary">{trainingPercent}%</p>
              <p className="text-[10px] text-muted-foreground">{trainedLessons}/{totalLessons}</p>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${trainingPercent}%` }} />
            </div>
          </div>
          <div
            className="rounded-xl border border-border bg-card p-4 space-y-2 cursor-pointer hover:border-primary/30"
            onClick={() => setLocation("/memory")}
          >
            <p className="text-xs font-medium text-muted-foreground">Memory Bank</p>
            <div className="flex items-end justify-between">
              <p className="text-xl font-bold text-emerald-400">{memories.length}</p>
              <p className="text-[10px] text-muted-foreground">{memorySavedCount} auto</p>
            </div>
            <p className="text-[10px] text-muted-foreground">memories stored</p>
          </div>
        </div>
      </div>
    </div>
  );
}
