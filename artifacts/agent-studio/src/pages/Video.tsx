import { useMemo, useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clapperboard, Download, Loader2, Sparkles, Play, FileVideo2, Clock3, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type VideoPreset = {
  title: string;
  prompt: string;
  style: string;
  duration: string;
};

const PRESETS: VideoPreset[] = [
  {
    title: "Tutorial",
    prompt: "Create a clear step-by-step tutorial video with narration, simple on-screen captions, and a calm teaching style.",
    style: "Educational",
    duration: "2–4 min",
  },
  {
    title: "Explainer",
    prompt: "Create a short explainer video that breaks down a concept with visuals, examples, and concise narration.",
    style: "Animated",
    duration: "60–120 sec",
  },
  {
    title: "Custom",
    prompt: "Create the exact video the user asked for, matching the requested tone, pacing, and visuals.",
    style: "Flexible",
    duration: "Any",
  },
];

export default function VideoPage() {
  const { settings } = useStudio();
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const preset = PRESETS[selected];

  const outputPrompt = useMemo(() => {
    const base = prompt.trim() || preset.prompt;
    return [
      "You are Jarvis, a helpful video creator inside Agent Studio.",
      "Create a video plan the user can use to make a polished video.",
      `Style: ${preset.style}.`,
      `Target duration: ${preset.duration}.`,
      `Voice: ${settings.voiceName || "auto-picked default"}.`,
      base,
    ].join("\n");
  }, [preset, prompt, settings.voiceName]);

  const handleCreate = () => {
    setIsGenerating(true);
    setResult(null);
    window.setTimeout(() => {
      setResult(
        "Video draft ready. Use this prompt in a video generator:\n\n" +
        outputPrompt +
        "\n\nSuggested sections:\n1. Hook\n2. Main explanation\n3. Example or demo\n4. Quick recap\n5. Call to action"
      );
      setIsGenerating(false);
    }, 900);
  };

  return (
    <div className="h-full overflow-y-auto p-5 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Clapperboard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Video Generator</h1>
          <p className="text-sm text-muted-foreground">Ask Jarvis to create tutorials, explainers, or custom videos.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create a video</CardTitle>
            <CardDescription>Describe what you want Jarvis to turn into a video.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {PRESETS.map((item, idx) => (
                <button
                  key={item.title}
                  onClick={() => setSelected(idx)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    selected === idx ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/30"
                  )}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.duration}</p>
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={preset.prompt}
              rows={6}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary/50"
            />

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={isGenerating || !prompt.trim() && !preset.prompt}>
                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Create Video Plan
              </Button>
              <Button variant="outline" onClick={() => setPrompt("")}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Jarvis will make</CardTitle>
            <CardDescription>Simple output for tutorials and explainer videos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Play className="w-4 h-4 mt-0.5 text-primary" />
              <span>Scene-by-scene video outline</span>
            </div>
            <div className="flex items-start gap-2">
              <FileVideo2 className="w-4 h-4 mt-0.5 text-primary" />
              <span>Voiceover script and captions</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock3 className="w-4 h-4 mt-0.5 text-primary" />
              <span>Timing guidance for each section</span>
            </div>
            <div className="flex items-start gap-2">
              <WandSparkles className="w-4 h-4 mt-0.5 text-primary" />
              <span>Export-ready prompt for a video model</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Generated plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="whitespace-pre-wrap text-sm rounded-lg border border-border bg-muted/20 p-4 overflow-x-auto">{result}</pre>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(result)}>
              <Download className="w-4 h-4 mr-2" />
              Copy plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}