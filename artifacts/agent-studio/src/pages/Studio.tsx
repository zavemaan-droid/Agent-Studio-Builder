import { useState, useEffect } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Zap, Globe, Smartphone, CheckCircle2, Circle, Loader2,
  XCircle, ChevronDown, ChevronRight, Upload, X, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Platform, AgentStep } from "@/lib/types";

const AGENT_COLORS: Record<string, string> = {
  architect: "text-amber-400",
  builder: "text-blue-400",
  designer: "text-purple-400",
  qa: "text-emerald-400",
  packager: "text-pink-400",
};

const PRESETS = [
  { label: "AI Companion (Android)", description: "Offline Android PWA AI companion — unfiltered chat using Pollinations AI (no API key), AI image generation with /imagine command, voice responses, 4 selectable characters, persistent memory. Installs from Chrome on Android.", platform: "android" as Platform },
  { label: "Security Monitor", description: "Professional web security scanner — audits HTTP headers, tests CORS, clickjacking, open redirects, XSS payloads, cookie flags. Logs findings by severity (Critical/High/Medium/Low). Exports HTML pentest reports.", platform: "web" as Platform },
  { label: "Todo App", description: "A todo list with categories, due dates, and local storage", platform: "web" as Platform },
  { label: "Android Chat", description: "A mobile chat app with contacts, chat threads, and notifications — installable on Android from Chrome", platform: "android" as Platform },
];

function StepCard({ step, index, onRebuild }: { step: AgentStep; index: number; onRebuild?: () => void }) {
  const [open, setOpen] = useState(false);
  const colorClass = AGENT_COLORS[step.role] ?? "text-muted-foreground";

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-all duration-300",
      step.status === "running"   ? "border-amber-500/50 bg-amber-500/5" :
      step.status === "retrying"  ? "border-orange-500/60 bg-orange-500/8" :
      step.status === "done"      ? "border-emerald-500/30 bg-emerald-500/5" :
      step.status === "error"     ? "border-destructive/40 bg-destructive/5" :
      "border-border bg-card"
    )}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => step.output && step.status === "done" && setOpen(o => !o)}
      >
        <div className="flex items-center justify-center w-5 h-5 shrink-0">
          {step.status === "queued"   && <Circle className="w-4 h-4 text-muted-foreground/40" />}
          {step.status === "running"  && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
          {step.status === "retrying" && <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />}
          {step.status === "done"     && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {step.status === "error"    && <XCircle className="w-4 h-4 text-destructive" />}
        </div>
        <span className="text-xs font-mono text-muted-foreground/60 w-6 shrink-0">{String(index + 1).padStart(2, "0")}</span>
        <span className={cn("text-sm font-medium flex-1", colorClass)}>{step.name}</span>
        <div className="flex items-center gap-2">
          {step.status === "retrying" && (
            <span className="text-[10px] text-orange-400 font-medium bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/30">
              retrying {step.attempt}/3
            </span>
          )}
          {step.status === "done" && step.attempt && step.attempt > 1 && (
            <span className="text-[10px] text-amber-400/70">
              ✓ passed on attempt {step.attempt}
            </span>
          )}
          {step.finishedAt && step.startedAt && (
            <span className="text-[10px] text-muted-foreground">
              {((step.finishedAt - step.startedAt) / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        {step.output && step.status === "done" && (
          open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      {open && step.output && (
        <div className="px-4 pb-4 pt-0">
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto bg-background/50 rounded p-3 border border-border">
            {step.output}
          </pre>
        </div>
      )}
      {step.status === "error" && onRebuild && (
        <div className="px-4 pb-3">
          <button
            onClick={onRebuild}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rebuild from {step.name}
          </button>
        </div>
      )}
    </div>
  );
}

export default function StudioPage() {
  const { startBuild, rebuildFromStep, projects, settings, updateSettings, activeBuildId, getProject, importProject } = useStudio();
  const [location, setLocation] = useLocation();
  const prefill = sessionStorage.getItem("studio-prefill") ?? "";
  if (prefill) sessionStorage.removeItem("studio-prefill");
  const [description, setDescription] = useState(prefill);
  const [platform, setPlatform] = useState<Platform>(settings.selectedPlatform);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedContent, setUploadedContent] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [importedId, setImportedId] = useState<string | null>(null);

  // Get build ID from URL params
  const buildId = new URLSearchParams(location.split("?")[1] ?? "").get("build") ?? activeBuildId;
  const activeProject = buildId ? getProject(buildId) : projects.find(p => p.status === "building");

  useEffect(() => {
    setPlatform(settings.selectedPlatform);
  }, [settings.selectedPlatform]);

  const handleBuild = async () => {
    const desc = uploadedContent
      ? `${description}\n\n[Uploaded file: ${uploadName}]\n${uploadedContent.slice(0, 2000)}`
      : description;
    if (!desc.trim()) return;
    setSubmitting(true);
    try {
      const id = await startBuild(desc.trim(), platform);
      setDescription("");
      setUploadedContent(null);
      setUploadName(null);
      setLocation(`/studio?build=${id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    if (file.name.endsWith(".zip")) {
      setUploadedContent("ZIP upload detected. Use Projects → Import/Edit flow to unpack and edit file sets.");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => setUploadedContent(ev.target?.result as string ?? null);
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!uploadedContent || !uploadName) return;
    const id = importProject({
      name: uploadName.replace(/\.[^/.]+$/, "") || "Imported App",
      description: `Imported app from ${uploadName}. Edit it and release it back out.`,
      platform,
      files: [{ path: uploadName, content: uploadedContent }],
      uploadedFrom: uploadName,
    });
    setImportedId(id);
    setLocation(`/editor?id=${id}`);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Build Studio</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Describe your app — the AI writes the code</p>
      </div>

      <div className="p-5 space-y-5 max-w-2xl w-full mx-auto flex-1">
        {/* Preset cards */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Quick Start</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => { setDescription(p.description); setPlatform(p.platform); }}
                className="text-left p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-xs"
                data-testid={`preset-${i}`}
              >
                <p className="font-medium text-foreground">{p.label}</p>
                <p className="text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Platform</p>
          <div className="flex gap-2">
            {(["web", "android"] as Platform[]).map(p => (
              <button
                key={p}
                onClick={() => { setPlatform(p); updateSettings({ selectedPlatform: p }); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                  platform === p
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-border/80"
                )}
                data-testid={`platform-${p}`}
              >
                {p === "web" ? <Globe className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                {p === "web" ? "Web App" : "Android App"}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">App Description</p>
          <div className="relative">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your app in plain English — be as specific or as vague as you want..."
              rows={5}
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-primary/50 transition-colors resize-none placeholder:text-muted-foreground"
              data-testid="description-input"
            />
          </div>
        </div>

        {/* File upload */}
        <div>
          {uploadedContent ? (
            <div className="flex items-center gap-2 text-sm p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-400 flex-1 truncate">Uploaded: {uploadName}</span>
              <button onClick={() => { setUploadedContent(null); setUploadName(null); }}>
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all text-xs text-muted-foreground">
              <Upload className="w-4 h-4 shrink-0" />
              <span>Upload existing app or file to build upon (.html, .js, .ts, .kt, .zip, .json)</span>
              <input type="file" className="hidden" accept=".html,.js,.ts,.tsx,.kt,.json,.txt,.zip" onChange={handleFileUpload} />
            </label>
          )}
        </div>

        {/* Build button */}
        <Button
          onClick={handleBuild}
          disabled={!description.trim() || submitting}
          className="w-full h-11 text-sm font-semibold"
          data-testid="start-build"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
          Start Build
        </Button>
        {uploadedContent && uploadName && (
          <Button variant="outline" onClick={handleImport} className="w-full h-11 text-sm font-semibold">
            Import file and edit it
          </Button>
        )}
        {importedId && (
          <p className="text-xs text-emerald-400">Imported and opened in the editor.</p>
        )}

        {/* Active build pipeline */}
        {activeProject && (
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{activeProject.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{activeProject.description.slice(0, 80)}</p>
              </div>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                activeProject.status === "building" ? "bg-amber-500/20 text-amber-400" :
                activeProject.status === "ready" ? "bg-emerald-500/20 text-emerald-400" :
                "bg-destructive/20 text-destructive"
              )}>
                {activeProject.status}
              </span>
            </div>
            <div className="space-y-1.5">
              {activeProject.steps.map((step, i) => (
                <StepCard
                  key={step.role}
                  step={step}
                  index={i}
                  onRebuild={step.status === "error" ? () => rebuildFromStep(activeProject.id, i) : undefined}
                />
              ))}
            </div>
            {activeProject.status === "ready" && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => setLocation("/projects")}
              >
                View in Projects
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
