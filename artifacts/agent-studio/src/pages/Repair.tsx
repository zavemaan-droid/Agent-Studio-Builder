import { useState, useCallback, useRef } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Wrench, Upload, X, FileCode, Loader2, CheckCircle2,
  XCircle, Circle, ChevronDown, ChevronRight, Bug,
  Palette, Smartphone, Shield, Gauge, Sparkles, Trash2,
  FolderOpen, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentStep } from "@/lib/types";

const REPAIR_MODES = [
  {
    id: "bug",
    label: "Bug Repair",
    Icon: Bug,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20 hover:border-red-500/50",
    activeBorder: "border-red-500/60 bg-red-500/8",
    prompt: "Fix all bugs in this app. Identify and repair JavaScript errors, null/undefined crashes, broken event listeners, missing error handling, and any other runtime issues. Keep all existing functionality intact.",
  },
  {
    id: "ui",
    label: "UI Repair",
    Icon: Palette,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20 hover:border-purple-500/50",
    activeBorder: "border-purple-500/60 bg-purple-500/8",
    prompt: "Repair and improve the UI/UX. Fix broken layouts, misaligned elements, ugly styling, inconsistent spacing, and make the interface look professional and polished. Preserve all existing functionality.",
  },
  {
    id: "mobile",
    label: "Mobile Layout",
    Icon: Smartphone,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20 hover:border-blue-500/50",
    activeBorder: "border-blue-500/60 bg-blue-500/8",
    prompt: "Repair the mobile layout. Make the app fully responsive, fix touch targets that are too small, fix overflow and scroll issues, ensure proper mobile navigation, and optimise for small screens.",
  },
  {
    id: "security",
    label: "Security Fix",
    Icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20 hover:border-amber-500/50",
    activeBorder: "border-amber-500/60 bg-amber-500/8",
    prompt: "Scan and fix security vulnerabilities. Address XSS risks, unsafe innerHTML usage, exposed credentials in code, missing input validation, CSRF issues, and insecure data handling.",
  },
  {
    id: "performance",
    label: "Performance",
    Icon: Gauge,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20 hover:border-green-500/50",
    activeBorder: "border-green-500/60 bg-green-500/8",
    prompt: "Optimise performance. Reduce unnecessary re-renders, minimise bundle size, fix memory leaks, improve load time, add caching where appropriate, and remove unused code.",
  },
  {
    id: "enhance",
    label: "Enhance & Polish",
    Icon: Sparkles,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20 hover:border-pink-500/50",
    activeBorder: "border-pink-500/60 bg-pink-500/8",
    prompt: "Enhance and upgrade this app. Improve user experience, add missing polish, fix rough edges, add smooth animations, and bring it to a professional quality level.",
  },
] as const;

const STEP_COLORS: Record<string, string> = {
  analyzer:      "text-amber-400",
  reconstructor: "text-blue-400",
  polisher:      "text-purple-400",
  packager:      "text-pink-400",
};

function StepCard({ step, index }: { step: AgentStep; index: number }) {
  const [open, setOpen] = useState(false);
  const color = STEP_COLORS[step.role] ?? "text-muted-foreground";
  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-all duration-300",
      step.status === "running"  ? "border-amber-500/50 bg-amber-500/5" :
      step.status === "done"     ? "border-emerald-500/30 bg-emerald-500/5" :
      step.status === "error"    ? "border-destructive/40 bg-destructive/5" :
      "border-border bg-card"
    )}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => step.output && step.status === "done" && setOpen(o => !o)}
      >
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {step.status === "queued"  && <Circle className="w-4 h-4 text-muted-foreground/40" />}
          {step.status === "running" && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
          {step.status === "done"    && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {step.status === "error"   && <XCircle className="w-4 h-4 text-destructive" />}
        </div>
        <span className="text-xs font-mono text-muted-foreground/60 w-6 shrink-0">{String(index + 1).padStart(2, "0")}</span>
        <span className={cn("text-sm font-medium flex-1", color)}>{step.name}</span>
        {step.finishedAt && step.startedAt && (
          <span className="text-[10px] text-muted-foreground">
            {((step.finishedAt - step.startedAt) / 1000).toFixed(1)}s
          </span>
        )}
        {step.output && step.status === "done" && (
          open
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      {open && step.output && (
        <div className="px-4 pb-4 pt-0">
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words max-h-60 overflow-y-auto bg-background/50 rounded p-3 border border-border">
            {step.output.slice(0, 1200)}{step.output.length > 1200 ? "\n\u2026" : ""}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function RepairPage() {
  const { startRebuild, getProject } = useStudio();
  const [, setLocation] = useLocation();

  const [selectedMode, setSelectedMode] = useState<string>("bug");
  const [sourceFiles, setSourceFiles] = useState<{ path: string; content: string }[]>([]);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [building, setBuilding] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef  = useRef<HTMLInputElement>(null);

  const activeProject = buildId ? getProject(buildId) : null;
  const activeMode = REPAIR_MODES.find(m => m.id === selectedMode)!;

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target?.result as string ?? "");
      r.onerror = rej;
      r.readAsText(file);
    });

  const addTextFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const skipExts = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
      ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".zip"];
    const results: { path: string; content: string }[] = [];
    for (const file of arr) {
      if (skipExts.some(ext => file.name.toLowerCase().endsWith(ext))) continue;
      try {
        const content = await readFileAsText(file);
        results.push({ path: file.name, content });
      } catch { /* skip binary */ }
    }
    setSourceFiles(prev => {
      const existing = new Set(prev.map(f => f.path));
      return [...prev, ...results.filter(r => !existing.has(r.path))];
    });
  }, []);

  const handleZipUpload = useCallback(async (file: File) => {
    setExtracting(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(file);
      const skipExts = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
        ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".DS_Store"];
      const skipDirs = ["node_modules/", ".git/", "dist/", "build/", ".next/", "__pycache__/"];
      const results: { path: string; content: string }[] = [];
      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        if (skipDirs.some(d => path.includes(d))) continue;
        if (skipExts.some(e => path.toLowerCase().endsWith(e))) continue;
        if (path.startsWith("__MACOSX")) continue;
        try {
          const content = await entry.async("string");
          if (content.length > 0 && content.length < 200_000) {
            const parts = path.split("/");
            const cleanPath = parts.length > 1 ? parts.slice(1).join("/") : path;
            results.push({ path: cleanPath || path, content });
          }
        } catch { /* skip */ }
      }
      setSourceFiles(prev => {
        const existing = new Set(prev.map(f => f.path));
        return [...prev, ...results.filter(r => !existing.has(r.path))];
      });
    } catch {
      setError("Failed to extract ZIP. Try uploading individual files instead.");
    } finally {
      setExtracting(false);
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const zip = files.find(f => f.name.endsWith(".zip"));
    if (zip) void handleZipUpload(zip);
    else void addTextFiles(e.dataTransfer.files);
  }, [handleZipUpload, addTextFiles]);

  const handleStartRepair = async () => {
    if (sourceFiles.length === 0) { setError("Upload your app files first."); return; }
    setError(null);
    setBuilding(true);
    try {
      const fullInstructions = [
        activeMode.prompt,
        extraInstructions.trim() ? `\n\nAdditional instructions: ${extraInstructions.trim()}` : "",
      ].join("");
      const id = await startRebuild(sourceFiles, fullInstructions, "web");
      setBuildId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start repair");
      setBuilding(false);
    }
  };

  if (activeProject && buildId) {
    const steps = activeProject.steps ?? [];
    const allDone = steps.every(s => s.status === "done" || s.status === "error");
    const hasFiles = (activeProject.files?.length ?? 0) > 0;

    const downloadFiles = () => {
      if (!activeProject.files) return;
      const content = activeProject.files.map(f =>
        `/* \u2550\u2550\u2550 ${f.path} \u2550\u2550\u2550 */\n${f.content}`
      ).join("\n\n");
      const blob = new Blob([content], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "repaired-app.txt";
      a.click();
      URL.revokeObjectURL(a.href);
    };

    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Wrench className="w-5 h-5 text-primary" />
              <div>
                <h1 className="text-base font-semibold">Repair in Progress</h1>
                <p className="text-xs text-muted-foreground mt-0.5">{activeMode.label} \u00b7 {sourceFiles.length} file{sourceFiles.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            {allDone && (
              <Button size="sm" variant="ghost" onClick={() => { setBuildId(null); setBuilding(false); setSourceFiles([]); }}>
                New Repair
              </Button>
            )}
          </div>
        </div>
        <div className="p-5 space-y-4 max-w-2xl mx-auto w-full">
          <div className="space-y-2">
            {steps.map((step, i) => <StepCard key={step.role} step={step} index={i} />)}
          </div>
          {allDone && hasFiles && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-300">Repair Complete</p>
              </div>
              <p className="text-xs text-muted-foreground">{activeProject.files?.length ?? 0} file{(activeProject.files?.length ?? 0) !== 1 ? "s" : ""} repaired and ready to download.</p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={downloadFiles} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Download Repaired Files
                </Button>
                <Button size="sm" variant="outline" onClick={() => setLocation("/projects")}>
                  View in Projects
                </Button>
              </div>
            </div>
          )}
          {allDone && activeProject.status === "failed" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm font-semibold text-destructive">Repair Failed</p>
              </div>
              <p className="text-xs text-muted-foreground">An agent encountered an error. Try again \u2014 it usually works on the second attempt.</p>
              <Button size="sm" variant="outline" onClick={() => { setBuildId(null); setBuilding(false); }}>Try Again</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <Wrench className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-semibold">Repair</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Upload an existing app \u00b7 pick a repair mode \u00b7 get it fixed</p>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-5 max-w-2xl mx-auto w-full">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Repair Mode</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {REPAIR_MODES.map(mode => {
              const { Icon } = mode;
              const isActive = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                    isActive ? mode.activeBorder : `border-border ${mode.border}`
                  )}
                >
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", mode.bg)}>
                    <Icon className={cn("w-4 h-4", mode.color)} />
                  </div>
                  <span className={cn("text-xs font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-1 italic">
            {activeMode.prompt.slice(0, 110)}\u2026
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upload App Files</p>
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
              dragOver ? "border-primary/60 bg-primary/5" : "border-border hover:border-muted-foreground/30"
            )}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {extracting ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Extracting ZIP\u2026</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-muted-foreground/60" />
                <p className="text-sm font-medium">Drop files here or tap to browse</p>
                <p className="text-xs text-muted-foreground">HTML, CSS, JS, TS or ZIP package</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => fileInputRef.current?.click()}>
              <FolderOpen className="w-3.5 h-3.5 mr-1.5" /> Browse Files
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => zipInputRef.current?.click()}>
              <FileCode className="w-3.5 h-3.5 mr-1.5" /> Upload ZIP
            </Button>
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files) void addTextFiles(e.target.files); e.target.value = ""; }} />
          <input ref={zipInputRef} type="file" accept=".zip" className="hidden" onChange={e => { if (e.target.files?.[0]) void handleZipUpload(e.target.files[0]); e.target.value = ""; }} />
        </div>
        {sourceFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{sourceFiles.length} file{sourceFiles.length !== 1 ? "s" : ""} loaded</p>
              <button onClick={() => setSourceFiles([])} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            </div>
            <div className="rounded-xl border border-border divide-y divide-border/50 overflow-hidden max-h-48 overflow-y-auto">
              {sourceFiles.map(f => (
                <div key={f.path} className="flex items-center gap-2.5 px-3 py-2 bg-card">
                  <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground flex-1 truncate">{f.path}</span>
                  <span className="text-[10px] text-muted-foreground/60">{(f.content.length / 1000).toFixed(1)}k</span>
                  <button onClick={() => setSourceFiles(prev => prev.filter(x => x.path !== f.path))}>
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Additional Instructions <span className="normal-case font-normal">(optional)</span></p>
          <textarea
            value={extraInstructions}
            onChange={e => setExtraInstructions(e.target.value)}
            placeholder="e.g. The login button is broken. The sidebar doesn't close on mobile."
            className="w-full h-20 text-sm bg-card border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        {error && (
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
        <Button onClick={handleStartRepair} disabled={building || sourceFiles.length === 0} className="w-full" size="lg">
          {building
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting repair\u2026</>
            : <><Wrench className="w-4 h-4 mr-2" />Start {activeMode.label}</>
          }
        </Button>
        {sourceFiles.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">Upload your app files above to begin</p>
        )}
      </div>
    </div>
  );
}
