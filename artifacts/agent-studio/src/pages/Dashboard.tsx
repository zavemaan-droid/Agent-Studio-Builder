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
import { buildLocalUpgradeProposals, normalizeUpgradeProposals } from "@/lib/localSelfUpgrade";
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

function ProposalCard({ proposal, appliedIds, skippedIds, installingId, onApply, onSkip }: {
  proposal: UpgradeProposal;
  appliedIds: Set<string>;
  skippedIds: Set<string>;
  installingId: string | null;
  onApply: (p: UpgradeProposal) => Promise<void> | void;
  onSkip: (id: string) => void;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const [activeTab, setActiveTab] = useState<"before" | "after">("after");
  const applied = appliedIds.has(proposal.id);
  const skipped = skippedIds.has(proposal.id);

  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden transition-all", applied && "border-emerald-500/40 bg-emerald-500/5", skipped && "opacity-50 border-border", !applied && !skipped && "border-border hover:border-primary/30")}>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">{proposal.title}</p>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide", IMPACT_STYLE[proposal.impact])}>{proposal.impact} impact</span>
              {proposal.riskLevel && <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">risk: {proposal.riskLevel}</span>}
              {proposal.agentRole && <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground capitalize">{proposal.agentRole} agent</span>}
              {applied && <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Installed</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{proposal.description}</p>
            {proposal.expectedResult && <p className="text-[11px] text-emerald-400/80 mt-1">Expected: {proposal.expectedResult}</p>}
          </div>
        </div>

        <button onClick={() => setShowDiff(d => !d)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {showDiff ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showDiff ? "Hide" : "Show"} prompt diff
          <ChevronDown className={cn("w-3 h-3 transition-transform", showDiff && "rotate-180")} />
        </button>

        {showDiff && (
          <div className="rounded-lg border border-border overflow-hidden text-xs">
            <div className="flex border-b border-border">
              <button onClick={() => setActiveTab("before")} className={cn("flex-1 py-1.5 text-center text-[11px] font-medium transition-colors", activeTab === "before" ? "bg-red-500/10 text-red-400" : "text-muted-foreground hover:text-foreground")}>Before</button>
              <button onClick={() => setActiveTab("after")} className={cn("flex-1 py-1.5 text-center text-[11px] font-medium transition-colors", activeTab === "after" ? "bg-emerald-500/10 text-emerald-400" : "text-muted-foreground hover:text-foreground")}>After</button>
            </div>
            <pre className={cn("p-3 text-[11px] leading-relaxed overflow-y-auto max-h-40 whitespace-pre-wrap", activeTab === "before" ? "text-red-300/80" : "text-emerald-300/80")}>{activeTab === "before" ? proposal.before : proposal.after}</pre>
          </div>
        )}

        {!applied && !skipped && (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => void onApply(proposal)} disabled={installingId === proposal.id}>
              {installingId === proposal.id ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Installing…</> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Approve & Auto Install</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onSkip(proposal.id)} className="text-muted-foreground"><XCircle className="w-3.5 h-3.5 mr-1" />Skip</Button>
          </div>
        )}

        {applied && <div className="text-xs text-emerald-400 flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" /><span className="font-medium">Installed and remembered</span></div>}
      </div>
    </div>
  );
}

function StatCard({ value, label, color, icon: Icon }: { value: string | number; label: string; color: string; icon: React.ElementType }) {
  return <div className="rounded-xl border border-border p-4 flex flex-col gap-2" style={{ background: `${color}18` }}><Icon className="w-5 h-5" style={{ color }} /><p className="text-2xl font-bold" style={{ color }}>{value}</p><p className="text-xs text-muted-foreground leading-tight">{label}</p></div>;
}

export default function DashboardPage() {
  const { projects, memories, modules, trainingState, trainingPercent, settings, agentPrompts, upgradeHistory, applyUpgrade, resetAgentPrompts } = useStudio();
  const [, setLocation] = useLocation();
  const [generating, setGenerating] = useState(false);
  const [proposals, setProposals] = useState<UpgradeProposal[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const readyProjects = projects.filter(p => p.status === "ready").length;
  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const trainedLessons = modules.reduce((a, m) => a + m.lessons.filter(l => trainingState[`${m.id}:${l.id}`]).length, 0);
  const memorySavedCount = memories.filter(m => m.autoInclude).length;
  const appliedUpgrades = upgradeHistory.length;
  const customizedRoles = Object.keys(agentPrompts).filter(role => agentPrompts[role] !== DEFAULT_AGENT_PROMPTS[role]);

  const parseLooseJson = (text: string): UpgradeProposal[] | null => {
    const candidates = [text, text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() ?? ""].filter(Boolean);
    for (const candidate of candidates) {
      const start = candidate.indexOf("[");
      const end = candidate.lastIndexOf("]");
      if (start !== -1 && end !== -1 && end > start) {
        try {
          const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
          if (Array.isArray(parsed)) return parsed as UpgradeProposal[];
        } catch {}
      }
    }
    return null;
  };

  const generateProposals = async () => {
    setGenerating(true);
    setError(null);
    setProposals([]);
    setAppliedIds(new Set());
    setSkippedIds(new Set());

    try {
      const { callAI } = await import("@/lib/ai");
      const currentPromptsSnippets = Object.entries(agentPrompts).map(([role, prompt]) => ({ role, promptPreview: prompt.slice(0, 250) + (prompt.length > 250 ? "..." : "") }));
      const aiPrompt = `You are the Self-Upgrade AI for Builder Studio. Return exactly 4 JSON upgrade proposals for these agent prompts. Include id,title,description,impact,type,agentRole,before,after,category,riskLevel,affectedAreas,expectedResult,rollbackNote. Return only JSON array.\n\nSystem: ${JSON.stringify({ trainingPercent, memories: memories.length, readyProjects, appliedUpgrades, customizedRoles })}\n\nPrompts: ${JSON.stringify(currentPromptsSnippets)}`;
      const raw = await callAI([{ role: "user", content: aiPrompt }], { groqKey: settings.groqKey });
      const parsed = parseLooseJson(raw);
      const normalized = parsed ? normalizeUpgradeProposals(parsed, agentPrompts, upgradeHistory) : buildLocalUpgradeProposals(agentPrompts, upgradeHistory);
      setProposals(normalized.length > 0 ? normalized : buildLocalUpgradeProposals(agentPrompts, upgradeHistory));
    } catch (err) {
      setError("AI proposal discovery failed, so Builder Studio generated local installer-ready proposals instead.");
      setProposals(buildLocalUpgradeProposals(agentPrompts, upgradeHistory));
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = async (proposal: UpgradeProposal) => {
    setInstallingId(proposal.id);
    await new Promise(r => setTimeout(r, 800));
    applyUpgrade({ ...proposal, installerStatus: "installed", approvedAt: Date.now(), installedAt: Date.now(), installerLog: [...(proposal.installerLog ?? []), "Approved by owner.", "Installer applied the upgrade automatically.", "Memory ledger updated to prevent repeated proposal."] });
    setAppliedIds(prev => new Set(prev).add(proposal.id));
    setInstallingId(null);
    try {
      const { jarvisSpeak } = await import("@/lib/jarvisVoice");
      void jarvisSpeak(`${proposal.agentRole ?? "Agent"} upgrade installed and remembered.`);
    } catch {}
  };

  const handleSkip = (id: string) => setSkippedIds(prev => new Set(prev).add(id));
  const pendingCount = proposals.filter(p => !appliedIds.has(p.id) && !skippedIds.has(p.id)).length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0"><div className="flex items-center justify-between"><div><h1 className="text-base font-semibold">{greeting}{settings.userName.trim() ? `, ${settings.userName.trim().split(" ")[0]}` : ""}</h1><p className="text-xs text-muted-foreground mt-0.5">Builder Studio pipeline · {projects.length} project{projects.length !== 1 ? "s" : ""} · {memories.length} memories</p></div><span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">READY</span></div></div>
      <div className="p-5 space-y-5 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-2"><StatCard value={AGENT_PIPELINE.length} label="Active Agents" color="#7c3aed" icon={Bot} /><StatCard value={appliedUpgrades} label="Upgrades Applied" color="#10b981" icon={Sparkles} /><StatCard value={readyProjects} label="Apps Built" color="#f59e0b" icon={Box} /></div>
        <div className="rounded-xl border border-border bg-card overflow-hidden"><div className="p-4 space-y-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" /><h2 className="text-sm font-semibold">Self Analyze / Upgrade</h2>{customizedRoles.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">{customizedRoles.length} agents customized</span>}</div>{customizedRoles.length > 0 && <button onClick={() => setShowReset(r => !r)} className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"><RefreshCcw className="w-3 h-3" /> Reset</button>}</div><p className="text-xs text-muted-foreground leading-relaxed">Builder Studio analyzes agent prompts, wiring expectations, installer behavior, mobile layout, and memory rules. You approve. The installer applies it automatically and remembers it so the same proposal does not return.</p>{showReset && <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-center justify-between"><p className="text-xs text-destructive">Reset all agents to default prompts?</p><div className="flex gap-2"><Button size="sm" variant="destructive" onClick={() => { resetAgentPrompts(); setShowReset(false); setProposals([]); setAppliedIds(new Set()); }}>Reset All</Button><Button size="sm" variant="outline" onClick={() => setShowReset(false)}>Cancel</Button></div></div>}{error && <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /><p className="text-xs text-amber-300">{error}</p></div>}<Button onClick={generateProposals} disabled={generating} className="w-full" data-testid="analyze-btn">{generating ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Analyzing and preparing installer proposals...</> : <><TrendingUp className="w-3.5 h-3.5 mr-2" />Self Analyze / Generate Upgrade Proposals</>}</Button></div>{proposals.length > 0 && <div className="border-t border-border"><div className="px-4 py-2.5 flex items-center justify-between bg-muted/20"><p className="text-xs font-medium text-muted-foreground">{proposals.length} proposals generated{pendingCount > 0 && ` · ${pendingCount} pending approval`}{appliedIds.size > 0 && ` · ${appliedIds.size} installed`}</p>{appliedIds.size === proposals.length && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> All installed</span>}</div><div className="p-4 space-y-3">{proposals.map(p => <ProposalCard key={p.id} proposal={p} appliedIds={appliedIds} skippedIds={skippedIds} installingId={installingId} onApply={handleApply} onSkip={handleSkip} />)}</div></div>}</div>
        {upgradeHistory.length > 0 && <div className="rounded-xl border border-border bg-card overflow-hidden"><button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors" onClick={() => setShowHistory(h => !h)}><div className="flex items-center gap-2"><History className="w-4 h-4 text-muted-foreground" /><p className="text-sm font-medium">Upgrade History</p><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{upgradeHistory.length} applied</span></div><ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showHistory && "rotate-180")} /></button>{showHistory && <div className="border-t border-border divide-y divide-border/50">{upgradeHistory.slice().reverse().map(u => <div key={u.id} className="px-4 py-3 flex items-start gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><div className="flex-1 min-w-0"><p className="text-sm font-medium">{u.title}</p><p className="text-xs text-muted-foreground mt-0.5">{u.description}</p></div></div>)}</div>}</div>}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Agent Pipeline</h2><button onClick={() => setLocation("/agents")} className="text-xs text-primary hover:underline flex items-center gap-0.5">View agents <ChevronRight className="w-3 h-3" /></button></div><div className="flex items-center gap-0 overflow-x-auto pb-1">{AGENT_PIPELINE.map((agent, i) => <div key={agent.role} className="flex items-center gap-0 shrink-0"><div className="flex flex-col items-center gap-1.5"><div className="w-12 h-12 rounded-xl flex items-center justify-center text-[10px] font-bold" style={{ background: `${agent.color}30`, border: `1px solid ${agent.color}50`, color: agent.color }}>{agent.name.slice(0, 2).toUpperCase()}</div><span className="text-[10px] text-muted-foreground whitespace-nowrap">{agent.name}</span></div>{i < AGENT_PIPELINE.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 mx-1 mb-4 shrink-0" />}</div>)}</div></div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3"><h2 className="text-sm font-semibold">Start a Build</h2><div className="grid grid-cols-2 gap-2"><button onClick={() => setLocation("/studio?platform=web")} className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left"><Globe className="w-5 h-5 text-blue-400 shrink-0" /><div><p className="text-xs font-medium">Web App</p><p className="text-[10px] text-muted-foreground">HTML/CSS/JS</p></div></button><button onClick={() => setLocation("/studio?platform=android")} className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"><Smartphone className="w-5 h-5 text-emerald-400 shrink-0" /><div><p className="text-xs font-medium">Android App</p><p className="text-[10px] text-muted-foreground">PWA · Installable</p></div></button></div></div>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-border bg-card p-4 space-y-2 cursor-pointer hover:border-primary/30" onClick={() => setLocation("/training")}><p className="text-xs font-medium text-muted-foreground">AI Training</p><div className="flex items-end justify-between"><p className="text-xl font-bold text-primary">{trainingPercent}%</p><p className="text-[10px] text-muted-foreground">{trainedLessons}/{totalLessons}</p></div><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${trainingPercent}%` }} /></div></div><div className="rounded-xl border border-border bg-card p-4 space-y-2 cursor-pointer hover:border-primary/30" onClick={() => setLocation("/memory")}><p className="text-xs font-medium text-muted-foreground">Memory Bank</p><div className="flex items-end justify-between"><p className="text-xl font-bold text-emerald-400">{memories.length}</p><p className="text-[10px] text-muted-foreground">{memorySavedCount} auto</p></div><p className="text-[10px] text-muted-foreground">memories stored</p></div></div>
      </div>
    </div>
  );
}
