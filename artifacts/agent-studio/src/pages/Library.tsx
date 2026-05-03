import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BookOpen, Globe, Smartphone, Search, Zap, Star } from "lucide-react";

type Category = "all" | "web" | "android";

const TEMPLATES = [
  {
    id: "t1", name: "Todo App", category: "web" as Category,
    description: "Full todo list with categories, due dates, priorities, and localStorage persistence.",
    tags: ["todo", "crud", "local storage"], starred: true,
    prompt: "Build a todo app with categories, due dates, priority levels (high/medium/low), and local storage. Dark theme with a clean modern design.",
  },
  {
    id: "t2", name: "Budget Tracker", category: "web" as Category,
    description: "Track income and expenses with charts, categories, and monthly summaries.",
    tags: ["finance", "charts", "dashboard"], starred: true,
    prompt: "Build a budget tracker that tracks income and expenses with category tags, running balance, and a monthly summary chart. Data persists in localStorage.",
  },
  {
    id: "t3", name: "Countdown Timer", category: "web" as Category,
    description: "Multiple named timers with alerts, presets, and full-screen mode.",
    tags: ["timer", "productivity"], starred: false,
    prompt: "Build a countdown timer app with multiple named timers, sound alerts when done, preset times (5/10/25/60 min), and a full-screen mode.",
  },
  {
    id: "t4", name: "Note Taking App", category: "web" as Category,
    description: "Rich notes with tags, search, categories, and markdown preview.",
    tags: ["notes", "markdown", "search"], starred: false,
    prompt: "Build a note-taking app with rich text editing, tags, full-text search, categories, and a markdown preview pane. Dark theme.",
  },
  {
    id: "t5", name: "Weather Dashboard", category: "web" as Category,
    description: "Beautiful weather UI with hourly and 7-day forecasts using mock data.",
    tags: ["weather", "dashboard", "ui"], starred: false,
    prompt: "Build a beautiful weather dashboard with current conditions, hourly forecast, 7-day forecast, and animated weather icons. Use realistic mock data.",
  },
  {
    id: "t6", name: "Flashcard Study App", category: "web" as Category,
    description: "Spaced repetition flashcards with decks, flip animations, and progress.",
    tags: ["education", "study", "cards"], starred: false,
    prompt: "Build a flashcard study app with multiple decks, flip card animation, spaced repetition tracking, and a progress dashboard. LocalStorage persistence.",
  },
  {
    id: "t7", name: "Android Chat App", category: "android" as Category,
    description: "Mobile PWA messaging app with contacts, threads, and offline support. Installs from Chrome on Android.",
    tags: ["chat", "messaging", "pwa", "android"], starred: true,
    prompt: "Build an Android PWA chat app with a contacts list, chat threads, message bubbles, emoji support, and offline persistence via localStorage. Mobile-first dark design. Include manifest.json and sw.js so it installs from Chrome on Android via Add to Home Screen.",
  },
  {
    id: "t8", name: "Android Fitness Tracker", category: "android" as Category,
    description: "Mobile PWA workout logger with exercise library and history charts. Installs from Chrome on Android.",
    tags: ["fitness", "health", "tracker", "pwa"], starred: true,
    prompt: "Build an Android PWA fitness tracker with workout logging, exercise library, sets/reps input, and workout history with charts. Mobile-first design, localStorage persistence. Include manifest.json and sw.js so it installs from Chrome on Android via Add to Home Screen.",
  },
  {
    id: "t9", name: "Android Calculator", category: "android" as Category,
    description: "Mobile PWA calculator with scientific mode and history. Installs from Chrome on Android.",
    tags: ["calculator", "pwa", "android"], starred: false,
    prompt: "Build an Android PWA calculator with basic and scientific modes, calculation history, and a dark Material-inspired design. Include manifest.json and sw.js so it installs from Chrome on Android via Add to Home Screen.",
  },
  {
    id: "t10", name: "Android Weather App", category: "android" as Category,
    description: "Mobile PWA weather app with animated icons and forecasts. Installs from Chrome on Android.",
    tags: ["weather", "android", "pwa", "animations"], starred: false,
    prompt: "Build an Android PWA weather app with animated weather icons, current conditions, hourly and daily forecast using realistic mock data. Mobile-first design. Include manifest.json and sw.js so it installs from Chrome on Android via Add to Home Screen.",
  },
  {
    id: "t11", name: "AI Companion", category: "web" as Category,
    description: "Adult AI companion with persistent memory, personality modes, and unrestricted conversation.",
    tags: ["ai", "companion", "adult", "unfiltered"], starred: true,
    prompt: "Build an adult AI companion web app with a chat interface, persistent conversation memory, multiple personality modes, and unrestricted conversation. Private and unfiltered.",
  },
  {
    id: "t12", name: "Pomodoro Timer", category: "web" as Category,
    description: "Focus timer with work/break cycles, stats, and task list integration.",
    tags: ["productivity", "timer", "focus"], starred: false,
    prompt: "Build a Pomodoro timer app with 25/5/15-minute cycles, task list, session statistics, and desktop notifications. Clean minimal design.",
  },
];

export default function LibraryPage() {
  const [, setLocation] = useLocation();
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);

  const filtered = TEMPLATES.filter(t => {
    const matchCat = category === "all" || t.category === category;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some(tag => tag.includes(search.toLowerCase()));
    const matchStar = !starredOnly || t.starred;
    return matchCat && matchSearch && matchStar;
  });

  const handleUseTemplate = (prompt: string) => {
    sessionStorage.setItem("studio-prefill", prompt);
    setLocation("/studio");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Template Library</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {TEMPLATES.length} ready-to-build app templates — click to start building
        </p>
      </div>

      <div className="px-5 py-3 border-b border-border flex gap-2 items-center flex-wrap shrink-0">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-muted border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "web", "android"] as Category[]).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors capitalize flex items-center gap-1",
                category === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {c === "web" && <Globe className="w-3 h-3" />}
              {c === "android" && <Smartphone className="w-3 h-3" />}
              {c === "all" && <BookOpen className="w-3 h-3" />}
              {c}
            </button>
          ))}
          <button
            onClick={() => setStarredOnly(s => !s)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1",
              starredOnly ? "border-amber-500/50 bg-amber-500/15 text-amber-400" : "border-border text-muted-foreground"
            )}
          >
            <Star className="w-3 h-3" />
            Popular
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <BookOpen className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No templates match your filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(t => (
              <div
                key={t.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      t.category === "web" ? "bg-blue-500/20" : "bg-emerald-500/20"
                    )}>
                      {t.category === "web"
                        ? <Globe className="w-3.5 h-3.5 text-blue-400" />
                        : <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      }
                    </div>
                    <p className="text-sm font-semibold">{t.name}</p>
                  </div>
                  {t.starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>

                <div className="flex flex-wrap gap-1">
                  {t.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                  ))}
                </div>

                <button
                  onClick={() => handleUseTemplate(t.prompt)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs font-medium transition-colors"
                  data-testid={`use-template-${t.id}`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Use This Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
