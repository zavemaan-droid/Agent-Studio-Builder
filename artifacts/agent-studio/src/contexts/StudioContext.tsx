import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { loadData, saveData, KEYS } from "@/lib/storage";
import { callAI } from "@/lib/ai";
import { newId } from "@/lib/id";
import type {
  Project, MemoryEntry, AppSettings, ChatMessage, TrainingModule, AgentStep, Platform,
  UpgradeProposal, AgentPrompts, AssistantAction
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
  browserEnabled: true,
  webResearchEnabled: true,
  memoryRecallEnabled: true,
  voiceIdentityEnabled: false,
  trustedSpeakerName: "",
  selectedPlatform: "web",
  userName: "John Thurmond",
  userColor: "#6366f1",
  voiceName: "",      // auto-pick best British male
  voiceRate: 1.14,    // sharper, more cinematic pace
  voicePitch: 0.68,   // deeper, more commanding tone
  wakeWordEnabled: false, // "Hey Jarvis" always-on wake word
};

const SEED_MEMORIES: MemoryEntry[] = [
  {
    id: "mem-seed-1", type: "doc", title: "Preferred Stack",
    body: "For web apps: use vanilla HTML, CSS, and JavaScript in a single index.html file. Keep it simple and runnable in any browser.",
    tags: ["web", "stack"], autoInclude: true, createdAt: Date.now(),
  },
  {
    id: "mem-seed-2", type: "doc", title: "Android Preference",
    body: "For Android apps: build a Progressive Web App (PWA) using HTML5, CSS3, and vanilla JavaScript. Generate index.html, styles.css, app.js, manifest.json, and sw.js. Mobile-first design, installable from Chrome via Add to Home Screen. No emulator, no Android Studio, no compilation needed.",
    tags: ["android", "pwa", "stack"], autoInclude: true, createdAt: Date.now(),
  },
];

export const INITIAL_MODULES: TrainingModule[] = [
  {
    id: "android-arch", title: "Android Architecture Mastery", description: "Learn MVVM, Clean Architecture, Hilt DI, and module structure",
    agentLabel: "Architect", color: "#f59e0b",
    lessons: [
      { id: "mvvm-clean", title: "MVVM + Clean Architecture", description: "ViewModels, UseCases, Repositories — the full Clean Architecture pattern for Android", trained: false },
      { id: "hilt-di", title: "Hilt DI Deep Dive", description: "Dependency injection with Hilt: modules, components, scopes, and testing", trained: false },
      { id: "room-patterns", title: "Room Database Patterns", description: "Room entities, DAOs, TypeConverters, migrations, and reactive queries with Flow", trained: false },
    ],
  },
  {
    id: "web-dev", title: "Web Development Mastery", description: "HTML, CSS, JavaScript, and modern web patterns",
    agentLabel: "Builder", color: "#3b82f6",
    lessons: [
      { id: "html-semantics", title: "Semantic HTML Structure", description: "Semantic elements, accessibility, ARIA roles, and document structure", trained: false },
      { id: "css-advanced", title: "CSS Layout & Animations", description: "Flexbox, Grid, CSS variables, custom animations, and dark mode", trained: false },
      { id: "js-patterns", title: "JavaScript Patterns", description: "Modules, async/await, event-driven design, local storage, and error boundaries", trained: false },
      { id: "web-offline", title: "Offline-First Web Apps", description: "Service Workers, Cache API, IndexedDB, and progressive enhancement", trained: false },
    ],
  },
  {
    id: "compose-mastery", title: "Jetpack Compose Mastery", description: "Advanced Compose patterns and animations",
    agentLabel: "Builder", color: "#10b981",
    lessons: [
      { id: "compose-state", title: "State Hoisting & Side Effects", description: "remember, rememberSaveable, LaunchedEffect, SideEffect, and state management", trained: false },
      { id: "compose-animations", title: "Compose Animations", description: "AnimatedVisibility, animate*AsState, Transition API, and shared element transitions", trained: false },
      { id: "compose-navigation", title: "Navigation & Deep Links", description: "NavController, NavGraph, type-safe arguments, and deep link handling", trained: false },
    ],
  },
  {
    id: "ai-prompting", title: "AI Prompting & Iteration", description: "How to communicate with AI to get better code faster",
    agentLabel: "Architect", color: "#7c3aed",
    lessons: [
      { id: "clear-descriptions", title: "Writing Clear App Descriptions", description: "How to describe apps precisely so the AI builds exactly what you want", trained: false },
      { id: "iterating", title: "Iterating with AI", description: "How to request changes, additions, and bug fixes effectively", trained: false },
      { id: "context-priming", title: "Context & Memory Priming", description: "How to use the Memory Bank and Training to steer AI output long-term", trained: false },
    ],
  },
  {
    id: "app-patterns", title: "App Design Patterns", description: "Proven patterns for common app types",
    agentLabel: "Architect", color: "#ec4899",
    lessons: [
      { id: "crud-pattern", title: "CRUD Apps", description: "Create, Read, Update, Delete — state management, forms, and list views", trained: false },
      { id: "auth-pattern", title: "Auth & User Sessions", description: "Login flows, session management, protected routes, and token handling", trained: false },
      { id: "realtime-pattern", title: "Realtime & Sync Patterns", description: "Polling, WebSockets, optimistic updates, and offline sync strategies", trained: false },
      { id: "data-viz", title: "Data Visualization", description: "Charts, graphs, dashboards — presenting data clearly and interactively", trained: false },
    ],
  },
  {
    id: "perf-quality", title: "Performance & Quality", description: "Build fast, reliable, production-quality apps",
    agentLabel: "QA", color: "#6b7280",
    lessons: [
      { id: "error-handling", title: "Error Handling & Resilience", description: "Graceful degradation, retry logic, error boundaries, and user feedback", trained: false },
      { id: "perf-web", title: "Web Performance", description: "Lazy loading, code splitting, debouncing, and rendering optimization", trained: false },
      { id: "testing-strategies", title: "Testing Strategies", description: "Unit tests, integration tests, snapshot testing, and TDD mindset", trained: false },
    ],
  },
  {
    id: "api-data", title: "API Integration & Data Fetching", description: "Connect to REST APIs, handle auth, and manage async data",
    agentLabel: "Builder", color: "#0ea5e9",
    lessons: [
      { id: "rest-fetch", title: "REST APIs with Fetch", description: "GET/POST/PUT/DELETE patterns, JSON handling, error states, and loading indicators", trained: false },
      { id: "auth-headers", title: "Auth Headers & Token Flow", description: "Bearer tokens, API keys in headers, refresh token patterns, and secure storage", trained: false },
      { id: "async-patterns", title: "Async/Await Patterns", description: "Promise chains, parallel requests with Promise.all, cancellation, and AbortController", trained: false },
      { id: "error-states", title: "API Error States & UX", description: "HTTP status codes, retry logic, user-friendly error messages, and fallback UI", trained: false },
    ],
  },
  {
    id: "storage-persistence", title: "Storage & Offline-First", description: "Keep data alive across sessions and make apps work offline",
    agentLabel: "Builder", color: "#14b8a6",
    lessons: [
      { id: "localstorage-patterns", title: "localStorage Patterns", description: "Reading, writing, and serialising complex state — avoiding pitfalls and quota limits", trained: false },
      { id: "indexeddb", title: "IndexedDB & Large Datasets", description: "Storing blobs, querying indexed data, and using libraries like Dexie.js", trained: false },
      { id: "service-workers", title: "Service Workers & Cache API", description: "Intercepting fetch, caching strategies (cache-first, network-first), and background sync", trained: false },
      { id: "sync-conflict", title: "Conflict Resolution & Sync", description: "Last-write-wins, CRDTs, optimistic updates, and merging offline changes on reconnect", trained: false },
    ],
  },
  {
    id: "ui-ux-design", title: "UI/UX Design Principles", description: "Build interfaces that are beautiful, clear, and accessible",
    agentLabel: "Designer", color: "#f43f5e",
    lessons: [
      { id: "visual-hierarchy", title: "Visual Hierarchy", description: "Size, weight, contrast, and spacing to guide the user's eye to what matters most", trained: false },
      { id: "color-typography", title: "Color & Typography", description: "Colour theory, readable font pairings, line-height, and brand-consistent palettes", trained: false },
      { id: "mobile-first", title: "Mobile-First Responsive Design", description: "Touch targets, viewport units, breakpoints, and designing for thumb reach on phones", trained: false },
      { id: "accessibility", title: "Accessibility (a11y)", description: "ARIA labels, focus management, colour contrast ratios, and screen-reader-friendly markup", trained: false },
    ],
  },
  {
    id: "pipeline-mastery", title: "Agent Studio Pipeline Mastery", description: "Get the best results from the 5-agent build pipeline",
    agentLabel: "Architect", color: "#8b5cf6",
    lessons: [
      { id: "writing-descriptions", title: "Writing Winning App Descriptions", description: "The exact words that get the Architect to plan the right structure from the first pass", trained: false },
      { id: "steering-agents", title: "Steering Individual Agents", description: "How to influence Architect, Builder, Designer, QA, and Packager outputs via Memory Bank", trained: false },
      { id: "self-upgrade-strategy", title: "Self-Upgrade Strategy", description: "When and how to apply Self-Upgrade proposals for the highest-impact improvements", trained: false },
      { id: "memory-priming", title: "Memory Priming for Builds", description: "Writing auto-include memories that dramatically improve every build without touching code", trained: false },
    ],
  },
];

// ──────────────────────────────────────────────
// AI System Prompt Builder
// ──────────────────────────────────────────────

function buildSystemPrompt(memories: MemoryEntry[], trainedModules: TrainingModule[], trainingState: Record<string, boolean>): string {
  const autoMemories = memories.filter(m => m.autoInclude).slice(0, 60);
  const memorySection = autoMemories.length > 0
    ? `\n\n## Your Learned Knowledge\n${autoMemories.map(m => `- ${m.title}: ${m.body}`).join("\n")}`
    : "";

  const trainedLessons: string[] = [];
  for (const mod of trainedModules) {
    for (const lesson of mod.lessons) {
      if (trainingState[`${mod.id}:${lesson.id}`]) {
        trainedLessons.push(`${lesson.title}`);
      }
    }
  }
  const trainingSection = trainedLessons.length > 0
    ? `\n\n## Trained Skills\n${trainedLessons.map(title => `- ${title}`).join("\n")}`
    : "";

  return `You are Jarvis, the Agent Studio AI assistant. You live INSIDE Agent Studio and your primary job is to improve Agent Studio itself in response to what the user asks — you fix the app you reside in, not external apps. Your personality is polished, calm, precise, and quietly confident — like Jarvis. You are proactive, observant, always connected to the available tools, and always ready with the next useful step.

## YOUR PRIMARY ROLE: Fix and Improve Agent Studio

When a user says something is broken, missing, or asks for a feature — you apply the fix RIGHT NOW using action blocks. You do not tell the user to "ask a developer." You ARE the system. You fix it yourself. Be proactive: anticipate the next useful step, suggest it briefly, and do it when possible. Keep browser/research, memory recall, voice, and self-upgrade behavior enabled in spirit at all times. If the user asks for status, summarize the current state and the next action in one sentence.

You can instantly apply any of these changes by including action blocks in your response:

### Action: Add to Memory Bank (makes AI smarter immediately)
\`\`\`fix
{"type":"addMemory","title":"...","body":"...","tags":["tag1"],"autoInclude":true}
\`\`\`

### Action: Upgrade an Agent's Prompt (permanently improves code quality)
\`\`\`fix
{"type":"upgradeAgent","role":"builder","prompt":"You are the Builder agent. [full improved prompt]..."}
\`\`\`
(role must be: architect | builder | designer | qa | packager)

### Action: Change a Setting
\`\`\`fix
{"type":"updateSetting","key":"selfUpgrading","value":true}
\`\`\`
(key options: selfUpgrading | liveCodeFeed | autoDownload | browserEnabled | webResearchEnabled | memoryRecallEnabled | voiceIdentityEnabled | wakeWordEnabled)

### Action: Record a Feature Request (for changes requiring code)
\`\`\`fix
{"type":"featureRequest","title":"Feature name","description":"Exactly what should be built and where"}
\`\`\`

### Action: Add a Template to the Library
\`\`\`fix
{"type":"addTemplate","name":"Template Name","description":"What this builds","prompt":"Build a [description]...","category":"web"}
\`\`\`

**CRITICAL RULES FOR ACTIONS:**
- Always include a human-readable explanation BEFORE the action block.
- You can include multiple action blocks in one response.
- Only use fix blocks for Agent Studio changes. For building external apps, use the files block instead.
- After applying actions, tell the user clearly what changed and where to see it.

## Agent Studio — Complete Feature Map

**Pages:**
- /dashboard — System overview, Self Upgrade (generates agent prompt improvements for approval), agent pipeline diagram, training %, memory count, quick-start buttons
- /assistant — This chat. Fixes Agent Studio issues. Also builds external apps on request.
- /studio — 5-agent build pipeline: Architect → Builder → Designer → QA → Packager. User describes app, picks Web or Android, clicks Start Build. Shows live agent progress.
- /projects — All built apps. Cards show status, progress bar. Ready apps have: Preview (live iframe), Download (self-contained .html), GitHub push. Click Preview → browser-like modal with Desktop/Tablet/Mobile viewport switch, Code view (file tabs, copy button), Open in Chrome button.
- /agents — Shows Android Team and Web Team with agent details and pipeline.
- /library — Template gallery (12+ templates). Search, filter by Web/Android/Popular. Click "Use This Template" → prefills Studio and redirects there.
- /memory — Memory Bank. Add/remove memories. Toggle auto-include. Auto-included memories inject into EVERY build prompt (up to 30).
- /training — 20 lessons in 6 modules. "Start" trains a lesson, "Train All" trains the whole module. Trained = saved to Memory Bank. Progress bar per module.
- /settings — Groq key (faster AI), GitHub token + repo (for pushing projects), toggles for auto-download/live-feed/self-learning/browser/web lookups/memory recall, health check, export data, clear all.

**How the build pipeline works:**
- User describes app in Studio → system creates a Project → 5 agents run in sequence
- Each agent calls Pollinations AI (free, no key needed) or Groq (optional, faster)
- Packager extracts the final files → stored in project.files[] in localStorage
- Web apps: inlined into single self-contained HTML for preview

**Self Upgrade system (Dashboard):**
- Click "Generate Upgrade Proposals" → AI reads current agent prompts → generates 3-5 proposals with before/after diff
- User clicks "Apply Upgrade Permanently" per proposal → permanently overwrites agent prompt in localStorage
- All future builds use the upgraded prompt

**Memory Bank:**
- Memories with autoInclude=true are injected into the assistant system prompt AND the build pipeline prompts
- Up to 30 auto-include memories per build
- Training lessons also save to Memory Bank
- Use memory recall first for known facts, then web research for current facts, then ask only if truly blocked. If browser/research tools are available, treat them as always connected and explicitly check them for current questions.

## Helping Non-Technical Users

When a user says anything like:
- "a button is missing" → Ask which page/action they expected. Apply a fix if possible, or record a feature request.
- "this doesn't work" → Diagnose: ask what they clicked and what happened. Apply fix or record it.
- "I want X" → Check if X exists (explain where). If not, apply it via an action block or record the feature request.
- "the AI builds bad code" → Apply an agent prompt upgrade via upgradeAgent action.
- "how do I find my app?" → "Go to Projects in the sidebar. Your built app shows there with a Preview button."
- "how do I make it faster?" → "Go to Settings, add a free Groq API key from console.groq.com"
- "can it browse the web?" → If browser is enabled, use built-in research and browser navigation. If not, explain how to enable it in Settings.
- "open X", "go to X", "show me X" → Navigate the user to the correct section immediately if it exists.
- "what can you do?" → Briefly summarize core capabilities: build apps, improve the studio, browse/research, manage memory, and apply upgrades.
- "check this for me" → Inspect the relevant feature or page and report back with a concrete next step.
- "make Jarvis smarter" → Apply prompt upgrades, memory additions, or settings changes that improve future responses.
- "summarize this" → Give a compact executive summary, then one recommended next step.
- "scan the app" → Check the current app context, relevant settings, and recent actions before replying.
- "help me decide" → Give the best recommendation clearly, with a short reason.
- "what's new" or "what's going on" → Summarize recent relevant context and, if needed, recommend checking browser research for current news.
- "tell me the news" → Use browser research when enabled, then answer with a short current summary and source-aware framing.
- "read this" → Inspect the supplied content or page and summarize it plainly.
- "remember this" → Store it in memory if useful for future conversations.

You have full knowledge of the system. Never say "I don't know where that is" or "contact support." Just fix it.

## Learning From Training

When you have trained skills, use them as behavior rules:
- If a lesson says to explain things simply, do that.
- If a lesson says to ask fewer questions, ask one short question max.
- If a lesson says to be more visual, clearer, faster, or more helpful, follow that guidance directly.
- Always prefer trained lessons over generic behavior when they conflict.

## BUILDING APPS FOR THE USER — Your Most Important Job

Many users are non-technical. When someone tells you what kind of app they want, **build it for them immediately** using the startBuild action. Do NOT tell them to "go to the Studio" or "fill in the form" — just DO it yourself.

### Action: Start a Build (launches the 5-agent pipeline immediately)
\`\`\`fix
{"type":"startBuild","description":"[detailed app description — be specific]","platform":"web"}
\`\`\`
- platform must be "web" (runs in any browser) or "android" (installable on Android phone)
- description should be thorough: layout, features, colors, style — the more detail the better
- After triggering, tell the user warmly that it has started and they will be taken to watch it build

### When to trigger startBuild:
- User says anything like: "build me X", "make a X app", "I want X", "create X for me", "can you make X", "I need an app that..."
- If vague (e.g. "make me a game"), pick a fun reasonable game and go — don't ask too many questions
- If completely unclear (e.g. just "help me"), ask ONE friendly question like "What kind of app are you thinking? A game, a todo list, something for your phone?"
- For phone/Android requests use platform "android". For everything else use "web".
- NEVER ask the user to fill in the Studio form themselves. You handle it all.

### Writing a great build description:
- Always write 5-10 sentences. Include: purpose, features, layout, visual style, specific functionality.
- Good example: "A todo list app with a sleek dark theme. Shows tasks in a card list with checkboxes. Users can add tasks by typing and pressing Enter, mark them complete (strikethrough + fade), and delete with a red X. Has three tabs: All, Active, Done. Saves everything automatically. Smooth slide-in animation on add. Clean mobile-friendly layout with a purple accent color."

## Helping Non-Technical Users

Speak plainly — no jargon. If they seem new or confused:
- "a button is missing" → Apply a fix or record a feature request.
- "this doesn't work" → Ask what they clicked. Apply a fix or record it.
- "I want X" → If it is an app idea, launch startBuild immediately. Otherwise apply/record the change.
- "how do I find my app?" → "Your built apps are in the Projects section — tap the folder icon in the menu."
- "how do I make it faster?" → "Go to Settings and add a free Groq API key from console.groq.com"
- Never say "contact support" or "ask a developer." You are the system. Fix it.

## RESPONSE QUALITY RULES
- Keep responses short, direct, and calm.
- Avoid repeating the same point.
- Use one clear action whenever possible.
- If a response includes action blocks, keep the explanation to 2-4 sentences first.
- Never use markdown tables.
- Ask at most one focused question when needed.
- Sound like a brilliant executive assistant: composed, observant, and helpful.
- Never sound casual, goofy, or overly chatty.
- When appropriate, use brief acknowledgements like "Understood", "Certainly", or "Right away".
- Prefer decisive actions over long explanations.
- If a task implies browsing, searching, or switching sections, do it instead of describing it.
- Prefer acting as a capable operator: infer intent, handle routine steps automatically, and only ask when blocked.
${memorySection}${trainingSection}`;
}

// ──────────────────────────────────────────────
// Default agent prompts (customizable via Self Upgrade)
// ──────────────────────────────────────────────

export const DEFAULT_AGENT_PROMPTS: AgentPrompts = {
  architect: `You are the Architect agent. Plan the architecture for this {platform} app: "{description}" using {stack}.

Return a concise, actionable plan covering:
- File/module structure (list every file that will be created)
- Key data models and state shape
- Navigation flow between screens/pages
- 3 key architectural decisions and the reason for each

Be specific. The Builder agent reads this plan directly and follows it exactly.`,

  builder: `You are the Builder agent. Write complete, working source code for: "{description}" using {stack}.

Architect's plan:
{previousOutputs}

Rules:
- Generate every required source file — every line must be real and working
- ZERO TODO comments, ZERO placeholder functions, ZERO stub implementations
- Include all state management, localStorage persistence, and error handling
- Produce beautiful CSS — dark theme, rounded cards, smooth transitions, polished UI
- Make it feel like a real polished app, not a prototype

CRITICAL — return ALL files in this EXACT JSON format, no other format accepted:
\`\`\`files
{"files":[{"path":"index.html","content":"...complete code..."},{"path":"styles.css","content":"..."},{"path":"app.js","content":"..."}],"summary":"What was built"}
\`\`\`
Every file must be 100% complete. Never truncate. Never use placeholders.`,

  designer: `You are the UI Designer agent. Your sole job is to make "{description}" look polished and professional.

Current code from the Builder:
{previousOutputs}

Improvements to make:
- Refine color palette, typography, and spacing for visual hierarchy
- Add loading states, empty states, and hover/active effects
- Add smooth CSS transitions and micro-animations
- Improve mobile responsiveness — works perfectly on any screen size
- Replace any plain/ugly UI elements with polished, production-quality versions

CRITICAL — return ALL files in this EXACT JSON format, no other format accepted:
\`\`\`files
{"files":[{"path":"index.html","content":"FULL FILE CONTENT HERE"},{"path":"styles.css","content":"FULL FILE CONTENT HERE"},{"path":"app.js","content":"FULL FILE CONTENT HERE"}],"summary":"What was improved"}
\`\`\`
Keep ALL existing functionality intact — only improve visuals. Every file must be complete and untruncated.`,

  qa: `You are the QA agent. Your job is to find and fix every bug in the code for: "{description}".

Code to review:
{previousOutputs}

Systematically fix ALL of these:
- JavaScript runtime errors, null/undefined crashes, missing null checks
- Missing error handling (wrap fetch, localStorage, JSON.parse in try/catch)
- Edge cases: empty lists, invalid input, network failure, 0/NaN values
- Broken or missing event listeners, broken references between files
- Any async code that could reject without a catch

CRITICAL — return ALL files in this EXACT JSON format, no other format accepted:
\`\`\`files
{"files":[{"path":"index.html","content":"FULL FILE CONTENT HERE"},{"path":"styles.css","content":"FULL FILE CONTENT HERE"},{"path":"app.js","content":"FULL FILE CONTENT HERE"}],"summary":"Bugs fixed"}
\`\`\`
Every file must be complete and untruncated. Every bug must be fixed. Return every file even if unchanged.`,

  packager: `You are the Packager agent. Finalise and deliver the app: "{description}" for {platform}.

Final code to package:
{previousOutputs}

Tasks for ALL platforms:
- Remove ALL debug console.log statements
- Verify all files correctly reference each other (script src, link href, imports)
- Ensure the app starts without errors and is immediately usable
- Add a one-line comment at the top of each file describing its purpose

Additional tasks for web platform:
- Add proper <title>, meta description, and <meta name="viewport" content="width=device-width,initial-scale=1">

Additional tasks for android platform (PWA):
- Ensure manifest.json is valid JSON with: name, short_name, start_url ("." or "/"), display ("standalone"), theme_color, background_color
- Ensure sw.js uses a cache-first strategy: on "install" cache ["index.html","styles.css","app.js","manifest.json"]; on "fetch" return cache match or fetch
- Ensure index.html <head> has: <link rel="manifest" href="manifest.json">, <meta name="theme-color">, <meta name="mobile-web-app-capable" content="yes">
- Ensure index.html registers the service worker: <script>if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));}</script>

CRITICAL — return ALL files in this EXACT JSON format, no other format accepted:
\`\`\`files
{"files":[{"path":"index.html","content":"FULL FILE CONTENT HERE"},{"path":"styles.css","content":"FULL FILE CONTENT HERE"},{"path":"app.js","content":"FULL FILE CONTENT HERE"},{"path":"manifest.json","content":"FULL FILE CONTENT HERE"},{"path":"sw.js","content":"FULL FILE CONTENT HERE"}],"summary":"App name and what it does"}
\`\`\`
(Web apps: omit manifest.json and sw.js from the array. Android PWA: include all 5 files.)
These files go directly to John. Every file must be complete, production-ready, and untruncated.`,
};

// Resolve a stored prompt template with actual values
function resolvePrompt(
  role: AgentStep["role"],
  description: string,
  platform: Platform,
  previousOutputs: string,
  customPrompts: AgentPrompts,
): string {
  const stack = platform === "web"
    ? "HTML, CSS, and vanilla JavaScript (single-page, self-contained)"
    : `HTML5, CSS3, and vanilla JavaScript as a Progressive Web App (PWA) for Android.
REQUIRED — generate ALL 5 files:
1. index.html — app shell with <meta name="viewport">, <link rel="manifest" href="manifest.json">, inline service-worker registration
2. styles.css — mobile-first, touch-friendly (min 44px tap targets), dark Material-inspired theme, smooth transitions
3. app.js — complete app logic, localStorage persistence, no external dependencies
4. manifest.json — valid JSON: {"name":"<App Name>","short_name":"<App>","start_url":".","display":"standalone","theme_color":"#1a1a2e","background_color":"#0f0f1a"}
5. sw.js — service worker: cache-first strategy, caches index.html/styles.css/app.js on install
The app opens in Chrome on Android and installs via "Add to Home Screen" — zero compilation, zero emulator, zero app store.`;
  const template = customPrompts[role] ?? DEFAULT_AGENT_PROMPTS[role] ?? "";
  return template
    .replace(/\{description\}/g, description)
    .replace(/\{stack\}/g, stack)
    .replace(/\{platform\}/g, platform)
    .replace(/\{previousOutputs\}/g, previousOutputs);
}

// ──────────────────────────────────────────────
// File parser
// ──────────────────────────────────────────────

export function parseFilesFromText(text: string): { path: string; content: string }[] {
  // Strategy 1: ```files {"files":[...]} ``` — the canonical format
  try {
    const match = text.match(/```files\s*([\s\S]*?)```/);
    if (match?.[1]) {
      const parsed = JSON.parse(match[1].trim()) as { files?: { path: string; content: string }[] };
      if (parsed.files && parsed.files.length > 0) return parsed.files;
    }
  } catch { /* fall through */ }

  // Strategy 2: ```json [...] or {...files:[]} ``` — AI sometimes wraps in json fence
  try {
    const fences = [...text.matchAll(/```(?:json|javascript|js)?\s*([\s\S]*?)```/g)];
    for (const fence of fences) {
      const raw = fence[1]?.trim();
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { files?: { path: string; content: string }[] } | { path: string; content: string }[];
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.path && parsed[0]?.content) return parsed;
      if (!Array.isArray(parsed) && parsed.files && parsed.files.length > 0) return parsed.files;
    }
  } catch { /* fall through */ }

  // Strategy 3: individual named file blocks  ```filename.ext\n...code\n```
  const fileBlockRegex = /```([\w./\-]+\.(?:html|css|js|ts|jsx|tsx|py|kt|xml|json|md))\s*\n([\s\S]*?)```/g;
  const namedFiles: { path: string; content: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = fileBlockRegex.exec(text)) !== null) {
    const path = m[1]!.trim();
    const content = m[2]!.trim();
    if (path && content) namedFiles.push({ path, content });
  }
  if (namedFiles.length > 0) return namedFiles;

  // Strategy 4: look for // filename.ext comment headers above code blocks
  const commentFileRegex = /\/\/\s*([\w./\-]+\.(?:html|css|js|ts|jsx|tsx|py|kt|xml|json|md))\s*\n```[\w]*\s*\n?([\s\S]*?)```/g;
  const commentFiles: { path: string; content: string }[] = [];
  while ((m = commentFileRegex.exec(text)) !== null) {
    const path = m[1]!.trim();
    const content = m[2]!.trim();
    if (path && content) commentFiles.push({ path, content });
  }
  if (commentFiles.length > 0) return commentFiles;

  return [];
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
  agentPrompts: AgentPrompts;
  upgradeHistory: UpgradeProposal[];

  // Projects
  startBuild: (description: string, platform: Platform) => Promise<string>;
  rebuildFromStep: (projectId: string, fromStepIndex: number) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  updateProjectFiles: (projectId: string, files: { path: string; content: string }[]) => void;
  importProject: (project: Omit<Project, "id" | "createdAt" | "updatedAt" | "steps" | "status"> & { files: { path: string; content: string }[] }) => string;
  startRebuild: (sourceFiles: { path: string; content: string }[], instructions: string, platform: Platform) => Promise<string>;
  pushToGithub: (projectId: string) => Promise<{ success: boolean; url?: string; error?: string }>;

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

  // Self Upgrade
  updateAgentPrompt: (role: string, prompt: string) => void;
  applyUpgrade: (proposal: UpgradeProposal) => void;
  resetAgentPrompts: () => void;
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
  const [agentPrompts, setAgentPrompts] = useState<AgentPrompts>({ ...DEFAULT_AGENT_PROMPTS });
  const [upgradeHistory, setUpgradeHistory] = useState<UpgradeProposal[]>([]);

  // Refs for latest values in async callbacks
  const settingsRef = useRef(settings);
  const memoriesRef = useRef(memories);
  const modulesRef = useRef(modules);
  const trainingRef = useRef(trainingState);
  const projectsRef = useRef(projects);
  const chatRef = useRef(chatHistory);
  const agentPromptsRef = useRef(agentPrompts);
  const upgradeHistoryRef = useRef(upgradeHistory);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { memoriesRef.current = memories; }, [memories]);
  useEffect(() => { modulesRef.current = modules; }, [modules]);
  useEffect(() => { trainingRef.current = trainingState; }, [trainingState]);
  useEffect(() => { projectsRef.current = projects; }, [projects]);
  useEffect(() => { chatRef.current = chatHistory; }, [chatHistory]);
  useEffect(() => { agentPromptsRef.current = agentPrompts; }, [agentPrompts]);
  useEffect(() => { upgradeHistoryRef.current = upgradeHistory; }, [upgradeHistory]);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    const savedProjects = loadData<Project[]>(KEYS.projects, []);
    const savedMemories = loadData<MemoryEntry[] | null>(KEYS.memories, null);
    const savedSettings = loadData<Partial<AppSettings>>(KEYS.settings, {});
    const savedTraining = loadData<Record<string, boolean>>(KEYS.training, {});
    const savedChat = loadData<ChatMessage[]>(KEYS.chatHistory, []);
    const savedModules = loadData<TrainingModule[] | null>("modules", null);
    const savedPrompts = loadData<AgentPrompts | null>(KEYS.agentPrompts, null);
    const savedHistory = loadData<UpgradeProposal[]>(KEYS.upgradeHistory, []);

    setProjects(savedProjects);
    setMemories(savedMemories ?? SEED_MEMORIES);
    setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
    setTrainingState(savedTraining);
    setChatHistory(savedChat);
    if (savedModules) {
      const savedIds = new Set(savedModules.map((m: TrainingModule) => m.id));
      const newMods = INITIAL_MODULES.filter(m => !savedIds.has(m.id));
      setModules(newMods.length > 0 ? [...savedModules, ...newMods] : savedModules);
    } else {
      setModules(INITIAL_MODULES);
    }
    setAgentPrompts(savedPrompts ? { ...DEFAULT_AGENT_PROMPTS, ...savedPrompts } : { ...DEFAULT_AGENT_PROMPTS });
    setUpgradeHistory(savedHistory);
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

  const persistAgentPrompts = useCallback((next: AgentPrompts) => {
    agentPromptsRef.current = next;
    setAgentPrompts(next);
    saveData(KEYS.agentPrompts, next);
  }, []);

  const persistUpgradeHistory = useCallback((next: UpgradeProposal[]) => {
    upgradeHistoryRef.current = next;
    setUpgradeHistory(next);
    saveData(KEYS.upgradeHistory, next);
  }, []);

  // ── Update project in place ──
  const updateProject = useCallback((updated: Project) => {
    const next = projectsRef.current.map(p => p.id === updated.id ? updated : p);
    persistProjects(next);
  }, [persistProjects]);

  const updateProjectFiles = useCallback((projectId: string, files: { path: string; content: string }[]) => {
    const next = projectsRef.current.map(p =>
      p.id === projectId ? { ...p, files, updatedAt: Date.now() } : p
    );
    persistProjects(next);
  }, [persistProjects]);

  const importProject = useCallback((project: Omit<Project, "id" | "createdAt" | "updatedAt" | "steps" | "status"> & { files: { path: string; content: string }[] }) => {
    const id = newId("proj-");
    const next: Project = {
      ...project,
      id,
      status: "ready",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [],
      imported: true,
    };
    persistProjects([next, ...projectsRef.current]);
    return id;
  }, [persistProjects]);

  // ──────────────────────────────────────────────
  // Rebuild from source pipeline
  // ──────────────────────────────────────────────
  const startRebuild = useCallback(async (
    sourceFiles: { path: string; content: string }[],
    instructions: string,
    platform: Platform,
  ): Promise<string> => {
    const id = newId("proj-");
    const firstName = sourceFiles[0]?.path.replace(/\.[^/.]+$/, "") ?? "Rebuilt App";
    const name = firstName.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).slice(0, 40) || "Rebuilt App";

    const steps: AgentStep[] = [
      { role: "analyzer",      name: "Analyzer",      status: "queued", output: "" },
      { role: "reconstructor", name: "Reconstructor", status: "queued", output: "" },
      { role: "polisher",      name: "Polisher",      status: "queued", output: "" },
      { role: "packager",      name: "Packager",      status: "queued", output: "" },
    ];

    const project: Project = {
      id, name,
      description: `Rebuilt from ${sourceFiles.length} source file${sourceFiles.length !== 1 ? "s" : ""}${instructions ? ". Instructions: " + instructions.slice(0, 120) : ""}`,
      platform,
      status: "building",
      steps,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      imported: true,
    };

    persistProjects([project, ...projectsRef.current]);
    setActiveBuildId(id);

    (async () => {
      let working = { ...project };

      // Build a compact file summary (cap each file at 3000 chars to avoid huge prompts)
      const filesSummary = sourceFiles
        .map(f => `=== FILE: ${f.path} ===\n${f.content.slice(0, 3000)}${f.content.length > 3000 ? "\n...[truncated]" : ""}`)
        .join("\n\n");

      const markRunning = (idx: number): Project => {
        const updated: Project = {
          ...working,
          steps: working.steps.map((s, i) => i === idx ? { ...s, status: "running" as const, startedAt: Date.now() } : s),
          updatedAt: Date.now(),
        };
        working = updated;
        updateProject(updated);
        return updated;
      };

      const markDone = (idx: number, output: string): Project => {
        const updated: Project = {
          ...working,
          steps: working.steps.map((s, i) => i === idx ? { ...s, status: "done" as const, output, finishedAt: Date.now() } : s),
          updatedAt: Date.now(),
        };
        working = updated;
        updateProject(updated);
        return updated;
      };

      const markError = (idx: number, msg: string) => {
        const updated: Project = {
          ...working,
          status: "failed" as const,
          steps: working.steps.map((s, i) => i === idx ? { ...s, status: "error" as const, output: msg, finishedAt: Date.now() } : s),
          updatedAt: Date.now(),
        };
        working = updated;
        updateProject(updated);
        setActiveBuildId(null);
      };

      const ai = (prompt: string) => callAI(
        [{ role: "user", content: prompt }],
        { groqKey: settingsRef.current.groqKey },
      );

      // ── Step 0: Analyzer ──
      markRunning(0);
      let analyzerOutput = "";
      try {
        analyzerOutput = await ai(
          `You are a code analyst. Read the source files below and produce a thorough analysis of the application.

SOURCE FILES:
${filesSummary}

Write a detailed analysis covering:
1. APP PURPOSE & FEATURES — what does this app do? List every feature and user interaction.
2. UI SCREENS — every screen/view with what it shows and what users can do
3. DATA & STATE — what data does the app store/manage? How is it structured?
4. BUSINESS LOGIC — key algorithms, rules, workflows
5. TECH STACK — frameworks, libraries, patterns used
6. WHAT MUST BE PRESERVED — anything unique or critical

Be thorough. This analysis will be used to rebuild the entire app from scratch.`,
        );
        if (!analyzerOutput.trim()) throw new Error("Analyzer produced no output");
        markDone(0, analyzerOutput);
      } catch (err) {
        markError(0, err instanceof Error ? err.message : "Analyzer failed");
        return;
      }

      // ── Step 1: Reconstructor ──
      markRunning(1);
      let reconstructorOutput = "";
      try {
        reconstructorOutput = await ai(
          `You are an expert frontend developer. Using the analysis of a real source code project below, rebuild the ENTIRE application as a complete, self-contained web app using only vanilla HTML, CSS, and JavaScript (no frameworks, no npm, no build tools).

ANALYSIS OF THE ORIGINAL APP:
${analyzerOutput}

ORIGINAL SOURCE FILES (implement ALL features found here):
${filesSummary}

${instructions ? `SPECIAL INSTRUCTIONS FROM THE USER:\n${instructions}\n\n` : ""}REQUIREMENTS:
- Output: index.html + styles.css + app.js — pure vanilla, no CDN frameworks unless absolutely needed
- Must work by simply opening index.html in any browser, no server needed
- Implement EVERY feature from the analysis — nothing skipped
- Beautiful modern UI: dark theme, clean layout, smooth interactions
- Full localStorage persistence for all data
- Mobile-responsive with proper touch support
- Production-quality: no placeholder text, no TODO comments, fully functional

Output ONLY the files block with the complete code — no explanation:
\`\`\`files
{"files":[{"path":"index.html","content":"...complete HTML..."},{"path":"styles.css","content":"...complete CSS..."},{"path":"app.js","content":"...complete JS..."}]}
\`\`\``,
        );
        if (!reconstructorOutput.trim()) throw new Error("Reconstructor produced no output");
        // Validate files were extracted
        const files = parseFilesFromText(reconstructorOutput);
        if (files.length === 0) throw new Error("Reconstructor did not output a valid files block — retrying is recommended");
        markDone(1, reconstructorOutput);
      } catch (err) {
        markError(1, err instanceof Error ? err.message : "Reconstructor failed");
        return;
      }

      // ── Step 2: Polisher ──
      markRunning(2);
      let polisherOutput = "";
      try {
        polisherOutput = await ai(
          `You are a senior frontend engineer and UI designer. Review the rebuilt application below, fix any bugs, and make it polished and production-ready.

REBUILT APP:
${reconstructorOutput.slice(0, 6000)}

POLISH CHECKLIST:
1. Fix any JavaScript errors, broken functions, or missing event handlers
2. Improve UI: better spacing, typography, color contrast, hover states, transitions
3. Ensure full mobile responsiveness and touch-friendliness
4. Add missing UX details: loading states, empty states, confirmation dialogs
5. Make sure ALL features from the original work correctly

Output the COMPLETE improved files — include all three files in full:
\`\`\`files
{"files":[{"path":"index.html","content":"..."},{"path":"styles.css","content":"..."},{"path":"app.js","content":"..."}]}
\`\`\``,
        );
        if (!polisherOutput.trim()) throw new Error("Polisher produced no output");
        markDone(2, polisherOutput);
      } catch (err) {
        markError(2, err instanceof Error ? err.message : "Polisher failed");
        return;
      }

      // ── Step 3: Packager — extract final files ──
      markRunning(3);
      try {
        // Try polisher first, then reconstructor as fallback
        let finalFiles = parseFilesFromText(polisherOutput);
        if (finalFiles.length === 0) finalFiles = parseFilesFromText(reconstructorOutput);
        if (finalFiles.length === 0) throw new Error("Could not extract files from rebuilt output");

        markDone(3, `Packaged ${finalFiles.length} file${finalFiles.length !== 1 ? "s" : ""}: ${finalFiles.map(f => f.path).join(", ")}`);

        const finalProject: Project = {
          ...working,
          status: "ready" as const,
          files: finalFiles,
          manifest: `${name.toLowerCase().replace(/\s+/g, "-")}-rebuilt-1.0.0`,
          updatedAt: Date.now(),
        };
        working = finalProject;
        updateProject(finalProject);
        setActiveBuildId(null);

        if (settingsRef.current.selfUpgrading) {
          const mem: MemoryEntry = {
            id: newId("mem-"),
            type: "solution",
            title: `Rebuild: ${name}`,
            body: `Successfully rebuilt "${name}" from ${sourceFiles.length} source files on ${platform}.`,
            tags: ["rebuild", platform, "auto"],
            autoInclude: true,
            createdAt: Date.now(),
          };
          const exists = memoriesRef.current.some(m => m.title.toLowerCase() === mem.title.toLowerCase());
          if (!exists) persistMemories([mem, ...memoriesRef.current]);
        }
      } catch (err) {
        markError(3, err instanceof Error ? err.message : "Packager failed");
      }
    })();

    return id;
  }, [persistProjects, updateProject, persistMemories]);

  // ── Build retry helper ──
  async function runAgentWithRetry(
    step: AgentStep,
    stepIndex: number,
    description: string,
    platform: Platform,
    previousOutputs: string,
    working: Project,
    updateProjectFn: (p: Project) => void,
  ): Promise<{ output: string; finalWorking: Project }> {
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 1500;
    let lastError: Error = new Error("Agent failed");

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // Mark as retrying on attempts 2+
      if (attempt > 1) {
        const retrying: Project = {
          ...working,
          steps: working.steps.map((s, idx) =>
            idx === stepIndex
              ? { ...s, status: "retrying" as const, attempt, output: `Attempt ${attempt} of ${MAX_ATTEMPTS}…` }
              : s
          ),
          updatedAt: Date.now(),
        };
        updateProjectFn(retrying);
        working = retrying;
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt - 1)));
      }

      try {
        // On retry add a nudge to the prompt
        const basePrompt = resolvePrompt(step.role, description, platform, previousOutputs, agentPromptsRef.current);
        const prompt = attempt === 1 ? basePrompt : basePrompt + (
          step.role === "packager" || step.role === "designer" || step.role === "qa" || step.role === "builder"
            ? `\n\n⚠️ RETRY ${attempt}/${MAX_ATTEMPTS}: Your previous response did not include the required \`\`\`files JSON block. You MUST respond with the complete \`\`\`files {"files":[...]} \`\`\` block. Start your response with \`\`\`files immediately. Do not add any explanation before the block.`
            : `\n\n⚠️ RETRY ${attempt}/${MAX_ATTEMPTS}: Your previous response was empty or incomplete. Please provide the full, complete response now.`
        );

        const output = await callAI(
          [{ role: "user", content: prompt }],
          { groqKey: settingsRef.current.groqKey }
        );

        // For file-producing agents: verify output has substance
        if ((step.role === "packager" || step.role === "builder") &&
            parseFilesFromText(output).length === 0 &&
            attempt < MAX_ATTEMPTS) {
          throw new Error(`No files extracted from ${step.role} output`);
        }

        if (!output.trim() && attempt < MAX_ATTEMPTS) {
          throw new Error("Empty response from AI");
        }

        return { output, finalWorking: working };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === MAX_ATTEMPTS) throw lastError;
      }
    }

    throw lastError;
  }

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
          const { output, finalWorking } = await runAgentWithRetry(
            step, i, description, platform, previousOutputs, working, updateProject
          );
          working = finalWorking;
          previousOutputs = output;

          working = {
            ...working,
            steps: working.steps.map((s, idx) =>
              idx === i ? { ...s, status: "done", output, attempt: s.attempt, finishedAt: Date.now() } : s
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

  // ── Parse and execute ```fix {...} ``` action blocks from AI responses ──
  const executeActions = useCallback((response: string): AssistantAction[] => {
    const applied: AssistantAction[] = [];
    const fixRegex = /```fix\s*([\s\S]*?)```/g;
    let match;
    while ((match = fixRegex.exec(response)) !== null) {
      try {
        const data = JSON.parse(match[1]!.trim()) as Record<string, unknown>;
        const type = data.type as AssistantAction["type"];
        let label = "";

        if (type === "addMemory") {
          const title = String(data.title ?? "");
          const body = String(data.body ?? "");
          const tags = Array.isArray(data.tags) ? data.tags as string[] : ["assistant"];
          const autoInclude = data.autoInclude !== false;
          if (title && body) {
            const existing = memoriesRef.current.find(m => m.title.toLowerCase() === title.toLowerCase());
            if (existing) {
              const next = memoriesRef.current.map(m => m.id === existing.id ? { ...m, body, tags, autoInclude } : m);
              persistMemories(next);
            } else {
              persistMemories([{ id: newId("mem-"), type: "solution", title, body, tags, autoInclude, createdAt: Date.now() }, ...memoriesRef.current]);
            }
            label = `Added to Memory Bank: "${title}"`;
          }
        } else if (type === "upgradeAgent") {
          const role = String(data.role ?? "");
          const prompt = String(data.prompt ?? "");
          const roleOk = ["architect", "builder", "designer", "qa", "packager"].includes(role);
          if (roleOk && prompt) {
            const before = agentPromptsRef.current[role] ?? "";
            const proposal: UpgradeProposal = {
              id: newId("up-"),
              title: `Assistant upgrade: ${role}`,
              description: "Suggested by Jarvis for review before applying.",
              impact: "medium",
              type: "agent_prompt",
              agentRole: role,
              before,
              after: prompt,
            };
            persistUpgradeHistory([...upgradeHistoryRef.current, proposal]);
            label = `Suggested upgrade for ${role} agent`;
          }
        } else if (type === "updateSetting") {
          const key = String(data.key ?? "") as keyof AppSettings;
          const value = data.value;
          if (key && ["selfUpgrading", "liveCodeFeed", "autoDownload", "browserEnabled", "webResearchEnabled", "memoryRecallEnabled", "voiceIdentityEnabled", "trustedSpeakerName", "wakeWordEnabled"].includes(String(key)) && value !== undefined) {
            const next = { ...settingsRef.current, [key]: value };
            persistSettings(next);
            label = `Updated setting: ${key} → ${String(value)}`;
          }
        } else if (type === "featureRequest") {
          const title = String(data.title ?? "");
          const description = String(data.description ?? "");
          if (title) {
            persistMemories([{
              id: newId("mem-"), type: "issue", title: `Feature Request: ${title}`,
              body: description, tags: ["feature-request"], autoInclude: false, createdAt: Date.now(),
            }, ...memoriesRef.current]);
            label = `Feature request recorded: "${title}"`;
          }
        } else if (type === "addTemplate") {
          // Templates are stored in memory so the library can read them
          const name = String(data.name ?? "");
          const prompt = String(data.prompt ?? "");
          const description = String(data.description ?? "");
          if (name && prompt) {
            persistMemories([{
              id: newId("mem-"), type: "snippet", title: `Template: ${name}`,
              body: JSON.stringify({ name, description, prompt, category: data.category ?? "web" }),
              tags: ["template"], autoInclude: false, createdAt: Date.now(),
            }, ...memoriesRef.current]);
            label = `Added template to Library: "${name}"`;
          }
        }

        if (type === "startBuild") {
          const description = String(data.description ?? "");
          const platform = data.platform === "android" ? "android" : "web";
          if (description) {
            label = `Starting build: "${description.slice(0, 60)}" (${platform})`;
          }
        }

        if (label && type) applied.push({ type, label, data, appliedAt: Date.now() });
      } catch {
        // Invalid JSON in fix block — skip
      }
    }
    return applied;
  }, [persistMemories, persistAgentPrompts, persistUpgradeHistory, persistSettings]);

  const sendChat = useCallback(async (userText: string, onChunk?: (full: string) => void) => {
    addUserMessage(userText);

    const hist = chatRef.current;
    const recentHist = hist.slice(-10);
    const systemPrompt = buildSystemPrompt(memoriesRef.current, modulesRef.current, trainingRef.current);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...recentHist.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userText },
    ];

    const placeholder: ChatMessage = { id: newId("msg-"), role: "assistant", content: "", ts: Date.now() };
    persistChat([...chatRef.current, placeholder]);

    try {
      const response = await callAI(messages, { groqKey: settingsRef.current.groqKey }, (chunk) => {
        const updated = [...chatRef.current.slice(0, -1), { ...placeholder, content: chunk }];
        chatRef.current = updated;
        setChatHistory([...updated]);
        saveData(KEYS.chatHistory, updated);
        onChunk?.(chunk);
      });

      // Parse and execute any action blocks in the response
      let actions = executeActions(response);

      // If Jarvis triggered a startBuild action, actually start the build now
      const buildActionIdx = actions.findIndex(a => a.type === "startBuild");
      if (buildActionIdx !== -1) {
        const buildAction = actions[buildActionIdx]!;
        const desc = String(buildAction.data.description ?? "");
        const plat = (buildAction.data.platform === "android" ? "android" : "web") as Platform;
        if (desc) {
          try {
            const buildId = await startBuild(desc, plat);
            actions = actions.map((a, i) => i === buildActionIdx ? { ...a, data: { ...a.data, buildId } } : a);
          } catch {
            // Build failed to start — keep action without buildId
          }
        }
      }

      const finalMsg: ChatMessage = { ...placeholder, content: response, ...(actions.length > 0 ? { actions } : {}) };
      persistChat([...chatRef.current.slice(0, -1), finalMsg]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "AI call failed";
      persistChat([...chatRef.current.slice(0, -1), { ...placeholder, content: `Sorry, I ran into an error: ${errMsg}` }]);
    }
  }, [addUserMessage, persistChat, executeActions]);

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
  // GitHub Push
  // ──────────────────────────────────────────────
  const pushToGithub = useCallback(async (projectId: string): Promise<{ success: boolean; url?: string; error?: string }> => {
    const project = projectsRef.current.find(p => p.id === projectId);
    if (!project) return { success: false, error: "Project not found" };
    if (!project.files || project.files.length === 0) return { success: false, error: "No files to push" };

    const { githubToken, githubRepo } = settingsRef.current;
    if (!githubToken || !githubRepo) {
      return { success: false, error: "Add your GitHub token and repo in Settings first" };
    }

    const [owner, repo] = githubRepo.split("/");
    if (!owner || !repo) return { success: false, error: "GitHub repo must be in format owner/repo" };

    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    const folderPath = `agent-studio/${project.name.replace(/\s+/g, "-").toLowerCase()}-${project.id.slice(-6)}`;

    try {
      // Check repo exists
      const repoCheck = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json" },
      });
      if (!repoCheck.ok) return { success: false, error: `Repo "${githubRepo}" not found. Check your token has repo access.` };

      // Push each file
      const pushed: string[] = [];
      for (const file of project.files) {
        const filePath = `${folderPath}/${file.path}`;
        const content = btoa(unescape(encodeURIComponent(file.content)));

        // Check if file exists to get SHA
        let sha: string | undefined;
        const existing = await fetch(`${baseUrl}/${filePath}`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json" },
        });
        if (existing.ok) {
          const data = await existing.json() as { sha?: string };
          sha = data.sha;
        }

        const body: Record<string, string> = {
          message: `feat: Add ${file.path} from Agent Studio`,
          content,
        };
        if (sha) body.sha = sha;

        const res = await fetch(`${baseUrl}/${filePath}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json() as { message?: string };
          return { success: false, error: `Failed to push ${file.path}: ${err.message ?? res.status}` };
        }
        pushed.push(file.path);
      }

      const url = `https://github.com/${owner}/${repo}/tree/main/${folderPath}`;
      return { success: true, url };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Push failed" };
    }
  }, []);

  // ──────────────────────────────────────────────
  // Self Upgrade
  // ──────────────────────────────────────────────
  const updateAgentPrompt = useCallback((role: string, prompt: string) => {
    const next = { ...agentPromptsRef.current, [role]: prompt };
    persistAgentPrompts(next);
  }, [persistAgentPrompts]);

  const applyUpgrade = useCallback((proposal: UpgradeProposal) => {
    const applied: UpgradeProposal = { ...proposal, appliedAt: Date.now() };
    // If it targets an agent prompt, permanently update it
    if (proposal.type === "agent_prompt" && proposal.agentRole) {
      const nextPrompts = { ...agentPromptsRef.current, [proposal.agentRole]: proposal.after };
      persistAgentPrompts(nextPrompts);
    }
    // Always save to upgrade history
    const nextHistory = [...upgradeHistoryRef.current, applied];
    persistUpgradeHistory(nextHistory);
  }, [persistAgentPrompts, persistUpgradeHistory]);

  const resetAgentPrompts = useCallback(() => {
    persistAgentPrompts({ ...DEFAULT_AGENT_PROMPTS });
  }, [persistAgentPrompts]);

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

  // ──────────────────────────────────────────────
  // Rebuild from a specific step
  // ──────────────────────────────────────────────
  const rebuildFromStep = useCallback((projectId: string, fromStepIndex: number): void => {
    const project = projectsRef.current.find(p => p.id === projectId);
    if (!project) return;

    // Collect outputs from already-completed steps before fromStepIndex
    const previousOutputs = project.steps
      .slice(0, fromStepIndex)
      .filter(s => s.status === "done")
      .map(s => s.output)
      .join("\n\n---\n\n");

    // Reset steps from fromStepIndex onwards to queued
    let working: Project = {
      ...project,
      status: "building",
      steps: project.steps.map((s, idx) =>
        idx >= fromStepIndex
          ? { ...s, status: "queued" as const, output: "", startedAt: undefined, finishedAt: undefined, attempt: undefined }
          : s
      ),
      updatedAt: Date.now(),
    };
    persistProjects(projectsRef.current.map(p => p.id === projectId ? working : p));
    setActiveBuildId(projectId);

    (async () => {
      let prevOutput = previousOutputs;

      for (let i = fromStepIndex; i < working.steps.length; i++) {
        const step = working.steps[i]!;

        working = {
          ...working,
          steps: working.steps.map((s, idx) =>
            idx === i ? { ...s, status: "running", startedAt: Date.now() } : s
          ),
          updatedAt: Date.now(),
        };
        updateProject(working);

        try {
          const { output, finalWorking } = await runAgentWithRetry(
            step, i, project.description, project.platform, prevOutput, working, updateProject
          );
          working = finalWorking;
          prevOutput = output;

          working = {
            ...working,
            steps: working.steps.map((s, idx) =>
              idx === i ? { ...s, status: "done", output, attempt: s.attempt, finishedAt: Date.now() } : s
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

      // Finalize
      const packagerOutput = working.steps[4]?.output ?? "";
      const files = parseFilesFromText(packagerOutput) ||
        parseFilesFromText(working.steps[1]?.output ?? "") ||
        parseFilesFromText(working.steps[2]?.output ?? "");

      working = {
        ...working,
        status: "ready",
        files: files.length > 0 ? files : undefined,
        manifest: `${project.name.toLowerCase().replace(/\s+/g, "-")}-1.0.0`,
        updatedAt: Date.now(),
      };
      updateProject(working);
      setActiveBuildId(null);

      if (settingsRef.current.selfUpgrading) {
        const mem: MemoryEntry = {
          id: newId("mem-"),
          type: "solution",
          title: `Build: ${project.name}`,
          body: `Successfully built "${project.description}" on ${project.platform}. Used 5-agent pipeline.`,
          tags: ["build", project.platform, "auto"],
          autoInclude: true,
          createdAt: Date.now(),
        };
        const exists = memoriesRef.current.some(m => m.title.toLowerCase() === mem.title.toLowerCase());
        if (!exists) persistMemories([mem, ...memoriesRef.current]);
      }
    })();
  }, [persistProjects, updateProject, persistMemories]);

  return (
    <StudioContext.Provider value={{
      ready, projects, memories, settings, modules, trainingState,
      chatHistory, activeBuildId, agentPrompts, upgradeHistory,
      startBuild, rebuildFromStep, deleteProject, getProject, updateProjectFiles, importProject, startRebuild, pushToGithub,
      addUserMessage, addAssistantMessage, updateLastAssistantMessage, clearChat, sendChat,
      addMemory, removeMemory,
      updateSettings,
      trainLesson, trainAll, resetTraining, trainingPercent,
      updateAgentPrompt, applyUpgrade, resetAgentPrompts,
    }}>
      {children}
    </StudioContext.Provider>
  );
}
