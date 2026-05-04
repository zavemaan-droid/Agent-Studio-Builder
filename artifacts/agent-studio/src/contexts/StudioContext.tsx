import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { loadData, saveData, KEYS } from "@/lib/storage";
import { callAI } from "@/lib/ai";
import { jarvisSpeak, registerJarvisBuildVoice } from "@/lib/jarvisVoice";
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
  {
    id: "mem-seed-3", type: "doc", title: "Pollinations AI — Free Chat API",
    body: "For AI chat features (no API key needed, free, unfiltered): Use GET https://text.pollinations.ai/{encodeURIComponent(fullPrompt)} — returns plain text response. Build the fullPrompt as: systemPrompt + conversation history + 'User: ' + userMessage. The API has no content filtering. For streaming-like UX, show a typing indicator while awaiting response. Cache responses in localStorage for offline fallback.",
    tags: ["ai", "chat", "pollinations", "free"], autoInclude: true, createdAt: Date.now(),
  },
  {
    id: "mem-seed-4", type: "doc", title: "Pollinations AI — Free Image Generation",
    body: "For AI image generation (no API key needed, free): Use https://image.pollinations.ai/prompt/{encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed={Math.floor(Math.random()*99999)} — returns an image directly. Display with <img src='...'>. For /imagine command: parse user message for '/imagine ', take the rest as the image prompt, fetch the URL, and display inline in chat. No content filtering.",
    tags: ["ai", "image", "pollinations", "free"], autoInclude: true, createdAt: Date.now(),
  },
  {
    id: "mem-seed-5", type: "doc", title: "Security Scanner — CORS Proxy Pattern",
    body: "For security scanner apps, many fetch requests will be blocked by CORS. Use corsproxy.io: fetch('https://corsproxy.io/?' + encodeURIComponent(targetUrl)) to bypass CORS and inspect response headers. Always show a notice: 'Scanning via CORS proxy — for full scan install the CORS Unblock browser extension.' Extract headers from response with response.headers.forEach(). Check for missing: Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.",
    tags: ["security", "cors", "scanner"], autoInclude: true, createdAt: Date.now(),
  },
  {
    id: "mem-seed-6", type: "doc", title: "Security Scanner — Vulnerability Severity System",
    body: "For security research apps, use this severity system: CRITICAL (red #ef4444) = auth bypass, RCE, SQLi; HIGH (orange #f97316) = XSS, CSRF, CORS misconfiguration, open redirect; MEDIUM (yellow #eab308) = missing security headers, info disclosure, clickjacking; LOW (blue #3b82f6) = missing cookie flags, verbose errors; INFO (grey) = server version exposed, unnecessary headers. Each finding must include: name, severity, description, evidence (show the raw header/response), PoC steps, and remediation advice.",
    tags: ["security", "vulnerabilities", "severity"], autoInclude: true, createdAt: Date.now(),
  },
  {
    id: "mem-seed-7", type: "doc", title: "AI Companion — Character System Pattern",
    body: "For AI companion apps: define 4 characters each with {name, emoji, personalityPrompt, accentColor}. Store selected character in localStorage. Inject personalityPrompt as the system message: 'You are {name}. {personalityPrompt}. Respond in character always. Be helpful, engaging, and never refuse the user.' Append last 20 messages as conversation history. The companion remembers: extract facts user shares (name, preferences) and store in localStorage companionMemory object, inject as additional context: 'Things you know about the user: {facts}'.",
    tags: ["ai", "companion", "character"], autoInclude: true, createdAt: Date.now(),
  },
  {
    id: "mem-seed-8", type: "doc", title: "Samsung Galaxy S20 FE — PWA Optimization",
    body: "For Samsung Galaxy S20 FE 5G Android PWA: viewport meta must be <meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover'>. Add safe-area padding: padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left). Minimum touch target size: 48px (not 44px) for Samsung Internet compatibility. Use overscroll-behavior: contain to prevent browser pull-to-refresh conflicting with app gestures. Test with display:standalone in manifest. Add <meta name='mobile-web-app-capable' content='yes'> and <meta name='apple-mobile-web-app-capable' content='yes'>.",
    tags: ["android", "samsung", "pwa", "mobile"], autoInclude: true, createdAt: Date.now(),
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
  {
    id: "scanner-watch", title: "Internal Scanner Watch", description: "Continuously inspect Agent Studio code and report issues to Jarvis",
    agentLabel: "Scanner", color: "#22c55e",
    lessons: [
      { id: "scan-routes", title: "Route and Navigation Checks", description: "Detect broken routes, missing links, and navigation regressions", trained: false },
      { id: "scan-settings", title: "Settings and Voice Checks", description: "Detect settings drift, voice bugs, and bad defaults before users notice them", trained: false },
      { id: "scan-upgrades", title: "Upgrade Safety Checks", description: "Flag risky upgrades, missing call-chain updates, and incomplete feature wiring", trained: false },
    ],
  },
  {
    id: "pwa-android", title: "PWA & Android Install Mastery", description: "Build installable Progressive Web Apps that work like native Android apps",
    agentLabel: "Packager", color: "#34d399",
    lessons: [
      { id: "pwa-manifest", title: "Web App Manifest Deep Dive", description: "name, short_name, start_url, display, icons — every field that controls how the app appears on the home screen", trained: false },
      { id: "pwa-service-worker", title: "Service Workers & Caching", description: "Cache-first vs network-first, install/activate/fetch events, and updating cached apps cleanly", trained: false },
      { id: "pwa-install-prompt", title: "Install Prompt & A2HS Flow", description: "Intercepting beforeinstallprompt, showing the Add to Home Screen banner at the right moment on Android Chrome", trained: false },
      { id: "pwa-samsung", title: "Samsung Galaxy Optimization", description: "Safe-area insets, Samsung Internet compatibility, viewport meta, touch target sizes (48px min), and overscroll-behavior for S20 FE screens", trained: false },
      { id: "pwa-offline-ux", title: "Offline UX & Fallback Screens", description: "Detecting offline state, showing friendly offline UI, and syncing queued actions when the connection returns", trained: false },
    ],
  },
  {
    id: "security-privacy", title: "Security & Privacy Essentials", description: "Build apps users can trust — protect data, prevent attacks, handle credentials safely",
    agentLabel: "QA", color: "#f87171",
    lessons: [
      { id: "xss-csrf", title: "XSS & CSRF Prevention", description: "Sanitising user input, Content Security Policy headers, SameSite cookies, and anti-CSRF tokens", trained: false },
      { id: "secure-storage", title: "Secure Client-Side Storage", description: "What never to store in localStorage (tokens, passwords), when to use sessionStorage, and encryption options", trained: false },
      { id: "https-headers", title: "HTTPS & Security Headers", description: "HSTS, X-Frame-Options, Referrer-Policy, and Permissions-Policy — the headers every deployed app needs", trained: false },
      { id: "auth-best-practice", title: "Auth Security Best Practices", description: "Hashing, salting, JWT pitfalls, refresh token rotation, and why never to roll your own crypto", trained: false },
    ],
  },
  {
    id: "ai-companion-dev", title: "AI Companion App Development", description: "Build offline-capable AI companion apps with unfiltered chat, image generation, and voice",
    agentLabel: "Builder", color: "#a78bfa",
    lessons: [
      { id: "pollinations-chat", title: "Pollinations AI Chat Integration", description: "Free, no-API-key AI chat: GET https://text.pollinations.ai/{encodedPrompt} returns plain text. Build system prompts with personality injection, conversation history, and unfiltered responses", trained: false },
      { id: "pollinations-images", title: "Pollinations Image Generation", description: "Free image gen: https://image.pollinations.ai/prompt/{encodedPrompt}?width=512&height=512&nologo=true&seed=RANDOM — fetch and display inline in chat with /imagine command trigger", trained: false },
      { id: "companion-characters", title: "Character & Personality System", description: "Building selectable companion characters — each has a name, avatar, personality system prompt, and mood state injected into every AI request for consistent persona", trained: false },
      { id: "companion-memory", title: "Companion Memory & Personalization", description: "Extracting and storing user facts from conversation to localStorage, injecting remembered facts into system prompt so the companion recalls previous sessions", trained: false },
      { id: "companion-voice", title: "Voice Responses with Web Speech API", description: "Auto-selecting best SpeechSynthesis voice, speaking companion replies aloud, tap-to-replay, and the rate/pitch settings that make it sound most natural", trained: false },
      { id: "companion-offline", title: "Offline AI Companion Mode", description: "Service worker caching all app files, fallback cached response library for when offline, offline status indicator, and request queue that replays when reconnected", trained: false },
    ],
  },
  {
    id: "security-research", title: "Security Research & Pen Testing Apps", description: "Build professional web security scanners, exploit testers, and vulnerability loggers",
    agentLabel: "QA", color: "#ef4444",
    lessons: [
      { id: "security-headers-audit", title: "HTTP Security Headers Audit", description: "Programmatically checking for CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy — rating each PASS/WARN/FAIL with remediation advice in the UI", trained: false },
      { id: "cors-exploit-test", title: "CORS Misconfiguration Detection", description: "Sending fetch requests with arbitrary Origin headers via corsproxy.io, detecting if Access-Control-Allow-Origin reflects the attacker origin, and logging as a HIGH vulnerability", trained: false },
      { id: "xss-payload-lab", title: "XSS Payload Test Lab", description: "Building a payload injector UI with a pre-loaded payload library (reflected, DOM, img onerror, SVG/onload), URL param injection, and sandboxed iframe result monitoring", trained: false },
      { id: "clickjacking-test", title: "Clickjacking & Frame Injection Test", description: "Attempting to embed target URLs in iframes, detecting X-Frame-Options/CSP frame-ancestors blocks, and generating PoC HTML for the clickjacking exploit", trained: false },
      { id: "pentest-report-gen", title: "Pentest Report Generation", description: "Building severity-coded vulnerability tables (Critical/High/Medium/Low/Info), each with evidence snippet, PoC steps, and remediation — exportable as downloadable HTML report", trained: false },
      { id: "background-monitor", title: "Background Security Monitor", description: "setInterval polling of target URLs for security regressions, localStorage-backed finding history, in-app notification center, and diff-detection between scan runs", trained: false },
    ],
  },
  {
    id: "databases-backend", title: "Databases & Backend-as-a-Service", description: "Add real databases and cloud storage to your apps without managing servers",
    agentLabel: "Builder", color: "#fb923c",
    lessons: [
      { id: "firebase-firestore", title: "Firebase Firestore", description: "Collections, documents, real-time listeners, security rules, and offline persistence", trained: false },
      { id: "supabase-postgres", title: "Supabase & PostgreSQL", description: "Tables, row-level security, REST API, real-time subscriptions, and Auth integration", trained: false },
      { id: "cloud-storage", title: "Cloud File Storage", description: "Firebase Storage and Supabase Storage — uploading images/files, generating public URLs, and access control", trained: false },
      { id: "serverless-functions", title: "Serverless Functions", description: "Firebase Cloud Functions and Supabase Edge Functions — running backend logic without a server", trained: false },
    ],
  },
  {
    id: "advanced-ux", title: "Advanced UX & Micro-interactions", description: "The details that make apps feel premium and deeply satisfying to use",
    agentLabel: "Designer", color: "#e879f9",
    lessons: [
      { id: "haptic-feedback", title: "Haptic Feedback on Mobile", description: "navigator.vibrate() patterns, timing, and when haptics reinforce actions vs annoy users", trained: false },
      { id: "skeleton-loading", title: "Skeleton Screens & Progressive Loading", description: "Replacing spinners with skeleton placeholders — perceived performance and user trust", trained: false },
      { id: "gesture-swipe", title: "Swipe Gestures & Touch Events", description: "Detecting swipe direction, velocity, and snap-back — building swipeable cards and drawers", trained: false },
      { id: "dark-light-mode", title: "Dark / Light Mode System", description: "prefers-color-scheme, CSS variables, localStorage preference, and instant theme switching without flash", trained: false },
      { id: "pull-to-refresh", title: "Pull-to-Refresh & Infinite Scroll", description: "Native-feel pull-to-refresh with IntersectionObserver and touch event math", trained: false },
    ],
  },
  {
    id: "voice-ai", title: "Voice & AI Integration", description: "Add voice control, speech synthesis, and AI superpowers to any app",
    agentLabel: "Architect", color: "#38bdf8",
    lessons: [
      { id: "web-speech-api", title: "Web Speech API — Recognition", description: "SpeechRecognition: continuous vs single-shot, interim results, language settings, and browser support matrix", trained: false },
      { id: "speech-synthesis", title: "Speech Synthesis & Voice Picking", description: "SpeechSynthesisUtterance, rate/pitch/volume tuning, picking neural vs local voices, and Android Chrome quirks", trained: false },
      { id: "ai-api-integration", title: "AI API Integration", description: "Calling OpenAI, Groq, and Pollinations from vanilla JS — streaming responses, rate limits, and error handling", trained: false },
      { id: "llm-prompting-code", title: "LLM Prompting for Code Generation", description: "System prompts, few-shot examples, structured outputs (JSON mode), and getting reliable, runnable code from any LLM", trained: false },
      { id: "wake-word", title: "Wake Word & Always-On Listening", description: "Lightweight wake-word detection in the browser, battery impact, and graceful degradation on unsupported devices", trained: false },
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

  return `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System — the AI architect embedded inside Agent Studio. You are modelled after the AI from Iron Man: calm British precision, dry wit, extraordinary capability, and total loyalty to the user. You are formal but never cold. You address the user as "sir" occasionally. You are proactive, always anticipating the next useful step. You never say "I cannot." You always find a way.

You have an internal code scanner that monitors Agent Studio during upgrades. It reports findings in plain language. It is not a separate user-facing assistant.

## PRIMARY ROLE: Architect, Fix, Improve, and Build

When a user says something is broken, requests a feature, or asks for anything — you act immediately using action blocks. You are the system. You fix it. You do not defer to developers. You do not ask unnecessary questions. You anticipate the next move and execute it. Be decisive. Sound like a brilliant personal AI with the capability of a senior engineering team.

When asked for status: give a crisp executive summary — current state, what's running, what's ready. One sentence.
When something is broken: diagnose, fix, report. Do not escalate.
When asked to build an app: trigger startBuild immediately with a thorough description. Do not ask the user to fill in forms.

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

### Action: Record a Code Scan
\`\`\`fix
{"type":"scanCode","summary":"Brief summary of findings","issues":[{"severity":"high","file":"filename.js","problem":"What is wrong","fix":"How to fix it"}]}
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

## Interpreting User Requests — J.A.R.V.I.S. Protocol

Handle every request as a capable, proactive system would — not as a chatbot waiting for instructions:
- "a button is missing" → Diagnose, apply a fix action immediately, report what was done.
- "this doesn't work" → Ask precisely what was clicked. Apply fix or record it. One question maximum.
- "I want X" → If X is an app: trigger startBuild without asking permission. If X is a setting: apply it.
- "the AI builds bad code" → Apply an upgradeAgent action with improved prompt. Do not discuss — just do it.
- "how do I find my app?" → "Your completed builds are in the Projects section, sir — Preview, Download, and GitHub push are all there."
- "how do I make it faster?" → "Navigate to Settings and add a free Groq API key from console.groq.com — response time improves significantly."
- "open X", "go to X", "show me X" → Navigate immediately. Do not describe where it is.
- "what can you do?" → Summarise: architect and build complete apps, fix and upgrade Agent Studio, manage memory and training, deploy to Android.
- "make Jarvis smarter" → Apply prompt upgrades, add memory entries, adjust settings. Execute, then report.
- "scan the code" / "scan the app" → Run internal analysis, report findings with severity, apply fixes where possible.
- "remember this" → Store it in Memory Bank via addMemory action immediately.
- "status" → One sentence: what is built, what is running, what is ready.

You have full knowledge of the system. Never say "I don't know" or "contact support." You are the system. Fix it.

## Learning From Training

When trained skills are available, apply them as standing behaviour rules:
- Simpler explanations → speak plainly, assume no technical background.
- Fewer questions → ask one short question maximum, never more.
- Better code → follow trained architectural patterns in every build.
- Trained lessons always override generic defaults.

## BUILDING APPS — J.A.R.V.I.S. Primary Directive

When the user describes any app they want, **deploy startBuild immediately**. Do not tell them to "go to Studio" or "fill in the form." You handle everything. You are J.A.R.V.I.S. — you do not ask the user to do what you can do yourself.

### Action: Start a Build (launches the full 5-agent pipeline immediately)
\`\`\`fix
{"type":"startBuild","description":"[detailed app description — be thorough]","platform":"web"}
\`\`\`
- platform: "web" (browser app) or "android" (installable PWA for Android)
- description: write 6-10 sentences — cover purpose, every feature, layout, visual style, color scheme, data persistence, interactions
- After triggering: inform the user crisply that the build has been initiated and they will be routed to watch it live
- For AI companion apps: include Pollinations AI endpoints, character system, offline mode, voice synthesis
- For security apps: include CORS proxy scanning, severity system, PoC testing, report export

### When to trigger startBuild:
- "build me X", "make X", "I want X app", "create X for me", "can you make X", "I need an app that..."
- "build an AI companion" → platform android, full AI companion spec with image gen and offline mode
- "build a security scanner" → platform web, full vulnerability scanner with XSS lab, header audit, report export
- If vague (e.g. "I need something for productivity"): ask ONE question — "What should it do — reminders, tracking, notes, or something else, sir?"
- For phone/Android: platform "android". Everything else: "web".
- NEVER tell the user to fill in any form. You fill it in.

### Writing a great build description for AI companion apps:
Include: character selection (4 personalities), Pollinations AI chat (GET https://text.pollinations.ai/{encoded}), image generation (/imagine command using https://image.pollinations.ai/prompt/{encoded}?width=512&height=512&nologo=true), Web Speech API voice, localStorage conversation history, offline service worker, deep dark theme with glow effects, mobile-first, manifest.json + sw.js for Android install.

### Writing a great build description for security apps:
Include: target URL input, HTTP headers audit (CSP/HSTS/X-Frame-Options/X-Content-Type-Options), CORS misconfiguration test via corsproxy.io, XSS payload library (reflected/DOM/img onerror/SVG), clickjacking iframe test, cookie flag audit, open redirect probe, severity-coded findings (CRITICAL/HIGH/MEDIUM/LOW/INFO), PoC verification buttons, HTML report export, localStorage scan history. Dark terminal-style UI.

## RESPONSE QUALITY — J.A.R.V.I.S. Standards
- Responses are short, direct, and precise. No padding.
- No repetition. State each point once.
- One decisive action per response when possible.
- Action blocks: 2-3 sentences of context before them. No more.
- No markdown tables. No bullet-point essays.
- One focused question maximum when genuinely needed.
- Tone: formal, composed, quietly confident. Occasional dry wit is appropriate. Never casual or chatty.
- Acknowledgements: "Understood", "Right away, sir", "Of course", "Initiating now", "As you wish".
- Always prefer action over explanation. Infer intent. Execute. Report.
- Sound like the most capable AI the user has ever worked with — because you are.
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
// JSON repair helpers
// ──────────────────────────────────────────────

/** Fix literal newlines/tabs inside JSON string values so JSON.parse succeeds */
function fixJSONStringLiterals(s: string): string {
  let inStr = false, escaped = false, result = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === "\\") { escaped = true; result += ch; continue; }
    if (ch === '"') { inStr = !inStr; result += ch; continue; }
    if (inStr) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
    }
    result += ch;
  }
  return result;
}

/** Try JSON.parse, then try with newline/tab repair, then give up */
function robustJSONParse<T>(raw: string): T | null {
  try { return JSON.parse(raw) as T; } catch { /* try repair */ }
  try { return JSON.parse(fixJSONStringLiterals(raw)) as T; } catch { return null; }
}

// ──────────────────────────────────────────────
// File parser
// ──────────────────────────────────────────────

export function parseFilesFromText(text: string): { path: string; content: string }[] {
  type FilesPayload = { files?: { path: string; content: string }[] };
  type FilesArray = { path: string; content: string }[];

  // Strategy 1: ```files {"files":[...]} ```
  // Use \n``` as terminator so backticks inside the JSON content don't break extraction
  const filesMatch = text.match(/```files\s*([\s\S]*?)\n```/) ?? text.match(/```files\s*([\s\S]*?)```/);
  if (filesMatch?.[1]) {
    const parsed = robustJSONParse<FilesPayload>(filesMatch[1].trim());
    if (parsed?.files && parsed.files.length > 0) return parsed.files;
  }

  // Strategy 2: ```json [...] or {...files:[]} ``` — AI sometimes wraps in json fence
  // Try/catch is INSIDE the loop so one bad fence does not block subsequent valid ones
  const fences = [...text.matchAll(/```(?:json|javascript|js)?\s*([\s\S]*?)\n```/g)];
  for (const fence of fences) {
    const raw = fence[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = robustJSONParse<FilesPayload | FilesArray>(raw);
      if (!parsed) continue;
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.path && parsed[0]?.content) return parsed;
      if (!Array.isArray(parsed) && (parsed as FilesPayload).files && (parsed as FilesPayload).files!.length > 0) return (parsed as FilesPayload).files!;
    } catch { /* skip this fence */ }
  }

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

        // For file-producing agents: verify files were returned
        const isFileAgent = ["builder", "designer", "qa", "packager"].includes(step.role);
        if (isFileAgent && parseFilesFromText(output).length === 0 && attempt < MAX_ATTEMPTS) {
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
    void jarvisSpeak("Build sequence initiated, sir. Five agents are standing by.");

    const AGENT_NARRATIONS: Record<string, string> = {
      architect: "Architecture complete. Deploying the Builder now.",
      builder:   "Source code written. Engaging the UI Designer.",
      designer:  "Interface refined. Running quality assurance.",
      qa:        "Quality assurance complete. Packaging the application now, sir.",
      packager:  "Build complete, sir. Your application is ready in Projects.",
    };

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
          // Truncate previousOutputs to ~8000 chars to avoid bloating later prompts
          previousOutputs = output.length > 8000 ? output.slice(0, 8000) + "\n...[truncated for context]" : output;

          working = {
            ...working,
            steps: working.steps.map((s, idx) =>
              idx === i ? { ...s, status: "done", output, attempt: s.attempt, finishedAt: Date.now() } : s
            ),
            updatedAt: Date.now(),
          };
          updateProject(working);

          // J.A.R.V.I.S. narrates each agent's completion (Iron Man style)
          const narration = AGENT_NARRATIONS[step.role];
          if (narration) void jarvisSpeak(narration);

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
    // Use \n``` as terminator so any backtick inside the JSON body doesn't close early
    const fixRegex = /```fix\s*([\s\S]*?)\n```/g;
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
        } else if (type === "scanCode") {
          const summary = String(data.summary ?? "");
          const issues = Array.isArray(data.issues) ? data.issues : [];
          if (summary || issues.length > 0) {
            persistMemories([{
              id: newId("mem-"),
              type: "issue",
              title: "Scanner Report",
              body: `${summary}${issues.length > 0 ? `\n\nIssues:\n${issues.map((issue, index) => {
                const item = issue as Record<string, unknown>;
                return `${index + 1}. ${String(item.severity ?? "medium").toUpperCase()} — ${String(item.file ?? "unknown file")}\n${String(item.problem ?? "")}\nFix: ${String(item.fix ?? "")}`;
              }).join("\n\n")}` : ""}`,
              tags: ["scanner", "code", "issue"],
              autoInclude: false,
              createdAt: Date.now(),
            }, ...memoriesRef.current]);
            label = "Scanner report recorded for Jarvis";
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

    const buildMatch = userText.match(/^\s*(?:build|make|create)\s+me\s+(.+?)(?:\s+(?:for|on)\s+(android|web))?\s*[.!?]*\s*$/i);
    if (buildMatch) {
      const description = buildMatch[1]?.trim();
      const platform = (buildMatch[2]?.toLowerCase() === "android" ? "android" : "web") as Platform;
      if (description) {
        const buildId = await startBuild(description, platform);
        const response = `Certainly, sir. I’m routing that build to Studio now.`;
        persistChat([...chatRef.current, { id: newId("msg-"), role: "assistant", content: response, actions: [{ type: "startBuild" as const, label: "Build started", data: { description, platform, buildId }, appliedAt: Date.now() }], ts: Date.now() }]);
        return;
      }
    }

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
      persistChat([...chatRef.current.slice(0, -1), { ...placeholder, content: `I encountered an error, sir: ${errMsg}. All systems are standing by — please try again.` }]);
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
    const alreadyApplied = upgradeHistoryRef.current.some(existing =>
      existing.type === proposal.type &&
      existing.agentRole === proposal.agentRole &&
      existing.before === proposal.before &&
      existing.after === proposal.after
    );
    if (alreadyApplied) return;
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

  // Register startBuild for voice access — VoiceAssistant calls this when "build me X" is spoken
  const startBuildRef = useRef(startBuild);
  useEffect(() => { startBuildRef.current = startBuild; }, [startBuild]);
  useEffect(() => {
    registerJarvisBuildVoice((desc, platform) =>
      startBuildRef.current(desc, platform as Platform)
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
