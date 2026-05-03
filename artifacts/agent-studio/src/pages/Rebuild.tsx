import { useState, useCallback, useRef } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  PackageOpen, Upload, X, FileCode, Loader2, CheckCircle2,
  XCircle, Circle, ChevronDown, ChevronRight, Zap, FolderOpen,
  AlertCircle, Trash2, Globe, Smartphone, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Platform, AgentStep } from "@/lib/types";

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
            {step.output.slice(0, 1200)}{step.output.length > 1200 ? "\n…" : ""}
          </pre>
        </div>
      )}
    </div>
  );
}

function fileIcon(path: string) {
  if (path.endsWith(".html")) return "text-orange-400";
  if (path.endsWith(".css"))  return "text-blue-400";
  if (path.endsWith(".js") || path.endsWith(".ts")) return "text-yellow-400";
  if (path.endsWith(".json")) return "text-emerald-400";
  return "text-muted-foreground";
}

export default function RebuildPage() {
  const { startRebuild, getProject, activeBuildId, projects } = useStudio();
  const [, setLocation] = useLocation();

  const [sourceFiles, setSourceFiles] = useState<{ path: string; content: string }[]>([]);
  const [instructions, setInstructions] = useState("");
  const [platform, setPlatform] = useState<Platform>("web");
  const [building, setBuilding] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef  = useRef<HTMLInputElement>(null);

  const activeProject = buildId ? getProject(buildId) : null;

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target?.result as string ?? "");
      r.onerror = rej;
      r.readAsText(file);
    });

  const addTextFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const skipExts = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".zip"];
    const results: { path: string; content: string }[] = [];
    for (const file of arr) {
      const skip = skipExts.some(ext => file.name.toLowerCase().endsWith(ext));
      if (skip) continue;
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
      const skipExts = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".DS_Store"];
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
            // Strip leading zip root folder from path
            const cleanPath = path.replace(/^[^/]+\//, "");
            results.push({ path: cleanPath || path, content });
          }
        } catch { /* skip binary */ }
      }
      setSourceFiles(prev => {
        const existing = new Set(prev.map(f => f.path));
        return [...prev, ...results.filter(r => !existing.has(r.path))];
      });
    } catch (err) {
      console.error("ZIP extraction failed:", err);
    } finally {
      setExtracting(false);
    }
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length === 1 && files[0]?.name.endsWith(".zip")) {
      await handleZipUpload(files[0]);
    } else {
      await addTextFiles(files);
    }
    e.target.value = "";
  }, [handleZipUpload, addTextFiles]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    if (files.length === 1 && files[0]?.name.endsWith(".zip")) {
      await handleZipUpload(files[0]);
    } else {
      await addTextFiles(files);
    }
  }, [handleZipUpload, addTextFiles]);

  const removeFile = (path: string) => setSourceFiles(prev => prev.filter(f => f.path !== path));
  const clearAll = () => setSourceFiles([]);

  const handleRebuild = async () => {
    if (sourceFiles.length === 0 || building) return;
    setBuilding(true);
    try {
      const id = await startRebuild(sourceFiles, instructions, platform);
      setBuildId(id);
    } finally {
      setBuilding(false);
    }
  };

  const totalChars = sourceFiles.reduce((s, f) => s + f.content.length, 0);
  const sizeLabel = totalChars > 1_000_000 ? `${(totalChars / 1_000_000).toFixed(1)}MB`
    : totalChars > 1000 ? `${(totalChars / 1000).toFixed(0)}KB`
    : `${totalChars}B`;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <PackageOpen className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-semibold">Rebuild from Source</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload any app's source code — AI reads it, understands it, and rebuilds a finished product you can download.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5 max-w-2xl w-full mx-auto">

        {/* How it works */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 grid grid-cols-4 gap-3">
          {[
            { step: "1", label: "Upload", desc: "ZIP or individual source files" },
            { step: "2", label: "Analyze", desc: "AI reads every file" },
            { step: "3", label: "Rebuild", desc: "Rewritten as a clean app" },
            { step: "4", label: "Download", desc: "Finished zip, ready to use" },
          ].map(s => (
            <div key={s.step} className="text-center space-y-1">
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center mx-auto">{s.step}</div>
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-[10px] text-muted-foreground leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        {sourceFiles.length === 0 && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "rounded-xl border-2 border-dashed p-10 flex flex-col items-center gap-4 transition-all cursor-pointer",
              dragOver
                ? "border-primary bg-primary/8 scale-[1.01]"
                : "border-border hover:border-primary/40 hover:bg-primary/3"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {extracting ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                <Upload className="w-7 h-7 text-primary" />
              </div>
            )}
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">{extracting ? "Extracting files…" : "Drop your source code here"}</p>
              <p className="text-xs text-muted-foreground">
                Drag a <span className="text-primary font-medium">.zip</span> of your project, or drop individual files (.html, .js, .ts, .css, .py, .json…)
              </p>
              <p className="text-[11px] text-muted-foreground/70">node_modules, images, and binaries are skipped automatically</p>
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                onClick={e => { e.stopPropagation(); zipInputRef.current?.click(); }}
              >
                Upload ZIP
              </button>
              <button
                className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-medium hover:border-primary/40 transition-colors"
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                Upload Files
              </button>
            </div>
          </div>
        )}

        {/* Hidden inputs */}
        <input ref={fileInputRef} type="file" multiple className="hidden"
          accept=".html,.htm,.css,.js,.ts,.tsx,.jsx,.json,.py,.kt,.swift,.java,.rs,.go,.rb,.php,.md,.txt,.env,.yaml,.yml,.xml,.sql"
          onChange={handleFileInput} />
        <input ref={zipInputRef} type="file" className="hidden" accept=".zip"
          onChange={handleFileInput} />

        {/* File list */}
        {sourceFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Source Files ({sourceFiles.length} files · {sizeLabel})
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-primary hover:underline"
                >+ Add more</button>
                <button onClick={clearAll} className="text-xs text-destructive hover:underline">Clear all</button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/50 max-h-64 overflow-y-auto">
              {sourceFiles.map(f => (
                <div key={f.path} className="flex items-center gap-3 px-4 py-2.5">
                  <FileCode className={cn("w-3.5 h-3.5 shrink-0", fileIcon(f.path))} />
                  <span className="text-xs font-mono flex-1 truncate text-foreground/80">{f.path}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {f.content.length > 1000 ? `${(f.content.length / 1000).toFixed(0)}KB` : `${f.content.length}B`}
                  </span>
                  <button onClick={() => removeFile(f.path)} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {extracting && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Extracting more files…
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {sourceFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Special Instructions <span className="normal-case font-normal">(optional)</span>
            </p>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder='e.g. "Make the UI dark and modern", "Add a search feature", "Fix the login flow", "Make it work on mobile"'
              rows={3}
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-primary/50 transition-colors resize-none placeholder:text-muted-foreground"
            />
          </div>
        )}

        {/* Platform */}
        {sourceFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Output Platform</p>
            <div className="flex gap-2">
              {(["web", "android"] as Platform[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                    platform === p
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-border/80"
                  )}
                >
                  {p === "web" ? <Globe className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                  {p === "web" ? "Web App" : "Android App"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rebuild button */}
        {sourceFiles.length > 0 && !activeProject && (
          <Button
            onClick={handleRebuild}
            disabled={building}
            className="w-full h-12 text-sm font-semibold"
          >
            {building
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting rebuild…</>
              : <><Zap className="w-4 h-4 mr-2" />Rebuild into Finished App</>
            }
          </Button>
        )}

        {/* Active build pipeline */}
        {activeProject && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{activeProject.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeProject.status === "building" ? "Rebuilding your app…" :
                   activeProject.status === "ready" ? "Rebuild complete!" : "Rebuild failed"}
                </p>
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
                <StepCard key={step.role} step={step} index={i} />
              ))}
            </div>

            {activeProject.status === "ready" && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">App rebuilt successfully!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeProject.files?.length ?? 0} file{(activeProject.files?.length ?? 0) !== 1 ? "s" : ""} ready — preview, edit, or download from Projects.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 text-xs" onClick={() => setLocation("/projects")}>
                    <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                    View in Projects
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                    setBuildId(null);
                    setSourceFiles([]);
                    setInstructions("");
                  }}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    New rebuild
                  </Button>
                </div>
              </div>
            )}

            {activeProject.status === "failed" && (
              <div className="rounded-xl bg-destructive/8 border border-destructive/30 p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="text-sm text-destructive font-medium">Rebuild failed</p>
                  <p className="text-xs text-muted-foreground">
                    {activeProject.steps.find(s => s.status === "error")?.output?.slice(0, 200) ?? "An agent encountered an error."}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => { setBuildId(null); setBuilding(false); }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Dismiss and try again
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty tip when no files yet */}
        {sourceFiles.length === 0 && !activeProject && (
          <div className="text-center space-y-2 py-4">
            <p className="text-xs text-muted-foreground">
              Works with any web, mobile, or script project — React, Vue, plain HTML, Python scripts, Node apps, and more.
            </p>
            <p className="text-xs text-muted-foreground">
              The output is always a clean, self-contained web app that runs in any browser.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
