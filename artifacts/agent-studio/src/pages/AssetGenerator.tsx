import { useMemo, useState } from "react";
import { Download, Film, Heart, ImageIcon, PackagePlus, Sparkles, Trash2 } from "lucide-react";
import { useStudio } from "@/contexts/StudioContext";

type Mode = "project" | "personal";
type AssetKind = "icon" | "logo" | "background" | "character" | "screenshot" | "thumbnail" | "video" | "animation";

type GeneratedAsset = {
  id: string;
  mode: Mode;
  kind: AssetKind;
  prompt: string;
  projectId?: string;
  createdAt: number;
  favorite?: boolean;
  status: "placeholder" | "ready";
};

const STORAGE_KEY = "agent-studio:generated-assets";

function loadAssets(): GeneratedAsset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as GeneratedAsset[] : [];
  } catch {
    return [];
  }
}

function saveAssets(assets: GeneratedAsset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

const KINDS: { id: AssetKind; label: string }[] = [
  { id: "icon", label: "App icon" },
  { id: "logo", label: "Logo" },
  { id: "background", label: "Background" },
  { id: "character", label: "Character" },
  { id: "screenshot", label: "Screenshot / mockup" },
  { id: "thumbnail", label: "Thumbnail" },
  { id: "video", label: "Short video" },
  { id: "animation", label: "Loading animation" },
];

export default function AssetGeneratorPage() {
  const { projects } = useStudio();
  const [mode, setMode] = useState<Mode>("project");
  const [kind, setKind] = useState<AssetKind>("icon");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [assets, setAssets] = useState<GeneratedAsset[]>(loadAssets);

  const filteredAssets = useMemo(() => assets.filter(a => a.mode === mode), [assets, mode]);

  const generate = () => {
    if (!prompt.trim()) return;
    const next: GeneratedAsset = {
      id: `asset-${Date.now()}`,
      mode,
      kind,
      prompt: prompt.trim(),
      projectId: mode === "project" ? projectId || undefined : undefined,
      createdAt: Date.now(),
      status: "placeholder",
    };
    const updated = [next, ...assets];
    setAssets(updated);
    saveAssets(updated);
    setPrompt("");
  };

  const remove = (id: string) => {
    const updated = assets.filter(a => a.id !== id);
    setAssets(updated);
    saveAssets(updated);
  };

  const toggleFavorite = (id: string) => {
    const updated = assets.map(a => a.id === id ? { ...a, favorite: !a.favorite } : a);
    setAssets(updated);
    saveAssets(updated);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Asset Generator</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Create project assets or private personal pictures/videos</p>
      </div>

      <div className="p-5 space-y-4 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setMode("project")} className={`rounded-xl border p-4 text-left ${mode === "project" ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
            <PackagePlus className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-semibold">Project Assets</p>
            <p className="text-xs text-muted-foreground mt-1">Icons, images, videos, and media packs for apps.</p>
          </button>
          <button onClick={() => setMode("personal")} className={`rounded-xl border p-4 text-left ${mode === "personal" ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
            <ImageIcon className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-semibold">Personal Media</p>
            <p className="text-xs text-muted-foreground mt-1">Owner-only personal picture and video generation.</p>
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Asset type</span>
              <select value={kind} onChange={e => setKind(e.target.value as AssetKind)} className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm">
                {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </label>

            {mode === "project" && (
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Attach to project</span>
                <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm">
                  <option value="">No project selected</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            )}
          </div>

          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Prompt</span>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder={mode === "project" ? "Create a clean Android launcher icon for a dark AI builder app..." : "Create a personal cinematic portrait/video concept..."} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm resize-none" />
          </label>

          <button onClick={generate} disabled={!prompt.trim()} className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />Generate asset placeholder
          </button>

          <p className="text-[10px] text-muted-foreground leading-relaxed">This foundation saves prompts and placeholder records now. Real image/video providers can plug in next; video falls back to storyboards/prompts until a provider is configured.</p>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">{mode === "project" ? "Project asset gallery" : "Personal media gallery"}</h2>
            <span className="text-xs text-muted-foreground">{filteredAssets.length} saved</span>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No assets yet. Generate one above.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
              {filteredAssets.map(asset => (
                <div key={asset.id} className="rounded-xl border border-border bg-background/40 p-3 space-y-3">
                  <div className="aspect-video rounded-lg bg-muted/40 border border-border flex items-center justify-center">
                    {asset.kind === "video" || asset.kind === "animation" ? <Film className="w-8 h-8 text-muted-foreground" /> : <ImageIcon className="w-8 h-8 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold capitalize">{asset.kind.replace("_", " ")}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3">{asset.prompt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleFavorite(asset.id)} className={`h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 ${asset.favorite ? "text-pink-400" : "text-muted-foreground"}`}><Heart className="w-3 h-3" />Fav</button>
                    <button className="h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 text-muted-foreground"><Download className="w-3 h-3" />Export</button>
                    <button onClick={() => remove(asset.id)} className="h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 text-destructive ml-auto"><Trash2 className="w-3 h-3" />Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
