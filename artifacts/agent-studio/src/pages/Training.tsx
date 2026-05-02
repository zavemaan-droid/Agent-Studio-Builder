import { useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import { GraduationCap, CheckCircle2, Circle, Loader2, Sparkles, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TrainingPage() {
  const { modules, trainingState, trainingPercent, trainLesson, trainAll, resetTraining } = useStudio();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(modules[0]?.id ?? null);
  const [showReset, setShowReset] = useState(false);
  const [newLessonsFor, setNewLessonsFor] = useState<string | null>(null);

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const trainedCount = modules.reduce(
    (acc, m) => acc + m.lessons.filter(l => trainingState[`${m.id}:${l.id}`]).length, 0
  );

  const handleTrain = async (moduleId: string, lessonId: string) => {
    const key = `${moduleId}:${lessonId}`;
    setBusyKey(key);
    try {
      await trainLesson(moduleId, lessonId);
      // Check if module is now complete
      const mod = modules.find(m => m.id === moduleId);
      if (mod) {
        const newState = { ...trainingState, [key]: true };
        const allDone = mod.lessons.every(l => newState[`${moduleId}:${l.id}`]);
        if (allDone) setNewLessonsFor(moduleId);
      }
    } finally {
      setBusyKey(null);
    }
  };

  const handleTrainAll = async (moduleId: string) => {
    setBusyKey(`mod:${moduleId}`);
    try {
      await trainAll(moduleId);
      setNewLessonsFor(moduleId);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Agent Training</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Train your AI to build better apps for free — knowledge is permanent
            </p>
          </div>
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setShowReset(true)}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
        </div>

        {/* Overall progress */}
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{trainedCount} of {totalLessons} lessons trained</span>
            <span className="font-medium text-foreground">{trainingPercent}% complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${trainingPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Each trained lesson makes the AI smarter at building that type of app
          </p>
        </div>
      </div>

      {showReset && (
        <div className="mx-5 mt-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5 flex items-center justify-between">
          <p className="text-sm text-destructive">Reset all training progress?</p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => { resetTraining(); setShowReset(false); }}>Reset</Button>
            <Button size="sm" variant="outline" onClick={() => setShowReset(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {modules.map(mod => {
          const modTrained = mod.lessons.filter(l => trainingState[`${mod.id}:${l.id}`]).length;
          const modTotal = mod.lessons.length;
          const modPct = modTotal > 0 ? Math.round((modTrained / modTotal) * 100) : 0;
          const allDone = modTrained === modTotal;
          const isExpanded = expanded === mod.id;
          const busyMod = busyKey === `mod:${mod.id}`;

          return (
            <div key={mod.id} className={cn(
              "rounded-xl border bg-card overflow-hidden transition-all",
              allDone && "border-emerald-500/30"
            )}>
              {/* Module header */}
              <button
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : mod.id)}
              >
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: `${mod.color}20` }}>
                  <GraduationCap className="w-4 h-4" style={{ color: mod.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{mod.title}</p>
                    {allDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {newLessonsFor === mod.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> New lessons added
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
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>

              {/* Lessons */}
              {isExpanded && (
                <div className="border-t border-border">
                  <div className="p-3 space-y-1">
                    {mod.lessons.map(lesson => {
                      const lKey = `${mod.id}:${lesson.id}`;
                      const isTrained = !!trainingState[lKey];
                      const isBusy = busyKey === lKey;

                      return (
                        <div
                          key={lesson.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-all",
                            isTrained ? "bg-emerald-500/5" : "hover:bg-muted/50"
                          )}
                        >
                          <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                            {isBusy ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> :
                             isTrained ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                             <Circle className="w-4 h-4 text-muted-foreground/40" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm", isTrained ? "text-muted-foreground line-through" : "text-foreground")}>{lesson.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{lesson.description}</p>
                          </div>
                          {!isTrained && (
                            <button
                              onClick={() => handleTrain(mod.id, lesson.id)}
                              disabled={!!busyKey}
                              className="text-xs px-3 py-1 rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
                              data-testid={`train-${lesson.id}`}
                            >
                              Train
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!allDone && (
                    <div className="px-3 pb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => handleTrainAll(mod.id)}
                        disabled={!!busyKey}
                        data-testid={`train-all-${mod.id}`}
                      >
                        {busyMod ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <GraduationCap className="w-3 h-3 mr-1" />}
                        Train All Lessons
                      </Button>
                    </div>
                  )}
                  {allDone && (
                    <div className="px-4 pb-3 text-xs text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Module complete — AI has been trained. New advanced lessons may have been added above.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
