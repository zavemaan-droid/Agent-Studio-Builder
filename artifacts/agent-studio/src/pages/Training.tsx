import { useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import {
  GraduationCap, CheckCircle2, Circle, Loader2, Sparkles,
  RotateCcw, ChevronDown, ChevronRight, Trophy, Info, Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TrainingPage() {
  const { modules, trainingState, trainingPercent, trainLesson, trainAll, resetTraining, memories } = useStudio();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(modules[0]?.id ?? null);
  const [showReset, setShowReset] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [newLessonsFor, setNewLessonsFor] = useState<Set<string>>(new Set());

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const trainedCount = modules.reduce(
    (acc, m) => acc + m.lessons.filter(l => trainingState[`${m.id}:${l.id}`]).length, 0
  );
  const memoriesSaved = memories.filter(m => m.tags.includes("training")).length;

  const handleTrain = async (moduleId: string, lessonId: string) => {
    const key = `${moduleId}:${lessonId}`;
    setBusyKey(key);
    try {
      await trainLesson(moduleId, lessonId);
      const mod = modules.find(m => m.id === moduleId);
      if (mod) {
        const tmpState = { ...trainingState, [key]: true };
        const allDone = mod.lessons.every(l => tmpState[`${moduleId}:${l.id}`]);
        if (allDone) setNewLessonsFor(prev => new Set(prev).add(moduleId));
      }
    } finally {
      setBusyKey(null);
    }
  };

  const handleTrainAll = async (moduleId: string) => {
    setBusyKey(`mod:${moduleId}`);
    try {
      await trainAll(moduleId);
      setNewLessonsFor(prev => new Set(prev).add(moduleId));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-base font-semibold">Agent Training</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Train NOVA to get smarter. Learned lessons help it answer better, ask fewer questions, and build apps more like you want.
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="text-muted-foreground text-xs" onClick={() => setShowReset(true)}>
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-4 max-w-2xl mx-auto w-full">
        {/* Overall progress card */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-semibold">Overall Progress</p>
            <span className="ml-auto text-sm font-medium text-muted-foreground">{trainedCount}/{totalLessons} lessons</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${trainingPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{trainingPercent}% complete</span>
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              <span>{memoriesSaved} memories saved</span>
            </div>
          </div>
        </div>

        {/* How Training Works */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowHowItWorks(h => !h)}
          >
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <p className="text-sm font-semibold">How Training Works</p>
            </div>
            {showHowItWorks ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showHowItWorks && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              When you finish lessons, NOVA remembers the useful parts and uses them in chats and future builds. This helps it give clearer answers and better results.
            </p>
          )}
          {!showHowItWorks && (
            <p className="text-xs text-muted-foreground">
              Finish lessons to make NOVA smarter and more helpful.
            </p>
          )}
        </div>

        {showReset && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center justify-between">
            <p className="text-sm text-destructive">Reset all training progress?</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => { resetTraining(); setShowReset(false); setNewLessonsFor(new Set()); }}>Reset</Button>
              <Button size="sm" variant="outline" onClick={() => setShowReset(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Module cards */}
        {modules.map(mod => {
          const modTrained = mod.lessons.filter(l => trainingState[`${mod.id}:${l.id}`]).length;
          const modTotal = mod.lessons.length;
          const modPct = modTotal > 0 ? Math.round((modTrained / modTotal) * 100) : 0;
          const allDone = modTrained === modTotal;
          const isExpanded = expanded === mod.id;
          const busyMod = busyKey === `mod:${mod.id}`;
          const hasNewLessons = newLessonsFor.has(mod.id);

          return (
            <div key={mod.id} className={cn(
              "rounded-xl border bg-card overflow-hidden",
              allDone && "border-emerald-500/30"
            )}>
              {/* Module header */}
              <button
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : mod.id)}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${mod.color}20` }}>
                  <GraduationCap className="w-5 h-5" style={{ color: mod.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{mod.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{mod.agentLabel}</span>
                    {hasNewLessons && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> New lessons
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${modPct}%`, background: mod.color }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{modTrained}/{modTotal}</span>
                  </div>
                </div>
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                }
              </button>

              {/* Lesson list */}
              {isExpanded && (
                <div className="border-t border-border">
                  <div className="divide-y divide-border/50">
                    {mod.lessons.map((lesson, idx) => {
                      const lKey = `${mod.id}:${lesson.id}`;
                      const isTrained = !!trainingState[lKey];
                      const isBusy = busyKey === lKey;

                      return (
                        <div
                          key={lesson.id}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3",
                            isTrained ? "bg-emerald-500/3" : ""
                          )}
                        >
                          <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground">
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> :
                             isTrained ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                             idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm", isTrained && "text-muted-foreground line-through")}>{lesson.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{lesson.description}</p>
                          </div>
                          {!isTrained ? (
                            <button
                              onClick={() => handleTrain(mod.id, lesson.id)}
                              disabled={!!busyKey}
                              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-50 font-medium flex items-center gap-1"
                              data-testid={`train-${lesson.id}`}
                            >
                              START <ChevronRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 shrink-0">
                              <Brain className="w-3 h-3" />
                              <span>Learned</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Train all / Module complete */}
                  <div className="px-4 py-3 border-t border-border/50">
                    {!allDone ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => handleTrainAll(mod.id)}
                        disabled={!!busyKey}
                        data-testid={`train-all-${mod.id}`}
                      >
                        {busyMod ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <GraduationCap className="w-3 h-3 mr-1.5" />}
                        Train All {modTotal - modTrained} Remaining Lessons
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        Module complete — NOVA learned from this module and may add new advanced lessons.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
