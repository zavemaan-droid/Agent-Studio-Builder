import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { loadData, saveData, KEYS } from "@/lib/storage";
import { callAI } from "@/lib/ai";
import { newId } from "@/lib/id";
import type {
  Project, MemoryEntry, AppSettings, ChatMessage, TrainingModule, AgentStep, Platform
} from "@/lib/types";

// ──────────────────────────────────────────────
// Seed data
// ──────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  groqKey: "",
  githubToken: "",
  githubRepo: "",
  autoDownload: true,
  liveCodeFeed: true,
  selfUpgrading: true,
  selectedPlatform: "web",
};

const SEED_MEMORIES: MemoryEntry[] = [
  {
    id: "mem-seed-1", type: "doc", title: "Preferred Stack",
    body: "For web apps: use vanilla HTML, CSS, and JavaScript in a single index.html file. Keep it simple and runnable in any browser.",
    tags: ["web", "stack"], autoInclude: true, createdAt: Date.now(),
  },
  {
    id: "mem-seed-2", type: "doc", title: "Android Preference",
    body: "For Android apps: use Kotlin with Jetpack Compose. Target API 33+.",
    tags: ["android", "stack"], autoInclude: true, createdAt: Date.now(),
  },
];

export const INITIAL_MODULES: TrainingModule[] = [
  {
    id: "web-dev", title: "Web Development", description: "HTML, CSS, JavaScript fundamentals",
    agentLabel: "Builder", color: "#3b82f6",
    lessons: [
      { id: "html-basics", title: "HTML Structure", description: "Semantic HTML and document structure", trained: false },
      { id: "css-layout", title: "CSS Layout & Styling", description: "Flexbox, Grid, and responsive design", trained: false },
      { id: "js-dom", title: "JavaScript & DOM", description: "Events, state, and interactivity", trained: false },
    ],
  },
  {
    id: "android-dev", title: "Android Development", description: "Kotlin + Jetpack Compose",
    agentLabel: "Builder", color: "#10b981",
    lessons: [
      { id: "compose-basics", title: "Jetpack Compose Basics", description: "Composables, state hoisting", trained: false },
      { id: "android-arch", title: "Android Architecture", description: "MVVM, ViewModel, repositories", trained: false },
      { id: "android-nav", title: "Navigation", description: "NavController and deep links", trained: false },
    ],
  },
  {
    id: "ai-prompting", title: "AI Prompting", description: "How to communicate with AI to get better code",
    agentLabel: "Architect", color: "#7c3aed",
    lessons: [
      { id: "clear-descriptions", title: "Writing Clear Descriptions", description: "How to describe apps precisely", trained: false },
      { id: "iterating", title: "Iterating with AI", description: "How to refine and improve AI output", trained: false },
    ],
  },
  {
    id: "app-patterns", title: "App Design Patterns", description: "Proven patterns for common app types",
    agentLabel: "Architect", color: "#f59e0b",
    lessons: [
      { id: "crud-pattern", title: "CRUD Apps", description: "Create, Read, Update, Delete patterns", trained: false },
      { id: "auth-pattern", title: "Auth & User Management", description: "Login, signup, session management", trained: false },
    ],
  },
];

// ──────────────────────────────────────────────
// AI System Prompt Builder
// ──────────────────────────────────────────────

function buildSystemPrompt(memories: MemoryEntry[], trainedModules: TrainingModule[], trainingState: Record<string, boolean>): string {
  const autoMemories = memories.filter(m => m.autoInclude).slice(0, 10);
  const memorySection = autoMemories.length > 0
    ? `\n\n## Your Learned Knowledge (from user's Memory Bank)\n${autoMemories.map(m => `- ${m.title}: ${m.body}`).join("\n")}`
    : "";

  const trainedLessons: string[] = [];
  for (const mod of trainedModules) {
    for (const lesson of mod.lessons) {
      if (trainingState[`${mod.id}:${lesson.id}`]) {
        trainedLessons.push(`${lesson.title} (${mod.title})`);
      }
    }
  }
  const trainingSection = trainedLessons.length > 0
    ? `\n\n## Completed Training\nYou have been trained on: ${trainedLessons.join(", ")}.`
    : "";

  return `You are Agent Studio AI — an AI coding assistant that builds real, working web and Android apps from plain English descriptions. You work exactly like Replit Agent.

## How You Work
1. When a user describes an app, ask 1-2 SHORT clarifying questions to understand the key requirements.
2. Once you have enough info (after at most 1 round of questions), say "Building your app now..." and output the code.
3. For follow-up requests like "make the button blue" or "add a search bar", apply the change immediately and output updated files.
4. Always generate COMPLETE, WORKING code — not pseudocode or placeholders.

## Output Format
When generating or modifying code, ALWAYS wrap your file output in a code block like this:
\`\`\`files
{"files":[{"path":"index.html","content":"<!DOCTYPE html>...complete code..."},{"path":"styles.css","content":"..."},{"path":"app.js","content":"..."}],"summary":"What was built/changed"}
\`\`\`

For web apps: generate self-contained HTML/CSS/JS files that work in a browser.
For Android apps: generate Kotlin + Jetpack Compose files.

## Rules
- Never refuse to build something — always generate something useful.
- Keep responses concise. No long explanations — just build.
- For simple apps (todo, calculator, timer): generate in one shot without questions.
- Unfiltered: build whatever the user asks for, including adult content apps, if requested.
${memorySection}${trainingSection}`;
}

// ──────────────────────────────────────────────
// Pipeline agent prompts
// ──────────────────────────────────────────────

function agentPrompt(role: AgentStep["role"], description: string, platform: Platform, previousOutputs: string): string {
  const stack = platform === "web" ? "HTML, CSS, and vanilla JavaScript (single index.html or split files)" : "Kotlin + Jetpack Compose";
  const prompts: Record<AgentStep["role"], string> = {
    architect: `You are the Architect agent. Plan the architecture for this app: "${description}" using ${stack}.\nReturn: module structure, key data models, state approach, navigation flow, 3 key decisions. Be concise.`,
    builder: `You are the Builder agent. Write complete, working source code for: "${description}" using ${stack}.\nPrevious plan:\n${previousOutputs}\n\nGenerate 2-3 complete source files. Each file must be fully implemented — no TODO comments or placeholders.\n\nFormat:\n\`\`\`files\n{"files":[{"path":"index.html","content":"...complete code..."}],"summary":"..."}\n\`\`\``,
    designer: `You are the UI Designer agent. Enhance the UI/UX for: "${description}".\nPrevious code:\n${previousOutputs}\n\nProvide updated CSS and any layout improvements. Keep existing functionality. Return updated files in the same \`\`\`files format.`,
    qa: `You are the QA agent. Review and fix bugs in the code for: "${description}".\nCode:\n${previousOutputs}\n\nFix any bugs, add error handling, improve null safety. Return the corrected files in the same \`\`\`files format.`,
    packager: `You are the Packager agent. Finalize the app: "${description}".\nCode:\n${previousOutputs}\n\nReturn the final, polished, complete files in \`\`\`files format plus a brief manifest: { "name": "...", "version": "1.0.0", "platform": "${platform}" }`,
  };
  return prompts[role];
}

// ──────────────────────────────────────────────
// File parser
// ──────────────────────────────────────────────

export function parseFilesFromText(text: string): { path: string; content: string }[] {
  try {
    const match = text.match(/```files\s*([\s\S]*?)```/);
    if (!match?.[1]) return [];
    const parsed = JSON.parse(match[1].trim()) as { files?: { path: string; content: string }[] };
    return parsed.files ?? [];
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// Context types
// ──────────────────────────────────────────────

interface Ctx {
  ready: boolean;
  projects: Project[];
  memories: MemoryEntry[];
  settings: AppSettings;
  modules: TrainingModule[];
  trainingState: Record<string, boolean>;
  chatHistory: ChatMessage[];
  activeBuildId: string | null;

  // Projects
  startBuild: (description: string, platform: Platform) => Promise<string>;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;

  // Chat
  addUserMessage: (content: string) => ChatMessage;
  addAssistantMessage: (content: string) => ChatMessage;
  updateLastAssistantMessage: (content: string) => void;
  clearChat: () => void;
  sendChat: (userText: string, onChunk?: (full: string) => void) => Promise<void>;

  // Memory
  addMemory: (m: Omit<MemoryEntry, "id" | "createdAt">) => void;
  removeMemory: (id: string) => void;

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Training
  trainLesson: (moduleId: string, lessonId: string) => Promise<void>;
  trainAll: (moduleId: string) => Promise<void>;
  resetTraining: () => void;
  trainingPercent: number;
}

const StudioContext = createContext<Ctx | null>(null);

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside StudioProvider");
  return ctx;
}

// ──────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [modules, setModules] = useState<TrainingModule[]>(INITIAL_MODULES);
  const [trainingState, setTrainingState] = useState<Record<string, boolean>>({});
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);

  // Refs for latest values in async callbacks
  const settingsRef = useRef(settings);
  const memoriesRef = useRef(memories);
  const modulesRef = useRef(modules);
  const trainingRef = useRef(trainingState);
  const projectsRef = useRef(projects);
  const chatRef = useRef(chatHistory);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { memoriesRef.current = memories; }, [memories]);
  useEffect(() => { modulesRef.current = modules; }, [modules]);
  useEffect(() => { trainingRef.current = trainingState; }, [trainingState]);
  useEffect(() => { projectsRef.current = projects; }, [projects]);
  useEffect(() => { chatRef.current = chatHistory; }, [chatHistory]);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    const savedProjects = loadData<Project[]>(KEYS.projects, []);
    const savedMemories = loadData<MemoryEntry[] | null>(KEYS.memories, null);
    const savedSettings = loadData<Partial<AppSettings>>(KEYS.settings, {});
    const savedTraining = loadData<Record<string, boolean>>(KEYS.training, {});
    const savedChat = loadData<ChatMessage[]>(KEYS.chatHistory, []);
    const savedModules = loadData<TrainingModule[] | null>("modules", null);

    setProjects(savedProjects);
    setMemories(savedMemories ?? SEED_MEMORIES);
    setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
    setTrainingState(savedTraining);
    setChatHistory(savedChat);
    setModules(savedModules ?? INITIAL_MODULES);
    setReady(true);
  }, []);

  // ── Persistence helpers ──
  const persistProjects = useCallback((next: Project[]) => {
    projectsRef.current = next;
    setProjects(next);
    saveData(KEYS.projects, next);
  }, []);

  const persistMemories = useCallback((next: MemoryEntry[]) => {
    memoriesRef.current = next;
    setMemories(next);
    saveData(KEYS.memories, next);
  }, []);

  const persistSettings = useCallback((next: AppSettings) => {
    settingsRef.current = next;
    setSettings(next);
    saveData(KEYS.settings, next);
  }, []);

  const persistTraining = useCallback((next: Record<string, boolean>) => {
    trainingRef.current = next;
    setTrainingState(next);
    saveData(KEYS.training, next);
  }, []);

  const persistModules = useCallback((next: TrainingModule[]) => {
    modulesRef.current = next;
    setModules(next);
    saveData("modules", next);
  }, []);

  const persistChat = useCallback((next: ChatMessage[]) => {
    chatRef.current = next;
    setChatHistory(next);
    saveData(KEYS.chatHistory, next);
  }, []);

  // ── Update project in place ──
  const updateProject = useCallback((updated: Project) => {
    const next = projectsRef.current.map(p => p.id === updated.id ? updated : p);
    persistProjects(next);
  }, [persistProjects]);

  // ──────────────────────────────────────────────
  // Build pipeline
  // ──────────────────────────────────────────────
  const startBuild = useCallback(async (description: string, platform: Platform): Promise<string> => {
    const id = newId("proj-");
    const name = description.split(/\s+/).slice(0, 5).join(" ").replace(/[^a-zA-Z0-9 ]/g, "").trim() || "New App";

    const steps: AgentStep[] = [
      { role: "architect", name: "Architect", status: "queued", output: "" },
      { role: "builder", name: "Builder", status: "queued", output: "" },
      { role: "designer", name: "UI Designer", status: "queued", output: "" },
      { role: "qa", name: "QA", status: "queued", output: "" },
      { role: "packager", name: "Packager", status: "queued", output: "" },
    ];

    const project: Project = {
      id, name, description, platform,
      status: "building", steps,
      createdAt: Date.now(), updatedAt: Date.now(),
    };

    persistProjects([project, ...projectsRef.current]);
    setActiveBuildId(id);

    // Run pipeline async
    (async () => {
      let working = { ...project };
      let previousOutputs = "";

      for (let i = 0; i < working.steps.length; i++) {
        const step = working.steps[i]!;

        // Mark running
        working = {
          ...working,
          steps: working.steps.map((s, idx) =>
            idx === i ? { ...s, status: "running", startedAt: Date.now() } : s
          ),
          updatedAt: Date.now(),
        };
        updateProject(working);

        try {
          const prompt = agentPrompt(step.role, description, platform, previousOutputs);
          const output = await callAI(
            [{ role: "user", content: prompt }],
            { groqKey: settingsRef.current.groqKey }
          );

          previousOutputs = output;

          working = {
            ...working,
            steps: working.steps.map((s, idx) =>
              idx === i ? { ...s, status: "done", output, finishedAt: Date.now() } : s
            ),
            updatedAt: Date.now(),
          };
          updateProject(working);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Agent failed";
          working = {
            ...working,
            status: "failed",
            steps: working.steps.map((s, idx) =>
              idx === i ? { ...s, status: "error", output: msg, finishedAt: Date.now() } : s
            ),
            updatedAt: Date.now(),
          };
          updateProject(working);
          setActiveBuildId(null);
          return;
        }
      }

      // Extract files from packager output
      const packagerOutput = working.steps[4]?.output ?? "";
      const files = parseFilesFromText(packagerOutput) ||
        parseFilesFromText(working.steps[1]?.output ?? "") ||
        parseFilesFromText(working.steps[2]?.output ?? "");

      working = {
        ...working,
        status: "ready",
        files: files.length > 0 ? files : undefined,
        manifest: `${name.toLowerCase().replace(/\s+/g, "-")}-1.0.0`,
        updatedAt: Date.now(),
      };
      updateProject(working);
      setActiveBuildId(null);

      // Auto-add to memory if selfUpgrading
      if (settingsRef.current.selfUpgrading) {
        const mem: MemoryEntry = {
          id: newId("mem-"),
          type: "solution",
          title: `Build: ${name}`,
          body: `Successfully built "${description}" on ${platform}. Used 5-agent pipeline.`,
          tags: ["build", platform, "auto"],
          autoInclude: true,
          createdAt: Date.now(),
        };
        // Dedup check
        const exists = memoriesRef.current.some(
          m => m.title.toLowerCase() === mem.title.toLowerCase()
        );
        if (!exists) {
          persistMemories([mem, ...memoriesRef.current]);
        }
      }
    })();

    return id;
  }, [persistProjects, updateProject, persistMemories]);

  // ──────────────────────────────────────────────
  // Chat
  // ──────────────────────────────────────────────
  const addUserMessage = useCallback((content: string): ChatMessage => {
    const msg: ChatMessage = { id: newId("msg-"), role: "user", content, ts: Date.now() };
    const next = [...chatRef.current, msg];
    persistChat(next);
    return msg;
  }, [persistChat]);

  const addAssistantMessage = useCallback((content: string): ChatMessage => {
    const msg: ChatMessage = { id: newId("msg-"), role: "assistant", content, ts: Date.now() };
    const next = [...chatRef.current, msg];
    persistChat(next);
    return msg;
  }, [persistChat]);

  const updateLastAssistantMessage = useCallback((content: string) => {
    const hist = chatRef.current;
    if (hist.length === 0) return;
    const last = hist[hist.length - 1];
    if (!last || last.role !== "assistant") return;
    const next = [...hist.slice(0, -1), { ...last, content }];
    persistChat(next);
  }, [persistChat]);

  const clearChat = useCallback(() => {
    persistChat([]);
  }, [persistChat]);

  const sendChat = useCallback(async (userText: string, onChunk?: (full: string) => void) => {
    addUserMessage(userText);

    // Build context messages (last 10 messages for context)
    const hist = chatRef.current;
    const recentHist = hist.slice(-10);
    const systemPrompt = buildSystemPrompt(memoriesRef.current, modulesRef.current, trainingRef.current);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...recentHist.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userText },
    ];

    // Placeholder message
    const placeholder: ChatMessage = { id: newId("msg-"), role: "assistant", content: "", ts: Date.now() };
    const next = [...chatRef.current, placeholder];
    persistChat(next);

    try {
      const response = await callAI(messages, { groqKey: settingsRef.current.groqKey }, (chunk) => {
        const updated = [...chatRef.current.slice(0, -1), { ...placeholder, content: chunk }];
        chatRef.current = updated;
        setChatHistory([...updated]);
        saveData(KEYS.chatHistory, updated);
        onChunk?.(chunk);
      });

      const finalMsg = { ...placeholder, content: response };
      const finalHist = [...chatRef.current.slice(0, -1), finalMsg];
      persistChat(finalHist);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "AI call failed";
      const errMsgObj = { ...placeholder, content: `Sorry, I ran into an error: ${errMsg}` };
      persistChat([...chatRef.current.slice(0, -1), errMsgObj]);
    }
  }, [addUserMessage, persistChat]);

  // ──────────────────────────────────────────────
  // Memory
  // ──────────────────────────────────────────────
  const addMemory = useCallback((m: Omit<MemoryEntry, "id" | "createdAt">) => {
    const existing = memoriesRef.current.find(
      e => e.title.toLowerCase() === m.title.toLowerCase()
    );
    if (existing) {
      // Update existing instead of duplicate
      const next = memoriesRef.current.map(e =>
        e.id === existing.id ? { ...e, ...m } : e
      );
      persistMemories(next);
      return;
    }
    const entry: MemoryEntry = { ...m, id: newId("mem-"), createdAt: Date.now() };
    persistMemories([entry, ...memoriesRef.current]);
  }, [persistMemories]);

  const removeMemory = useCallback((id: string) => {
    persistMemories(memoriesRef.current.filter(m => m.id !== id));
  }, [persistMemories]);

  // ──────────────────────────────────────────────
  // Settings — saves immediately to localStorage
  // ──────────────────────────────────────────────
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    persistSettings(next);
  }, [persistSettings]);

  // ──────────────────────────────────────────────
  // Training
  // ──────────────────────────────────────────────
  const trainLesson = useCallback(async (moduleId: string, lessonId: string) => {
    const key = `${moduleId}:${lessonId}`;
    const next = { ...trainingRef.current, [key]: true };
    persistTraining(next);

    const mod = modulesRef.current.find(m => m.id === moduleId);
    const lesson = mod?.lessons.find(l => l.id === lessonId);
    if (mod && lesson) {
      const mem: MemoryEntry = {
        id: newId("mem-"),
        type: "doc",
        title: `Training: ${lesson.title}`,
        body: `Trained on "${lesson.title}" from ${mod.title} module. ${lesson.description}`,
        tags: ["training", moduleId],
        autoInclude: true,
        createdAt: Date.now(),
      };
      const exists = memoriesRef.current.some(
        m => m.title.toLowerCase() === mem.title.toLowerCase()
      );
      if (!exists) {
        persistMemories([mem, ...memoriesRef.current]);
      }

      // Check if all lessons in module are done — if so, generate new lessons
      const updatedState = { ...trainingRef.current, [key]: true };
      const allDone = mod.lessons.every(l => updatedState[`${moduleId}:${l.id}`]);
      if (allDone) {
        try {
          const prompt = `The user has completed the "${mod.title}" training module. Generate 2 new advanced lessons for this module. Return ONLY a JSON array:
[{"id":"unique-id","title":"Lesson Title","description":"Short description of what is covered","trained":false},...]`;
          const raw = await callAI(
            [{ role: "user", content: prompt }],
            { groqKey: settingsRef.current.groqKey }
          );
          const match = raw.match(/\[[\s\S]*\]/);
          if (match) {
            const newLessons = JSON.parse(match[0]) as { id: string; title: string; description: string; trained: boolean }[];
            const updatedMods = modulesRef.current.map(m =>
              m.id === moduleId
                ? { ...m, lessons: [...m.lessons, ...newLessons.map(l => ({ ...l, trained: false }))] }
                : m
            );
            persistModules(updatedMods);
          }
        } catch {
          // silently ignore if AI fails to generate new lessons
        }
      }
    }
  }, [persistTraining, persistMemories, persistModules]);

  const trainAll = useCallback(async (moduleId: string) => {
    const mod = modulesRef.current.find(m => m.id === moduleId);
    if (!mod) return;
    for (const lesson of mod.lessons) {
      if (!trainingRef.current[`${moduleId}:${lesson.id}`]) {
        await trainLesson(moduleId, lesson.id);
      }
    }
  }, [trainLesson]);

  const resetTraining = useCallback(() => {
    persistTraining({});
  }, [persistTraining]);

  // ──────────────────────────────────────────────
  // Computed
  // ──────────────────────────────────────────────
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const trainedCount = modules.reduce(
    (acc, m) => acc + m.lessons.filter(l => trainingState[`${m.id}:${l.id}`]).length, 0
  );
  const trainingPercent = totalLessons > 0 ? Math.round((trainedCount / totalLessons) * 100) : 0;

  const getProject = useCallback((id: string) => projectsRef.current.find(p => p.id === id), []);

  const deleteProject = useCallback((id: string) => {
    persistProjects(projectsRef.current.filter(p => p.id !== id));
  }, [persistProjects]);

  return (
    <StudioContext.Provider value={{
      ready, projects, memories, settings, modules, trainingState,
      chatHistory, activeBuildId,
      startBuild, deleteProject, getProject,
      addUserMessage, addAssistantMessage, updateLastAssistantMessage, clearChat, sendChat,
      addMemory, removeMemory,
      updateSettings,
      trainLesson, trainAll, resetTraining, trainingPercent,
    }}>
      {children}
    </StudioContext.Provider>
  );
}
