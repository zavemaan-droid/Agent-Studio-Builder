import { useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import { Brain, Plus, Trash2, Search, Download, Upload, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MemoryEntry } from "@/lib/types";

const TYPES: { id: MemoryEntry["type"] | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "doc", label: "Doc" },
  { id: "solution", label: "Solution" },
  { id: "snippet", label: "Snippet" },
  { id: "issue", label: "Issue" },
];

const TYPE_COLORS: Record<string, string> = {
  doc: "bg-blue-500/20 text-blue-400",
  solution: "bg-emerald-500/20 text-emerald-400",
  snippet: "bg-purple-500/20 text-purple-400",
  issue: "bg-red-500/20 text-red-400",
};

function AddMemoryModal({ onClose, existing }: { onClose: () => void; existing: MemoryEntry[] }) {
  const { addMemory } = useStudio();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<MemoryEntry["type"]>("doc");
  const [tags, setTags] = useState("");
  const [autoInclude, setAutoInclude] = useState(true);

  const similarExists = title.trim().length > 3 &&
    existing.find(m => m.title.toLowerCase().includes(title.toLowerCase().trim()) || title.toLowerCase().trim().includes(m.title.toLowerCase()));

  const handleAdd = () => {
    if (!title.trim() || !body.trim()) return;
    addMemory({
      type,
      title: title.trim(),
      body: body.trim(),
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      autoInclude,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Add to Memory Bank</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <input
              placeholder="Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
              data-testid="memory-title"
            />
            {similarExists && (
              <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" />
                Similar memory exists: "{similarExists.title}" — saving will update it
              </p>
            )}
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {TYPES.filter(t => t.id !== "all").map(t => (
              <button
                key={t.id}
                onClick={() => setType(t.id as MemoryEntry["type"])}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full border transition-colors",
                  type === t.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            placeholder="What should the AI know? (e.g. 'Always use dark mode by default')"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={4}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
            data-testid="memory-body"
          />

          <input
            placeholder="Tags (comma-separated, e.g. web, styling, ui)"
            value={tags}
            onChange={e => setTags(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
          />

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={autoInclude} onChange={e => setAutoInclude(e.target.checked)} className="accent-primary" />
            Auto-include in AI context (makes AI smarter on every build)
          </label>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleAdd} disabled={!title.trim() || !body.trim()} className="flex-1" data-testid="save-memory">
            Save to Memory
          </Button>
          <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

export default function MemoryPage() {
  const { memories, removeMemory } = useStudio();
  const [filter, setFilter] = useState<MemoryEntry["type"] | "all">("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = memories.filter(m => {
    const matchType = filter === "all" || m.type === filter;
    const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.body.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const autoCount = memories.filter(m => m.autoInclude).length;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(memories, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "agent-studio-memory.json";
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as MemoryEntry[];
        // Import would need addMemory called for each
        alert(`Import: ${imported.length} entries found. Use Add Memory to import individual entries.`);
      } catch {
        alert("Invalid file format");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full">
      {showAdd && <AddMemoryModal onClose={() => setShowAdd(false)} existing={memories} />}

      <div className="px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Memory Bank</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {memories.length} memories · {autoCount} auto-included in AI context
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleExport} className="p-1.5 rounded hover:bg-muted transition-colors" title="Export memories">
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>
            <label className="p-1.5 rounded hover:bg-muted transition-colors cursor-pointer" title="Import memories">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <input type="file" className="hidden" accept=".json" onChange={handleImport} />
            </label>
            <Button size="sm" onClick={() => setShowAdd(true)} data-testid="add-memory">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-border flex gap-2 items-center shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full bg-muted border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex gap-1">
          {TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={cn(
                "text-xs px-2 py-1 rounded border transition-colors",
                filter === t.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Brain className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {memories.length === 0
                ? "Memory bank is empty. Add knowledge to make the AI smarter on every build."
                : "No memories match your filter."
              }
            </p>
            {memories.length === 0 && (
              <Button size="sm" onClick={() => setShowAdd(true)}>Add First Memory</Button>
            )}
          </div>
        ) : (
          filtered.map(mem => (
            <div key={mem.id} className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-card hover:border-border/80 transition-colors group" data-testid={`memory-${mem.id}`}>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{mem.title}</p>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", TYPE_COLORS[mem.type] ?? "bg-muted text-muted-foreground")}>
                    {mem.type}
                  </span>
                  {mem.autoInclude && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">auto</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{mem.body}</p>
                {mem.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {mem.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeMemory(mem.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
                data-testid={`delete-memory-${mem.id}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
