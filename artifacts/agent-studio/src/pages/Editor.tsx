import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useStudio } from "@/contexts/StudioContext";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import { cn } from "@/lib/utils";
import {
  Save, Archive, Play, Eye, EyeOff, FileCode, ChevronDown,
  Check, Loader2, Globe, Smartphone, RefreshCw, X, Plus, Code2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";

// ── Inline CSS/JS into self-contained HTML ──
function buildSelfContained(files: { path: string; content: string }[]): string {
  const htmlFile = files.find(f => f.path === "index.html" || f.path.endsWith(".html"));
  if (!htmlFile) {
    const css = files.filter(f => f.path.endsWith(".css")).map(f => f.content).join("\n");
    const js  = files.filter(f => f.path.endsWith(".js")).map(f => f.content).join("\n");
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><script>${js}<\/script></body></html>`;
  }
  let html = htmlFile.content;
  for (const file of files) {
    if (!file.path.endsWith(".css")) continue;
    const name = file.path.split("/").pop()!;
    html = html.replace(new RegExp(`<link[^>]+href=["'](?:\\./)?${name}["'][^>]*\\/?>`, "gi"), `<style>${file.content}<\/style>`);
  }
  for (const file of files) {
    if (!file.path.endsWith(".js")) continue;
    const name = file.path.split("/").pop()!;
    html = html.replace(new RegExp(`<script[^>]+src=["'](?:\\./)?${name}["'][^>]*><\/script>`, "gi"), `<script>${file.content}<\/script>`);
  }
  return html;
}

// ── Pick CodeMirror language extension for a file ──
function langFor(path: string) {
  if (path.endsWith(".html")) return html();
  if (path.endsWith(".css"))  return css();
  if (path.endsWith(".json")) return json();
  if (path.endsWith(".js") || path.endsWith(".ts")) return javascript();
  return javascript();
}

// ── File icon color ──
function fileColor(path: string) {
  if (path.endsWith(".html")) return "text-orange-400";
  if (path.endsWith(".css"))  return "text-blue-400";
  if (path.endsWith(".js"))   return "text-yellow-400";
  if (path.endsWith(".json")) return "text-emerald-400";
  if (path.endsWith(".ts"))   return "text-sky-400";
  return "text-muted-foreground";
}

// ── CodeMirror editor wrapper ──
function CodeEditor({
  content, path, onChange,
}: { content: string; path: string; onChange: (v: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef      = useRef<EditorView | null>(null);
  const onChangeRef  = useRef(onChange);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Build / rebuild editor when file switches
  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy previous
    viewRef.current?.destroy();

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        oneDark,
        langFor(path),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { overflow: "auto", fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" },
          ".cm-content": { padding: "8px 0" },
        }),
      ],
    });

    viewRef.current = new EditorView({ state, parent: containerRef.current });

    return () => { viewRef.current?.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]); // only rebuild when file changes

  // Sync external content changes (e.g. switching files) without rebuilding
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
}

// ── New file modal ──
function NewFileModal({ onConfirm, onClose }: { onConfirm: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm space-y-4">
        <p className="text-sm font-semibold">New File</p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) { onConfirm(name.trim()); } }}
          placeholder="filename.html / styles.css / app.js"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => name.trim() && onConfirm(name.trim())}>Create</Button>
        </div>
      </div>
    </div>
  );
}

export default function EditorPage() {
  const [location] = useLocation();
  const { projects, updateProjectFiles } = useStudio();

  // Determine initial project from ?id= query param
  const queryId = useMemo(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    return params.get("id") ?? null;
  }, [location]);

  const readyProjects = projects.filter(p => p.status === "ready" && p.files && p.files.length > 0);

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (queryId) return queryId;
    return readyProjects[0]?.id ?? null;
  });
  const [activeFile, setActiveFile]   = useState(0);
  const [files, setFiles]             = useState<{ path: string; content: string }[]>([]);
  const [dirty, setDirty]             = useState(false);
  const [saved, setSaved]             = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey]   = useState(0);
  const [showPicker, setShowPicker]   = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);

  const project: Project | undefined = projects.find(p => p.id === selectedId);

  // Load files when project changes
  useEffect(() => {
    if (!project?.files) { setFiles([]); return; }
    setFiles(project.files.map(f => ({ ...f })));
    setActiveFile(0);
    setDirty(false);
    setSaved(false);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((val: string) => {
    setFiles(prev => prev.map((f, i) => i === activeFile ? { ...f, content: val } : f));
    setDirty(true);
    setSaved(false);
  }, [activeFile]);

  const handleSave = useCallback(() => {
    if (!selectedId || files.length === 0) return;
    updateProjectFiles(selectedId, files);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [selectedId, files, updateProjectFiles]);

  const handleDownload = useCallback(async () => {
    if (files.length === 0) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    files.forEach(f => zip.file(f.path, f.content));
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(project?.name ?? "project").replace(/\s+/g, "-").toLowerCase()}.zip`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }, [files, project]);

  const handleAddFile = useCallback((name: string) => {
    const ext = name.split(".").pop() ?? "js";
    const templates: Record<string, string> = {
      html: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <title>App</title>\n</head>\n<body>\n\n</body>\n</html>",
      css:  "/* Styles */\n",
      js:   "// App logic\n",
      json: "{\n  \n}\n",
    };
    const newFile = { path: name, content: templates[ext] ?? "" };
    setFiles(prev => [...prev, newFile]);
    setActiveFile(files.length);
    setDirty(true);
    setShowNewFile(false);
  }, [files.length]);

  // Preview blob URL
  const previewHtml = useMemo(() => {
    if (!showPreview || files.length === 0) return null;
    const hasHtml = files.some(f => f.path.endsWith(".html"));
    if (!hasHtml) return null;
    return buildSelfContained(files);
  }, [files, showPreview, previewKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const blobUrl = useMemo(() => {
    if (!previewHtml) return null;
    const blob = new Blob([previewHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [previewHtml]);

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  // Keyboard save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const currentFile = files[activeFile];

  // ── Empty state ──
  if (readyProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Code2 className="w-8 h-8 text-primary" />
        </div>
        <p className="text-base font-semibold">No apps to edit yet</p>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Build an app in Studio first. Once it's ready, come back here to edit the code, tweak the design, and live-preview changes.
        </p>
        <Button size="sm" onClick={() => window.location.href = "/studio"}>
          <Play className="w-3.5 h-3.5 mr-1.5" /> Start a Build
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0d1117]">
      {showNewFile && (
        <NewFileModal
          onConfirm={handleAddFile}
          onClose={() => setShowNewFile(false)}
        />
      )}

      {/* ── Top toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8 bg-[#161b22] shrink-0 flex-wrap">

        {/* Project picker */}
        <div className="relative">
          <button
            onClick={() => setShowPicker(p => !p)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-xs text-white/80 transition-colors max-w-[160px]"
          >
            {project?.platform === "android"
              ? <Smartphone className="w-3 h-3 text-emerald-400 shrink-0" />
              : <Globe className="w-3 h-3 text-blue-400 shrink-0" />
            }
            <span className="truncate">{project?.name ?? "Select project"}</span>
            <ChevronDown className="w-3 h-3 text-white/40 shrink-0" />
          </button>
          {showPicker && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-[#1c2128] border border-white/10 rounded-xl shadow-2xl min-w-[200px] max-h-64 overflow-y-auto">
              {readyProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedId(p.id); setShowPicker(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs hover:bg-white/5 transition-colors",
                    p.id === selectedId && "text-primary bg-primary/10"
                  )}
                >
                  {p.platform === "android"
                    ? <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    : <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  }
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto text-white/30 shrink-0">{p.files?.length ?? 0}f</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10" />

        {/* File tabs — horizontal scroll */}
        <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          {files.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiveFile(i)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] whitespace-nowrap transition-colors shrink-0",
                i === activeFile
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <FileCode className={cn("w-3 h-3 shrink-0", fileColor(f.path))} />
              {f.path}
            </button>
          ))}
          <button
            onClick={() => setShowNewFile(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors shrink-0"
            title="New file"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 shrink-0" />

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!dirty}
            title="Save (Ctrl+S)"
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all",
              saved  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
              dirty  ? "bg-primary/25 text-primary border border-primary/40 hover:bg-primary/35" :
                       "bg-white/5 text-white/30 border border-white/10 cursor-default"
            )}
          >
            {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saved ? "Saved" : "Save"}
          </button>

          {/* Preview toggle */}
          <button
            onClick={() => { setShowPreview(p => !p); setPreviewKey(k => k + 1); }}
            title={showPreview ? "Hide preview" : "Show live preview"}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all border",
              showPreview
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80"
            )}
          >
            {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showPreview ? "Hide" : "Preview"}
          </button>

          {/* Refresh preview */}
          {showPreview && (
            <button
              onClick={() => setPreviewKey(k => k + 1)}
              title="Refresh preview"
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}

          {/* Download ZIP */}
          <button
            onClick={handleDownload}
            disabled={files.length === 0}
            title="Download as ZIP"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 text-[11px] transition-colors disabled:opacity-30"
          >
            <Archive className="w-3 h-3" />
            .zip
          </button>
        </div>
      </div>

      {/* ── Unsaved changes banner ── */}
      {dirty && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-amber-400">Unsaved changes</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (project?.files) {
                  setFiles(project.files.map(f => ({ ...f })));
                  setDirty(false);
                }
              }}
              className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              Discard
            </button>
            <button onClick={handleSave} className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors font-medium">
              Save now
            </button>
          </div>
        </div>
      )}

      {/* ── Editor + Preview ── */}
      <div className={cn("flex-1 overflow-hidden flex", showPreview ? "flex-col md:flex-row" : "flex-col")}>

        {/* Editor panel */}
        <div className={cn(
          "flex flex-col overflow-hidden",
          showPreview ? "flex-1 min-h-0 md:min-h-full" : "flex-1"
        )}>
          {currentFile ? (
            <CodeEditor
              key={`${selectedId}-${currentFile.path}`}
              content={currentFile.content}
              path={currentFile.path}
              onChange={handleChange}
            />
          ) : (
            <div className="flex items-center justify-center h-full gap-3 text-center p-8">
              <p className="text-sm text-white/30">Select a project to start editing</p>
            </div>
          )}
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className={cn(
            "flex flex-col border-t md:border-t-0 md:border-l border-white/8 bg-white",
            "h-[45vh] md:h-full md:w-[45%] shrink-0"
          )}>
            {/* Preview header */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161b22] border-b border-white/8 shrink-0">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              </div>
              <span className="text-[10px] text-white/40 font-mono truncate flex-1">
                preview://{project?.name?.toLowerCase().replace(/\s+/g, "-") ?? "app"}
              </span>
              <button
                onClick={() => setShowPreview(false)}
                className="text-white/30 hover:text-white/70 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {blobUrl ? (
              <iframe
                key={`preview-${previewKey}`}
                src={blobUrl}
                className="flex-1 w-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                title="Live Preview"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#0d1117] text-white/30 text-sm p-6 text-center">
                {files.some(f => f.path.endsWith(".html"))
                  ? "Save changes to refresh preview"
                  : "No HTML file found — preview requires an index.html"
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center gap-3 px-3 py-1 bg-[#161b22] border-t border-white/8 shrink-0 text-[10px] text-white/30">
        <span className={fileColor(currentFile?.path ?? "")}>{currentFile?.path ?? "—"}</span>
        <span>·</span>
        <span>{currentFile ? `${currentFile.content.split("\n").length} lines` : "—"}</span>
        <span>·</span>
        <span>{currentFile ? `${currentFile.content.length} chars` : "—"}</span>
        {project && (
          <>
            <span>·</span>
            <span className={cn(project.platform === "android" ? "text-emerald-400/60" : "text-blue-400/60")}>
              {project.platform === "android" ? "Android PWA" : "Web App"}
            </span>
          </>
        )}
        <span className="ml-auto">{dirty ? "● modified" : saved ? "✓ saved" : ""}</span>
      </div>
    </div>
  );
}
