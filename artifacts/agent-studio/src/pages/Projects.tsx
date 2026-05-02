import { useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import {
  Globe, Smartphone, Trash2, Eye, Download, RefreshCw,
  X, ExternalLink, CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";

type Filter = "all" | "web" | "android" | "building" | "ready" | "failed";

function PreviewModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"preview" | "files">("preview");
  const [activeFile, setActiveFile] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const files = project.files ?? [];
  const webFile = files.find(f => f.path === "index.html") ?? files[0];

  const getBlobUrl = () => {
    if (!webFile) return null;
    const blob = new Blob([webFile.content], { type: "text/html" });
    return URL.createObjectURL(blob);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-card border-b border-border shrink-0">
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-destructive/80 hover:bg-destructive flex items-center justify-center group">
          <X className="w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
        </button>
        <div className="w-7 h-7 rounded-full bg-amber-400/80" />
        <div className="w-7 h-7 rounded-full bg-emerald-400/80" />

        <div className="flex-1 mx-3 flex items-center gap-2 bg-background border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground">
          <Globe className="w-3 h-3 shrink-0" />
          <span className="flex-1 font-mono">preview://{project.name.toLowerCase().replace(/\s+/g, "-")}</span>
        </div>

        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh preview"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveTab(t => t === "preview" ? "files" : "preview")}
          className="text-xs px-2.5 py-1 rounded border border-border hover:border-primary/40 transition-colors text-muted-foreground"
        >
          {activeTab === "preview" ? "View Code" : "Preview"}
        </button>
      </div>

      {/* Tabs bar (file tabs) */}
      {activeTab === "files" && files.length > 0 && (
        <div className="flex items-center gap-0 border-b border-border bg-background shrink-0 overflow-x-auto">
          {files.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiveFile(i)}
              className={cn(
                "px-4 py-2 text-xs font-mono border-r border-border whitespace-nowrap transition-colors",
                activeFile === i
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              {f.path}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "preview" && project.platform === "web" ? (
          webFile ? (
            <iframe
              key={refreshKey}
              src={getBlobUrl() ?? ""}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              title={`Preview: ${project.name}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No preview available for this project yet.
            </div>
          )
        ) : activeTab === "preview" && project.platform === "android" ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="max-w-md text-center space-y-4">
              <Smartphone className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Android apps can't run in the browser. View the code to see the generated Kotlin files.</p>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("files")}>View Code</Button>
            </div>
          </div>
        ) : files.length > 0 ? (
          <div className="h-full overflow-auto bg-background">
            <pre className="text-xs font-mono text-muted-foreground p-6 whitespace-pre-wrap break-words leading-relaxed">
              {files[activeFile]?.content ?? "No content"}
            </pre>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No files generated yet.
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleDownload = () => {
    const files = project.files ?? [];
    if (files.length === 0) return;
    const content = files.map(f => `// === ${f.path} ===\n${f.content}`).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name.replace(/\s+/g, "-")}.txt`;
    a.click();
  };

  const doneSteps = project.steps.filter(s => s.status === "done").length;
  const progress = (doneSteps / project.steps.length) * 100;

  return (
    <>
      {previewOpen && <PreviewModal project={project} onClose={() => setPreviewOpen(false)} />}
      <div className={cn(
        "rounded-xl border bg-card p-4 space-y-3 transition-all hover:border-border/80",
        project.status === "building" && "border-amber-500/30"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
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
          <div className="flex items-center gap-1">
            {project.status === "building" && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
            {project.status === "ready" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            {project.status === "failed" && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
          </div>
        </div>

        {project.status === "building" && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{doneSteps}/{project.steps.length} agents done</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-medium",
            project.status === "ready" ? "bg-emerald-500/20 text-emerald-400" :
            project.status === "building" ? "bg-amber-500/20 text-amber-400" :
            "bg-destructive/20 text-destructive"
          )}>
            {project.status}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(project.createdAt).toLocaleDateString()}
          </span>
          {project.files && project.files.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{project.files.length} files</span>
          )}
        </div>

        <div className="flex gap-1.5">
          {project.status === "ready" && project.platform === "web" && (
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setPreviewOpen(true)} data-testid={`preview-${project.id}`}>
              <Eye className="w-3 h-3 mr-1" /> Preview
            </Button>
          )}
          {project.status === "ready" && project.files && project.files.length > 0 && (
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={handleDownload} data-testid={`download-${project.id}`}>
              <Download className="w-3 h-3 mr-1" /> Download
            </Button>
          )}
          {project.status === "ready" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setExpanded(e => !e)} data-testid={`expand-${project.id}`}>
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={onDelete} data-testid={`delete-${project.id}`}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {expanded && project.files && project.files.length > 0 && (
          <div className="border-t border-border pt-3 space-y-1">
            {project.files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-mono text-muted-foreground">{f.path}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function ProjectsPage() {
  const { projects, deleteProject } = useStudio();
  const [filter, setFilter] = useState<Filter>("all");

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "web", label: "Web" },
    { id: "android", label: "Android" },
    { id: "building", label: "Building" },
    { id: "ready", label: "Ready" },
    { id: "failed", label: "Failed" },
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
        <p className="text-xs text-muted-foreground mt-0.5">{projects.length} project{projects.length !== 1 ? "s" : ""} total</p>
      </div>

      <div className="px-5 py-3 border-b border-border flex gap-1.5 flex-wrap shrink-0">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              filter === f.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Globe className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No projects yet — start a build in Studio or chat with the Assistant.</p>
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
