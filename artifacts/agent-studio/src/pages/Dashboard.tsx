import { useState } from "react";
import { useStudio, DEFAULT_AGENT_PROMPTS } from "@/contexts/StudioContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Bot, Zap, Box, TrendingUp, ChevronRight, Loader2,
  CheckCircle2, Sparkles, Globe, Smartphone, ArrowRight,
  XCircle, AlertTriangle, History, ChevronDown, Eye, EyeOff,
  Cpu, RefreshCcw, Brain, Shield, ListChecks, RotateCcw,
  Terminal, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UpgradeProposal } from "@/lib/types";

const AGENT_PIPELINE = [
  { role: "architect", name: "Architect",  color: "#f59e0b", desc: "Plans the entire app structure" },
  { role: "builder",   name: "Builder",    color: "#6366f1", desc: "Writes all source code" },
  { role: "designer",  name: "UI Designer",color: "#7c3aed", desc: "Enhances UI/UX" },
  { role: "qa",        name: "QA",         color: "#10b981", desc: "Finds and fixes bugs" },
  { role: "packager",  name: "Packager",   color: "#ec4899", desc: "Finalises output" },
];

const IMPACT_STYLE: Record<string, string> = {
  high:   "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const RISK_STYLE: Record<string, string> = {
  high:   "text-red-400",
  medium: "text-amber-400",
  low:    "text-emerald-400",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Repair":                       Brain,
  "Security Improvement":         Shield,
  "Builder Training Improvement": ListChecks,
  "Performance Improvement":      Zap,
};

// ── Installer: applies an approved upgrade and emits log lines ────────────────
async function runInstaller(
  proposal: UpgradeProposal,
  applyUpgradeFn: (p: UpgradeProposal) => void,
  onLog: (line: string) => void
): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  const emit = (line: string) => { log.push(line); onLog(line); };

  emit(`[installer] Starting installation of: ${proposal.title}`);
  emit(`[installer] Type: ${proposal.type} | Impact: ${proposal.impact}`);

  await new Promise(r => setTimeout(r, 300));
  emit(`[installer] Validating proposal structure…`);

  if (!proposal.before || !proposal.after) {
    emit(`[installer] ERROR — before/after content missing. Aborting.`);
    return { success: false, log };
  }

  await new Promise(r => setTimeout(r, 300));

  if (proposal.type === "agent_prompt") {
    emit(`[installer] Target agent: ${proposal.agentRole ?? "unknown"}`);
    emit(`[installer] Writing new prompt to agent store…`);
    await new Promise(r => setTimeout(r, 400));
    applyUpgradeFn(proposal);
    emit(`[installer] Agent prompt updated. Change is permanent and will apply to all future builds.`);
    if (proposal.rollbackNote) {
      emit(`[installer] Rollback note: ${proposal.rollbackNote}`);
    }
  } else if (proposal.type === "system_behavior") {
    emit(`[installer] System behavior upgrade — recording to memory bank…`);
    await new Promise(r => setTimeout(r, 400));
    applyUpgradeFn(proposal);
    emit(`[installer] Behavior change logged to upgrade history.`);
    emit(`[installer] Note: system_behavior changes inform future AI-generated proposals and Jarvis context.`);
    if (proposal.affectedAreas?.length) {
      emit(`[installer] Affected areas: ${proposal.affectedAreas.join(", ")}`);
    }
    if (proposal.expectedResult) {
      emit(`[installer] Expected result: ${proposal.expectedResult}`);
    }
  } else {
    emit(`[installer] Proposal type "${proposal.type}" — recording to upgrade history.`);
    applyUpgradeFn(proposal);
  }

  await new Promise(r => setTimeout(r, 200));
  emit(`[installer] ✅ Installation complete.`);
  return { success: true, log };
}

// ── ProposalCard ──────────────────────────────────────────────────────────────
function ProposalCard({
  proposal, appliedIds, skippedIds, installingId, installerLogs,
  onApply, onSkip,
}: {
  proposal: UpgradeProposal;
  appliedIds: Set<string>;
  skippedIds: Set<string>;
  installingId: string | null;
  installerLogs: Record<string, string[]>;
  onApply: (p: UpgradeProposal) => Promise<void> | void;
  onSkip: (id: string) => void;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const [showLog, setShowLog]   = useState(false);
  const [activeTab, setActiveTab] = useState<"before" | "after">("after");
  const applied  = appliedIds.has(proposal.id);
  const skipped  = skippedIds.has(proposal.id);
  const isInstalling = installingId === proposal.id;
  const log = installerLogs[proposal.id] ?? [];

  const CategoryIcon = CATEGORY_ICONS[proposal.category ?? ""] ?? Sparkles;

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden transition-all",
      applied  && "border-emerald-500/40 bg-emerald-500/5",
      skipped  && "opacity-50 border-border",
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
              {proposal.category && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground flex items-center gap-1">
                  <CategoryIcon className="w-2.5 h-2.5" />
                  {proposal.category}
                </span>
              )}
              {applied && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Installed
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{proposal.description}</p>
          </div>
        </div>

        {/* Risk + affected areas */}
        {(proposal.riskLevel || proposal.affectedAreas?.length || proposal.expectedResult) && (
          <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1.5 text-xs">
            {proposal.riskLevel && (
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Risk:</span>
                <span className={cn("font-medium", RISK_STYLE[proposal.riskLevel])}>
                  {proposal.riskLevel}
                </span>
              </div>
            )}
            {proposal.affectedAreas?.length ? (
              <div className="flex items-start gap-1.5">
                <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Affects: {proposal.affectedAreas.join(", ")}</span>
              </div>
            ) : null}
            {proposal.expectedResult && (
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{proposal.expectedResult}</span>
              </div>
            )}
            {proposal.rollbackNote && (
              <div className="flex items-start gap-1.5">
                <RotateCcw className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">Rollback: {proposal.rollbackNote}</span>
              </div>
            )}
          </div>
        )}

        {/* Diff toggle */}
        <button
          onClick={() => setShowDiff(d => !d)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showDiff ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showDiff ? "Hide" : "Show"} diff
          <ChevronDown className={cn("w-3 h-3 transition-transform", showDiff && "rotate-180")} />
        </button>

        {showDiff && (
          <div className="rounded-lg border border-border overflow-hidden text-xs">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("before")}
                className={cn(
                  "flex-1 py-1.5 text-center text-[11px] font-medium transition-colors",
                  activeTab === "before" ? "bg-red-500/10 text-red-400" : "text-muted-foreground hover:text-foreground"
                )}
              >Before</button>
              <button
                onClick={() => setActiveTab("after")}
                className={cn(
                  "flex-1 py-1.5 text-center text-[11px] font-medium transition-colors",
                  activeTab === "after" ? "bg-emerald-500/10 text-emerald-400" : "text-muted-foreground hover:text-foreground"
                )}
              >After (proposed)</button>
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
              onClick={() => void onApply(proposal)}
              disabled={isInstalling}
            >
              {isInstalling
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Installing…</>
                : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Approve &amp; Install</>
              }
            </Button>
            <Button size="sm" variant="outline" onClick={() => onSkip(proposal.id)} className="text-muted-foreground">
              <XCircle className="w-3.5 h-3.5 mr-1" />Skip
            </Button>
          </div>
        )}

        {/* Installer log */}
        {log.length > 0 && (
          <div>
            <button
              onClick={() => setShowLog(l => !l)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Terminal className="w-3 h-3" />
              {showLog ? "Hide" : "Show"} installer log
              <ChevronDown className={cn("w-3 h-3 transition-transform", showLog && "rotate-180")} />
            </button>
            {showLog && (
              <div className="mt-2 rounded-lg bg-black/40 border border-border p-3 font-mono text-[10px] text-green-400/80 space-y-0.5 max-h-32 overflow-y-auto">
                {log.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            )}
          </div>
        )}

        {applied && !log.length && (
          <div className="text-xs text-emerald-400 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            <span className="font-medium">Installed</span>
            <span className="text-emerald-400/70">— active from next build</span>
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
  const [proposals, setProposals]   = useState<UpgradeProposal[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [installerLogs, setInstallerLogs] = useState<Record<string, string[]>>({});
  const [error, setError]           = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showReset, setShowReset]   = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const readyProjects = projects.filter(p => p.status === "ready").length;
  const totalLessons  = modules.reduce((a, m) => a + m.lessons.length, 0);
  const trainedLessons = modules.reduce(
    (a, m) => a + m.lessons.filter(l => trainingState[`${m.id}:${l.id}`]).length, 0
  );
  const memorySavedCount = memories.filter(m => m.autoInclude).length;
  const appliedUpgrades  = upgradeHistory.length;
  const customizedRoles  = Object.keys(agentPrompts).filter(
    role => agentPrompts[role] !== DEFAULT_AGENT_PROMPTS[role]
  );

  const generateProposals = async () => {
    setGenerating(true);
    setError(null);
    setProposals([]);
    setAppliedIds(new Set());
    setSkippedIds(new Set());
    setInstallerLogs({});

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
        promptPreview: prompt.slice(0, 250) + (prompt.length > 250 ? "..." : ""),
      }));

      const aiPrompt = `You are the Self-Upgrade AI for Agent Studio. Return 4 upgrade proposals for the agent prompts below.

Current system state:
${JSON.stringify(systemState, null, 2)}

Current agent prompts to improve (first 250 chars each):
${JSON.stringify(currentPromptsSnippets, null, 2)}

Return ONLY valid JSON. No markdown. No explanation. No extra text.
Return a JSON array with exactly 4 objects.

Each object must have exactly these fields:
- "id": unique string like "up-001"
- "title": short descriptive title (string)
- "description": 1-2 sentences on what improves and why (string)
- "impact": "high", "medium", or "low"
- "type": "agent_prompt" or "system_behavior"
- "agentRole": one of "architect","builder","designer","qa","packager" (required for agent_prompt type)
- "category": one of "Repair","Optimization","Enhancement","New Feature","UI/Design Improvement","Security Improvement","Performance Improvement","Builder Training Improvement"
- "riskLevel": "low","medium","high"
- "affectedAreas": array of affected area strings (e.g. ["builder agent","build pipeline"])
- "expectedResult": one sentence on what improves after install (string)
- "rollbackNote": one sentence on how to undo (string)
- "before": the exact current prompt text for that agent (copy it)
- "after": the full improved prompt text (the actual prompt, not a description)

Favor changes that reduce bugs, prevent unsafe output, improve reliability. Make 4 substantive improvements. Do not add markdown. Start with [.`;

      const raw = await callAI(
        [{ role: "user", content: aiPrompt }],
        { groqKey: settings.groqKey }
      );

      const stripped = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();

      const parseLooseJson = (text: string): UpgradeProposal[] | null => {
        const candidates = [text, raw, stripped, raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() ?? ""].filter(Boolean);
        for (const candidate of candidates) {
          const start = candidate.indexOf("[");
          const end   = candidate.lastIndexOf("]");
          if (start !== -1 && end !== -1 && end > start) {
            try {
              const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
              if (Array.isArray(parsed)) return parsed as UpgradeProposal[];
            } catch {}
          }
        }
        return null;
      };

      const buildLocalProposals = (): UpgradeProposal[] => {
        const roles: (keyof typeof DEFAULT_AGENT_PROMPTS)[] = ["architect", "builder", "designer", "qa"];
        return roles.map((role, i) => ({
          id: `local-${Date.now()}-${i}`,
          title: `${role[0].toUpperCase() + role.slice(1)} prompt hardening`,
          description: "Locally generated upgrade to improve prompt consistency and reliability.",
          impact: "medium" as const,
          type: "agent_prompt" as const,
          agentRole: role,
          category: "Optimization" as const,
          riskLevel: "low" as const,
          affectedAreas: [`${role} agent`],
          expectedResult: "Improved output consistency and fewer malformed responses.",
          rollbackNote: "Use the Reset button on the Dashboard to revert to default prompts.",
          before: agentPrompts[role],
          after: `${agentPrompts[role]}\n\nAdditional rules:\n- Be explicit.\n- Return only valid structured output.\n- Never add markdown fences unless required.`,
        }));
      };

      let parsed = parseLooseJson(stripped);
      if (!parsed || parsed.length === 0) {
        parsed = buildLocalProposals();
      }

      const appliedKeys = new Set(
        upgradeHistory.map(u => `${u.type}:${u.agentRole ?? ""}:${u.before}:::${u.after}`)
      );
      const validated = parsed
        .map((p, i) => ({
          ...p,
          id: p.id ?? `up-${Date.now()}-${i}`,
          before: p.agentRole ? (agentPrompts[p.agentRole] ?? p.before ?? "") : p.before ?? "",
        }))
        .filter(p => !appliedKeys.has(`${p.type}:${p.agentRole ?? ""}:${p.before}:::${p.after}`));

      setProposals(validated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate proposals");
    } finally {
      setGenerating(false);
    }
  };

  const [installingId, setInstallingId] = useState<string | null>(null);

  const handleApply = async (proposal: UpgradeProposal) => {
    setInstallingId(proposal.id);
    setInstallerLogs(prev => ({ ...prev, [proposal.id]: [] }));

    const { success } = await runInstaller(
      proposal,
      applyUpgrade,
      (line) => setInstallerLogs(prev => ({
        ...prev,
        [proposal.id]: [...(prev[proposal.id] ?? []), line],
      }))
    );

    if (success) {
      setAppliedIds(prev => new Set(prev).add(proposal.id));
    }
    setInstallingId(null);

    try {
      const { jarvisSpeak } = await import("@/lib/jarvisVoice");
      void jarvisSpeak(
        success
          ? `${proposal.agentRole ?? "Agent"} prompt upgraded, sir. The improvement will take effect on the next build.`
          : `Installation failed for ${proposal.title}. Check the installer log, sir.`
      );
    } catch { /* voice optional */ }
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
            <p className="text-xs text-muted-foreground mt-0.5">
              5-agent pipeline · {projects.length} project{projects.length !== 1 ? "s" : ""} · {memories.length} memories
            </p>
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
          <StatCard value={appliedUpgrades}        label="Upgrades Applied" color="#10b981" icon={Sparkles} />
          <StatCard value={readyProjects}           label="Apps Built" color="#f59e0b" icon={Box} />
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
              AI analyzes your agent prompts and generates upgrade proposals. Review each one — see the diff, risk level, and affected areas — then approve. Approval triggers the built-in installer which applies the change immediately and logs every step.
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

            <Button onClick={generateProposals} disabled={generating} className="w-full" data-testid="analyze-btn">
              {generating
                ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Analyzing agents &amp; generating upgrades...</>
                : <><TrendingUp className="w-3.5 h-3.5 mr-2" />Generate Upgrade Proposals</>
              }
            </Button>
          </div>

          {proposals.length > 0 && (
            <div className="border-t border-border">
              <div className="px-4 py-2.5 flex items-center justify-between bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground">
                  {proposals.length} proposals
                  {pendingCount > 0 && ` · ${pendingCount} pending`}
                  {appliedIds.size > 0 && ` · ${appliedIds.size} installed`}
                </p>
                {appliedIds.size === proposals.length && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> All installed
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
                    installingId={installingId}
                    installerLogs={installerLogs}
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
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{upgradeHistory.length} installed</span>
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
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {u.agentRole && <span className="text-[10px] text-muted-foreground capitalize">{u.agentRole} agent</span>}
                        {u.category && <span className="text-[10px] text-muted-foreground">{u.category}</span>}
                        {u.appliedAt && <span className="text-[10px] text-muted-foreground">{new Date(u.appliedAt).toLocaleDateString()}</span>}
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase", IMPACT_STYLE[u.impact])}>{u.impact}</span>
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
                        ringColor: isCustomized ? agent.color : undefined,
                      }}
                    >
                      {agent.name.slice(0, 2).toUpperCase()}
                      {isCustomized && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border border-card flex items-center justify-center">
                          <Sparkles className="w-2 h-2 text-card" />
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{agent.name}</span>
                  </div>
                  {i < AGENT_PIPELINE.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40 mx-1 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLocation("/studio")}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
            >
              <Globe className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold">Build Web App</p>
                <p className="text-[10px] text-muted-foreground">single index.html</p>
              </div>
            </button>
            <button
              onClick={() => { setLocation("/studio"); }}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
            >
              <Smartphone className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold">Build Android App</p>
                <p className="text-[10px] text-muted-foreground">PWA, installable</p>
              </div>
            </button>
            <button
              onClick={() => setLocation("/repair")}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
            >
              <Brain className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold">Repair App</p>
                <p className="text-[10px] text-muted-foreground">upload &amp; fix</p>
              </div>
            </button>
            <button
              onClick={() => setLocation("/assets")}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
            >
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold">Generate Assets</p>
                <p className="text-[10px] text-muted-foreground">free images &amp; storyboards</p>
              </div>
            </button>
          </div>
        </div>

        {/* Training status */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Builder Training</h2>
            <button onClick={() => setLocation("/training")} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View training <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{trainedLessons} / {totalLessons} lessons</span>
              <span className="font-medium">{trainingPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${trainingPercent}%` }}
              />
            </div>
          </div>
          {memorySavedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {memorySavedCount} memory entries auto-injected into every build
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
