import { useCallback, useMemo, useRef, useState } from "react";
import {
  CheckCircle2, Download, Film, Heart, ImageIcon, Loader2,
  PackagePlus, RefreshCw, Sparkles, Trash2, Upload, Video
} from "lucide-react";
import { useStudio } from "@/contexts/StudioContext";
import { generateImage, generateVideoStoryboard, type VideoStoryboard } from "@/lib/ai";

type Mode = "project" | "personal";
type AssetKind =
  | "icon" | "logo" | "background" | "character"
  | "screenshot" | "thumbnail" | "video" | "animation"
  | "splash" | "banner" | "product" | "placeholder";

type AssetStatus = "placeholder" | "generating" | "ready" | "error" | "storyboard";

type GeneratedAsset = {
  id: string;
  mode: Mode;
  kind: AssetKind;
  prompt: string;
  projectId?: string;
  createdAt: number;
  favorite?: boolean;
  status: AssetStatus;
  imageUrl?: string;
  storyboard?: VideoStoryboard;
  errorMsg?: string;
  manualUploadUrl?: string;
};

const STORAGE_KEY = "agent-studio:generated-assets";

function loadAssets(): GeneratedAsset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GeneratedAsset[]) : [];
  } catch { return []; }
}

function saveAssets(assets: GeneratedAsset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

const KINDS: { id: AssetKind; label: string; isVideo?: boolean }[] = [
  { id: "icon",        label: "App icon" },
  { id: "logo",        label: "Logo" },
  { id: "splash",      label: "Splash screen" },
  { id: "banner",      label: "Banner / header" },
  { id: "background",  label: "Background" },
  { id: "character",   label: "Character / avatar" },
  { id: "screenshot",  label: "Screenshot / mockup" },
  { id: "thumbnail",   label: "Thumbnail" },
  { id: "product",     label: "Product image" },
  { id: "placeholder", label: "Placeholder image" },
  { id: "animation",   label: "Loading animation", isVideo: true },
  { id: "video",       label: "Short video / intro", isVideo: true },
];

const SIZE_PRESETS: Record<string, { w: number; h: number; label: string }> = {
  icon:        { w: 512,  h: 512,  label: "512×512" },
  logo:        { w: 512,  h: 256,  label: "512×256" },
  splash:      { w: 640,  h: 1136, label: "640×1136" },
  banner:      { w: 1200, h: 400,  label: "1200×400" },
  background:  { w: 1024, h: 576,  label: "1024×576" },
  character:   { w: 512,  h: 512,  label: "512×512" },
  screenshot:  { w: 640,  h: 1136, label: "640×1136" },
  thumbnail:   { w: 640,  h: 360,  label: "640×360" },
  product:     { w: 512,  h: 512,  label: "512×512" },
  placeholder: { w: 512,  h: 512,  label: "512×512" },
  animation:   { w: 640,  h: 360,  label: "16:9 storyboard" },
  video:       { w: 640,  h: 360,  label: "16:9 storyboard" },
};

function StatusBadge({ status }: { status: AssetStatus }) {
  if (status === "ready")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">Ready</span>;
  if (status === "generating")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" />Generating…</span>;
  if (status === "storyboard")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">Storyboard</span>;
  if (status === "error")
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium">Error</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Saved</span>;
}

export default function AssetGeneratorPage() {
  const { projects } = useStudio();
  const [mode, setMode]          = useState<Mode>("project");
  const [kind, setKind]          = useState<AssetKind>("icon");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [prompt, setPrompt]       = useState("");
  const [assets, setAssets]       = useState<GeneratedAsset[]>(loadAssets);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const filteredAssets = useMemo(
    () => assets.filter(a => a.mode === mode),
    [assets, mode]
  );

  const updateAsset = useCallback((id: string, patch: Partial<GeneratedAsset>) => {
    setAssets(prev => {
      const next = prev.map(a => a.id === id ? { ...a, ...patch } : a);
      saveAssets(next);
      return next;
    });
  }, []);

  const isVideoKind = KINDS.find(k => k.id === kind)?.isVideo ?? false;

  const generate = useCallback(async () => {
    if (!prompt.trim()) return;
    const id = `asset-${Date.now()}`;
    const newAsset: GeneratedAsset = {
      id,
      mode,
      kind,
      prompt: prompt.trim(),
      projectId: mode === "project" ? projectId || undefined : undefined,
      createdAt: Date.now(),
      status: "generating",
    };
    setAssets(prev => { const next = [newAsset, ...prev]; saveAssets(next); return next; });
    setPrompt("");

    if (isVideoKind) {
      // Video: build storyboard + placeholder still
      try {
        const storyboard = await generateVideoStoryboard(
          newAsset.prompt,
          "cinematic",
          6,
          "16:9"
        );
        updateAsset(id, {
          status: "storyboard",
          storyboard,
          imageUrl: storyboard.placeholderImageUrl,
        });
      } catch (err) {
        updateAsset(id, { status: "error", errorMsg: (err as Error).message });
      }
    } else {
      // Image: generate via Pollinations (free, no key needed)
      const preset = SIZE_PRESETS[kind] ?? { w: 512, h: 512 };
      try {
        const imageUrl = await generateImage(newAsset.prompt, {
          width:  preset.w,
          height: preset.h,
        });
        updateAsset(id, { status: "ready", imageUrl });
      } catch (err) {
        updateAsset(id, { status: "error", errorMsg: (err as Error).message });
      }
    }
  }, [prompt, mode, kind, projectId, isVideoKind, updateAsset]);

  const remove = (id: string) => {
    setAssets(prev => { const next = prev.filter(a => a.id !== id); saveAssets(next); return next; });
  };

  const toggleFavorite = (id: string) => {
    setAssets(prev => {
      const next = prev.map(a => a.id === id ? { ...a, favorite: !a.favorite } : a);
      saveAssets(next);
      return next;
    });
  };

  const handleManualUpload = (assetId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      updateAsset(assetId, { status: "ready", imageUrl: dataUrl, manualUploadUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const downloadAsset = (asset: GeneratedAsset) => {
    if (!asset.imageUrl) return;
    const a = document.createElement("a");
    a.href = asset.imageUrl;
    a.download = `${asset.kind}-${asset.id}.jpg`;
    a.target = "_blank";
    a.click();
  };

  const retryAsset = async (asset: GeneratedAsset) => {
    updateAsset(asset.id, { status: "generating", errorMsg: undefined });
    if (isVideoKind || asset.kind === "video" || asset.kind === "animation") {
      try {
        const storyboard = await generateVideoStoryboard(asset.prompt, "cinematic", 6, "16:9");
        updateAsset(asset.id, { status: "storyboard", storyboard, imageUrl: storyboard.placeholderImageUrl });
      } catch (err) {
        updateAsset(asset.id, { status: "error", errorMsg: (err as Error).message });
      }
    } else {
      const preset = SIZE_PRESETS[asset.kind] ?? { w: 512, h: 512 };
      try {
        const imageUrl = await generateImage(asset.prompt, { width: preset.w, height: preset.h });
        updateAsset(asset.id, { status: "ready", imageUrl });
      } catch (err) {
        updateAsset(asset.id, { status: "error", errorMsg: (err as Error).message });
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Asset Generator</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Free image generation via Pollinations · Video storyboards · Project &amp; personal media
        </p>
      </div>

      <div className="p-5 space-y-4 max-w-2xl mx-auto w-full">
        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("project")}
            className={`rounded-xl border p-4 text-left transition-colors ${mode === "project" ? "border-primary bg-primary/10" : "border-border bg-card"}`}
          >
            <PackagePlus className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-semibold">Project Assets</p>
            <p className="text-xs text-muted-foreground mt-1">Icons, images, and media for app builds.</p>
          </button>
          <button
            onClick={() => setMode("personal")}
            className={`rounded-xl border p-4 text-left transition-colors ${mode === "personal" ? "border-primary bg-primary/10" : "border-border bg-card"}`}
          >
            <ImageIcon className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-semibold">Personal Media</p>
            <p className="text-xs text-muted-foreground mt-1">Owner-only personal picture &amp; video generation.</p>
          </button>
        </div>

        {/* Generator form */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Asset type</span>
              <select
                value={kind}
                onChange={e => setKind(e.target.value as AssetKind)}
                className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm"
              >
                {KINDS.map(k => (
                  <option key={k.id} value={k.id}>
                    {k.label}{k.isVideo ? " 🎬" : ""}
                  </option>
                ))}
              </select>
            </label>

            {mode === "project" && (
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Attach to project</span>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm"
                >
                  <option value="">No project selected</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            )}
          </div>

          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">
              Prompt
              {isVideoKind && <span className="ml-2 text-blue-400">(storyboard + still frame)</span>}
              {!isVideoKind && <span className="ml-2 text-emerald-400">({SIZE_PRESETS[kind]?.label ?? "512×512"} · free)</span>}
            </span>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
              placeholder={
                mode === "project"
                  ? isVideoKind
                    ? "Short intro video for a dark AI builder app, dramatic reveal…"
                    : "Clean Android launcher icon for a dark AI builder app, neon blue glow…"
                  : "Cinematic personal portrait with dramatic lighting…"
              }
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm resize-none"
            />
          </label>

          <button
            onClick={() => { void generate(); }}
            disabled={!prompt.trim()}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
          >
            {isVideoKind ? <Video className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {isVideoKind ? "Generate storyboard" : "Generate image (free)"}
          </button>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Images: Pollinations AI — free, no key needed. Videos: storyboard + still frame placeholder until a real video provider is configured. Approve &amp; attach generated assets to builds from the gallery below.
          </p>
        </div>

        {/* Gallery */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {mode === "project" ? "Project asset gallery" : "Personal media gallery"}
            </h2>
            <span className="text-xs text-muted-foreground">{filteredAssets.length} saved</span>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No assets yet. Describe what you need above and hit Generate.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
              {filteredAssets.map(asset => (
                <div key={asset.id} className="rounded-xl border border-border bg-background/40 p-3 space-y-3">
                  {/* Preview */}
                  <div className="aspect-video rounded-lg bg-muted/40 border border-border flex items-center justify-center overflow-hidden relative">
                    {asset.status === "generating" ? (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs">Generating…</span>
                      </div>
                    ) : asset.imageUrl ? (
                      <>
                        <img src={asset.imageUrl} alt={asset.prompt} className="w-full h-full object-cover rounded-lg" />
                        {asset.status === "storyboard" && (
                          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Film className="w-2.5 h-2.5" /> Storyboard
                          </div>
                        )}
                        {asset.status === "ready" && (
                          <div className="absolute bottom-1 right-1 bg-emerald-500/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                          </div>
                        )}
                      </>
                    ) : asset.status === "error" ? (
                      <div className="flex flex-col items-center gap-2 p-3 text-center">
                        <p className="text-destructive text-xs font-medium">Generation failed</p>
                        <p className="text-[10px] text-muted-foreground">{asset.errorMsg}</p>
                        <label className="text-[10px] text-primary underline cursor-pointer">
                          Upload manually
                          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleManualUpload(asset.id, e.target.files[0])} />
                        </label>
                      </div>
                    ) : (
                      asset.kind === "video" || asset.kind === "animation"
                        ? <Film className="w-8 h-8 text-muted-foreground" />
                        : <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Meta */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold capitalize">{asset.kind.replace("_", " ")}</p>
                      <StatusBadge status={asset.status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{asset.prompt}</p>
                    {asset.storyboard && (
                      <p className="text-[10px] text-blue-400 mt-1">
                        {asset.storyboard.frames.length} frames · {asset.storyboard.durationSec}s · {asset.storyboard.aspectRatio}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => toggleFavorite(asset.id)}
                      className={`h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 transition-colors ${asset.favorite ? "text-pink-400 border-pink-400/30" : "text-muted-foreground"}`}
                    >
                      <Heart className="w-3 h-3" />
                    </button>
                    {(asset.status === "ready" || asset.status === "storyboard") && asset.imageUrl && (
                      <button
                        onClick={() => downloadAsset(asset)}
                        className="h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Download className="w-3 h-3" /> Export
                      </button>
                    )}
                    {asset.status === "error" && (
                      <button
                        onClick={() => { void retryAsset(asset); }}
                        className="h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                    )}
                    {(asset.status === "storyboard") && (
                      <label className="h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 text-blue-400 cursor-pointer hover:text-blue-300 transition-colors">
                        <Upload className="w-3 h-3" /> Upload MP4
                        <input type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && handleManualUpload(asset.id, e.target.files[0])} />
                      </label>
                    )}
                    <button
                      onClick={() => remove(asset.id)}
                      className="h-8 px-2 rounded-lg border border-border text-xs flex items-center gap-1 text-destructive ml-auto hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
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
