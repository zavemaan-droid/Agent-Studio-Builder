import { useState, useEffect, useMemo } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import {
  Globe, Smartphone, Trash2, Eye, Download, RefreshCw,
  X, ExternalLink, CheckCircle2, Loader2, AlertCircle,
  ChevronRight, Monitor, Tablet, Code2, Github, Play,
  FileCode, Copy, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";

type Filter = "all" | "web" | "android" | "building" | "ready" | "failed";
type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_SIZES: Record<Viewport, { w: number; label: string; icon: React.ElementType }> = {
  desktop: { w: 100, label: "Desktop", icon: Monitor },
  tablet: { w: 768, label: "Tablet", icon: Tablet },
  mobile: { w: 390, label: "Mobile", icon: Smartphone },
};

// ── Inline all CSS/JS into a single self-contained HTML document ──
function buildSelfContained(files: { path: string; content: string }[]): string {
  const htmlFile = files.find(f =>
    f.path === "index.html" || f.path.endsWith(".html")
  );

  // If no HTML file, wrap everything in a shell
  if (!htmlFile) {
    const css = files.filter(f => f.path.endsWith(".css")).map(f => f.content).join("\n");
    const js = files.filter(f => f.path.endsWith(".js")).map(f => f.content).join("\n");
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><script>${js}<\/script></body></html>`;
  }

  let html = htmlFile.content;

  // Inline every CSS file referenced
  for (const file of files) {
    if (!file.path.endsWith(".css")) continue;
    const name = file.path.split("/").pop()!;
    // Match <link ... href="styles.css" ...> or href="./styles.css"
    const pattern = new RegExp(
      `<link[^>]+href=["'](?:\\./)?${name}["'][^>]*\\/?>`,
      "gi"
    );
    html = html.replace(pattern, `<style>${file.content}<\/style>`);
  }

  // Inline every JS file referenced
  for (const file of files) {
    if (!file.path.endsWith(".js")) continue;
    const name = file.path.split("/").pop()!;
    // Match <script src="app.js"></script> or src="./app.js"
    const pattern = new RegExp(
      `<script[^>]+src=["'](?:\\./)?${name}["'][^>]*><\/script>`,
      "gi"
    );
    html = html.replace(pattern, `<script>${file.content}<\/script>`);
  }

  return html;
}

// ── Full-screen preview modal ──
function PreviewModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const { pushToGithub, settings } = useStudio();
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [activeFile, setActiveFile] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const files = project.files ?? [];

  // Build self-contained HTML once (memoized)
  const selfContainedHtml = useMemo(() => {
    if (project.platform !== "web" || files.length === 0) return null;
    return buildSelfContained(files);
  }, [files, project.platform]);

  // Blob URL refreshes with refreshKey
  const blobUrl = useMemo(() => {
    if (!selfContainedHtml) return null;
    const blob = new Blob([selfContainedHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [selfContainedHtml, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const openInNewTab = () => {
    if (!selfContainedHtml) return;
    const blob = new Blob([selfContainedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    // Revoke after the tab loads
    if (win) setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const downloadHtml = () => {
    if (selfContainedHtml) {
      // Single self-contained HTML
      const blob = new Blob([selfContainedHtml], { type: "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.html`;
      a.click();
    } else if (files.length > 0) {
      // Android — download all files as concatenated text
      const content = files.map(f => `// ===== ${f.path} =====\n${f.content}`).join("\n\n");
      const blob = new Blob([content], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.kt`;
      a.click();
    }
  };

  const copyCode = async () => {
    const file = files[activeFile];
    if (!file) return;
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGithubPush = async () => {
    setPushing(true);
    setPushMsg(null);
    const result = await pushToGithub(project.id);
    setPushMsg(result.success
      ? { ok: true, text: result.url ? `Pushed → ${result.url}` : "Pushed to GitHub!" }
      : { ok: false, text: result.error ?? "Push failed" }
    );
    setPushing(false);
  };

  const vpSize = VIEWPORT_SIZES[viewport];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">

      {/* ── Browser chrome bar ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border shrink-0 select-none">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 mr-1">
          <button
            onClick={onClose}
            className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] hover:brightness-90 flex items-center justify-center group"
            title="Close (Esc)"
          >
            <X className="w-2 h-2 text-[#820000] opacity-0 group-hover:opacity-100" />
          </button>
          <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f]" />
        </div>

        {/* Address bar */}
        <div className="flex-1 flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-1.5 mx-2 min-w-0">
          {project.platform === "web"
            ? <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
            : <Smartphone className="w-3 h-3 text-muted-foreground shrink-0" />
          }
          <span className="text-xs font-mono text-muted-foreground truncate">
            preview://{project.name.toLowerCase().replace(/\s+/g, "-")} — Agent Studio Build
          </span>
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { setRefreshKey(k => k + 1); }}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Refresh preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {project.platform === "web" && blobUrl && (
            <button
              onClick={openInNewTab}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-primary/15 hover:bg-primary/25 text-primary text-xs font-medium transition-colors"
              title="Open in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Chrome
            </button>
          )}

          <button
            onClick={downloadHtml}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {(settings.githubToken || true) && (
            <button
              onClick={handleGithubPush}
              disabled={pushing}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Push to GitHub"
            >
              {pushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* GitHub push message */}
      {pushMsg && (
        <div className={cn(
          "px-4 py-2 text-xs flex items-center justify-between shrink-0",
          pushMsg.ok ? "bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20" : "bg-destructive/10 text-destructive border-b border-destructive/20"
        )}>
          <span className="truncate">{pushMsg.text}</span>
          {pushMsg.ok && pushMsg.text.includes("→") && (
            <a
              href={pushMsg.text.split("→ ")[1]}
              target="_blank"
              rel="noreferrer"
              className="underline ml-2 shrink-0"
            >
              View on GitHub
            </a>
          )}
          <button onClick={() => setPushMsg(null)} className="ml-2 shrink-0"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* ── Tab + Viewport bar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-background shrink-0">
        {/* Preview / Code tabs */}
        <div className="flex items-center gap-0 bg-muted/40 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors",
              activeTab === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Play className="w-3 h-3" /> Preview
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors",
              activeTab === "code" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code2 className="w-3 h-3" /> Code
          </button>
        </div>

        {/* Viewport switcher (only for web preview) */}
        {activeTab === "preview" && project.platform === "web" && (
          <div className="flex items-center gap-0 bg-muted/40 rounded-lg p-0.5">
            {(Object.entries(VIEWPORT_SIZES) as [Viewport, typeof VIEWPORT_SIZES[Viewport]][]).map(([key, val]) => {
              const Icon = val.icon;
              return (
                <button
                  key={key}
                  onClick={() => setViewport(key)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors",
                    viewport === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  title={val.label}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{val.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Copy button (code tab) */}
        {activeTab === "code" && files.length > 0 && (
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>

      {/* ── File tabs (code mode only) ── */}
      {activeTab === "code" && files.length > 0 && (
        <div className="flex items-center gap-0 border-b border-border bg-muted/20 shrink-0 overflow-x-auto">
          {files.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiveFile(i)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-xs font-mono border-r border-border whitespace-nowrap transition-colors shrink-0",
                activeFile === i
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <FileCode className="w-3 h-3 shrink-0" />
              {f.path}
            </button>
          ))}
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 overflow-hidden bg-muted/30 flex items-start justify-center">
        {activeTab === "preview" && project.platform === "web" ? (
          blobUrl ? (
            <div
              className="h-full bg-white shadow-2xl transition-all duration-300 overflow-hidden"
              style={{
                width: viewport === "desktop" ? "100%" : `${vpSize.w}px`,
                maxWidth: viewport === "desktop" ? "100%" : `${vpSize.w}px`,
              }}
            >
              <iframe
                key={`${refreshKey}-${viewport}`}
                src={blobUrl}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                title={`Preview: ${project.name}`}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
              <Globe className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No preview available — build may still be running.</p>
            </div>
          )
        ) : activeTab === "preview" && project.platform === "android" ? (
          <div className="flex flex-col items-center justify-center h-full p-8 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold">Android App</p>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Android apps run on a physical device or emulator. Switch to <strong>Code</strong> view to see the generated Kotlin files, then copy them into Android Studio.
            </p>
            <Button size="sm" onClick={() => setActiveTab("code")}>
              <Code2 className="w-3.5 h-3.5 mr-1.5" />
              View Kotlin Code
            </Button>
            <Button size="sm" variant="outline" onClick={downloadHtml}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download .kt Files
            </Button>
          </div>
        ) : (
          // Code view
          <div className="w-full h-full overflow-auto bg-[#0d1117] font-mono">
            {files.length > 0 ? (
              <pre className="text-[12px] leading-[1.7] text-[#c9d1d9] p-6 whitespace-pre-wrap break-words">
                <code>{files[activeFile]?.content ?? ""}</code>
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No files generated yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Project card ──
function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const { pushToGithub, settings } = useStudio();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

  const doneSteps = project.steps.filter(s => s.status === "done").length;
  const progress = (doneSteps / project.steps.length) * 100;

  const handleDownload = () => {
    const files = project.files ?? [];
    if (files.length === 0) return;

    if (project.platform === "web") {
      const html = buildSelfContained(files);
      const blob = new Blob([html], { type: "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.html`;
      a.click();
    } else {
      const content = files.map(f => `// ===== ${f.path} =====\n${f.content}`).join("\n\n");
      const blob = new Blob([content], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.kt`;
      a.click();
    }
  };

  const handleGithubPush = async () => {
    if (!settings.githubToken) {
      setPushResult("Add your GitHub token in Settings first.");
      setTimeout(() => setPushResult(null), 4000);
      return;
    }
    setPushing(true);
    const result = await pushToGithub(project.id);
    setPushResult(result.success
      ? `Pushed to GitHub${result.url ? " →" : ""}` + (result.url ? " open GitHub" : "")
      : result.error ?? "Push failed"
    );
    setPushing(false);
    setTimeout(() => setPushResult(null), 5000);
  };

  return (
    <>
      {previewOpen && (
        <PreviewModal project={project} onClose={() => setPreviewOpen(false)} />
      )}
      <div className={cn(
        "rounded-xl border bg-card overflow-hidden transition-all hover:border-border/80",
        project.status === "building" && "border-amber-500/30",
        project.status === "ready" && "border-emerald-500/20",
      )}>
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              project.platform === "web" ? "bg-blue-500/20" : "bg-emerald-500/20"
            )}>
              {project.platform === "web"
                ? <Globe className="w-4 h-4 text-blue-400" />
                : <Smartphone className="w-4 h-4 text-emerald-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{project.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {project.status === "building" && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
              {project.status === "ready" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {project.status === "failed" && <AlertCircle className="w-4 h-4 text-destructive" />}
              <button
                onClick={onDelete}
                className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
                title="Delete project"
                data-testid={`delete-${project.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Build progress */}
          {project.status === "building" && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{project.steps.find(s => s.status === "running")?.name ?? "Starting"}...</span>
                <span>{doneSteps}/{project.steps.length}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {/* Agent step indicators */}
              <div className="flex gap-1">
                {project.steps.map(s => (
                  <div
                    key={s.role}
                    className={cn(
                      "flex-1 h-0.5 rounded-full",
                      s.status === "done" ? "bg-emerald-400" :
                      s.status === "running" ? "bg-amber-400 animate-pulse" :
                      s.status === "error" ? "bg-destructive" :
                      "bg-muted"
                    )}
                    title={s.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              project.status === "ready" ? "bg-emerald-500/20 text-emerald-400" :
              project.status === "building" ? "bg-amber-500/20 text-amber-400" :
              "bg-destructive/20 text-destructive"
            )}>
              {project.status}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">{project.platform}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
            {project.files && project.files.length > 0 && (
              <>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">{project.files.length} file{project.files.length !== 1 ? "s" : ""}</span>
              </>
            )}
          </div>
        </div>

        {/* Push result message */}
        {pushResult && (
          <div className="px-4 pb-2 text-xs text-muted-foreground">{pushResult}</div>
        )}

        {/* Action buttons — always visible for ready projects */}
        {project.status === "ready" && (
          <div className="border-t border-border/50 grid grid-cols-3 divide-x divide-border/50">
            {project.platform === "web" ? (
              <button
                onClick={() => setPreviewOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-primary/8 transition-colors"
                data-testid={`preview-${project.id}`}
              >
                <Play className="w-3.5 h-3.5" />
                Preview
              </button>
            ) : (
              <button
                onClick={() => setPreviewOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                data-testid={`code-${project.id}`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Code
              </button>
            )}

            <button
              onClick={handleDownload}
              disabled={!project.files || project.files.length === 0}
              className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-40"
              data-testid={`download-${project.id}`}
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>

            <button
              onClick={handleGithubPush}
              disabled={pushing}
              className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-40"
              data-testid={`github-${project.id}`}
            >
              {pushing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Github className="w-3.5 h-3.5" />
              }
              GitHub
            </button>
          </div>
        )}

        {/* Failed state */}
        {project.status === "failed" && (
          <div className="border-t border-destructive/20 px-4 py-2.5">
            <p className="text-xs text-destructive">
              {project.steps.find(s => s.status === "error")?.output?.slice(0, 120) ?? "Build failed"}
            </p>
          </div>
        )}

        {/* Building — show what each agent is doing */}
        {project.status === "building" && (
          <div className="border-t border-border/50 divide-y divide-border/30">
            {project.steps.filter(s => s.status === "running" || s.status === "done").slice(-2).map(s => (
              <div key={s.role} className="flex items-center gap-2 px-4 py-2">
                {s.status === "running"
                  ? <Loader2 className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
                  : <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                }
                <span className="text-[11px] text-muted-foreground">{s.name}</span>
                {s.status === "running" && (
                  <span className="text-[10px] text-amber-400 ml-auto animate-pulse">working...</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Projects page ──
export default function ProjectsPage() {
  const { projects, deleteProject } = useStudio();
  const [filter, setFilter] = useState<Filter>("all");

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: projects.length },
    { id: "ready", label: "Ready", count: projects.filter(p => p.status === "ready").length },
    { id: "building", label: "Building", count: projects.filter(p => p.status === "building").length },
    { id: "web", label: "Web" },
    { id: "android", label: "Android" },
    { id: "failed", label: "Failed", count: projects.filter(p => p.status === "failed").length },
  ];

  const filtered = projects.filter(p => {
    if (filter === "all") return true;
    if (filter === "web" || filter === "android") return p.platform === filter;
    return p.status === filter;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Projects</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {projects.length} project{projects.length !== 1 ? "s" : ""} — Preview, download, or push to GitHub
        </p>
      </div>

      <div className="px-5 py-2.5 border-b border-border flex gap-1.5 flex-wrap shrink-0">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1",
              filter === f.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className={cn(
                "text-[9px] px-1 rounded-full font-medium",
                filter === f.id ? "bg-primary/20" : "bg-muted"
              )}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Globe className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium">No projects yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a build in Studio or use a template from the Library.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} onDelete={() => deleteProject(p.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
