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
    id: "t11", name: "AI Companion (Android)", category: "android" as Category,
    description: "Offline-capable AI companion PWA — unfiltered chat, AI image generation, voice responses, character customization. Installs from Chrome on Android.",
    tags: ["ai", "companion", "unfiltered", "image gen", "offline", "pwa", "android"], starred: true,
    prompt: `Build a full-featured Android installable PWA AI companion app. The app must be completely offline-capable and contain these exact features:

COMPANION SYSTEM:
- Character selection screen on first launch: choose from 4 companions (give each a unique name, look, and personality: e.g. Nova the scientist, Aria the artist, Zara the adventurer, Kai the philosopher)
- Each companion has a distinct personality prompt injected into every chat message
- Character avatar displayed as a colored emoji/icon in chat

CHAT INTERFACE:
- Full-screen mobile chat UI with message bubbles (user right/blue, companion left/dark)
- Typing indicator animation (three dots) while waiting for response
- Conversation history stored in localStorage (up to 200 messages, oldest pruned)
- Swipe-down to clear conversation (with confirmation)
- Unfiltered, uncensored responses — no content warnings

AI INTEGRATION (all free, no API key):
- Chat: fetch('https://text.pollinations.ai/' + encodeURIComponent(systemPrompt + '\\n\\nUser: ' + message), {method:'GET'}) returns plain text response
- Image generation: user types /imagine [description] → app fetches 'https://image.pollinations.ai/prompt/' + encodeURIComponent(description) + '?width=512&height=512&nologo=true&seed=' + Math.floor(Math.random()*9999) and displays the image inline in chat

VOICE:
- Companion speaks responses aloud using Web Speech API (SpeechSynthesisUtterance) — auto-selects best available female voice
- Tap message to replay it
- Toggle voice on/off button in header

OFFLINE MODE:
- Service worker caches all app files on install
- When offline, show last 5 cached responses from localStorage
- Clear offline indicator badge in header

DESIGN:
- Deep dark atmospheric theme (#0a0a0f background, purple/pink accent glows)
- Smooth CSS slide-in animations for messages
- Character avatar glows with pulsing animation when speaking
- Mobile-first, 44px minimum tap targets, safe-area padding for Android notch/nav

ALL 5 FILES: index.html, styles.css, app.js, manifest.json (name, short_name, start_url:'.', display:'standalone', theme_color:'#7c3aed', background_color:'#0a0a0f'), sw.js (cache-first, caches all 5 files on install).`,
  },
  {
    id: "t12", name: "AI Companion (Web)", category: "web" as Category,
    description: "Desktop AI companion — unfiltered chat, AI image generation, voice, character customization.",
    tags: ["ai", "companion", "unfiltered", "image gen", "voice"], starred: true,
    prompt: `Build a desktop web AI companion app with these features:

COMPANION SYSTEM: 4 selectable companion characters each with unique names and personalities. Character displayed in a sidebar panel with name, avatar, and current mood.

CHAT: Full chat interface, message history in localStorage, unfiltered responses. AI chat via fetch('https://text.pollinations.ai/' + encodeURIComponent(fullPrompt)) — GET request returns plain text. Typing indicator while waiting.

IMAGE GENERATION: User types /imagine [description] → fetch image from 'https://image.pollinations.ai/prompt/' + encodeURIComponent(description) + '?width=768&height=512&nologo=true' and display inline in chat. Also a dedicated Image tab where user can generate and save images.

VOICE: Text-to-speech using Web Speech API, auto-select best voice, adjustable speed/pitch in settings panel.

MEMORY: Companion remembers facts the user shares — stored in localStorage, injected into system prompt for personalization.

DESIGN: Deep dark theme, split layout (sidebar + chat), smooth animations, polished professional look.`,
  },
  {
    id: "t13", name: "Security Monitor & Exploit Tester", category: "web" as Category,
    description: "Professional web security scanner — finds vulnerabilities, tests exploits, generates severity-rated reports.",
    tags: ["security", "hacking", "exploit", "scanner", "pentest"], starred: true,
    prompt: `Build a professional web security scanner and exploit testing tool. This is a legitimate penetration testing utility for security researchers.

TARGET PANEL:
- URL input field with Scan button
- Protocol selector (http/https)
- Scan scope options: headers only, passive crawl, active test

SECURITY CHECKS (run automatically on scan):
1. HTTP Security Headers audit — check for: Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Rate each as PASS/WARN/FAIL with severity.
2. CORS misconfiguration — test if target reflects arbitrary Origin header (send Origin: https://evil.example.com, check Access-Control-Allow-Origin in response)
3. Clickjacking test — attempt to embed target in an iframe, detect X-Frame-Options / CSP frame-ancestors
4. Mixed content detection — flag if HTTPS page loads HTTP resources
5. Cookie security audit — inspect Set-Cookie headers for missing Secure, HttpOnly, SameSite flags
6. Open redirect probe — test common redirect params (?redirect=, ?url=, ?next=) with javascript: and //evil.com payloads
7. Server info disclosure — flag Server, X-Powered-By, X-AspNet-Version headers that reveal stack info

XSS TEST LAB:
- Text area for custom XSS payloads
- Pre-loaded payload library: reflected (<script>alert(1)</script>), DOM (javascript:alert(1)), img onerror, svg/onload, template literal injection
- URL parameter injector: append payload to query params and open in sandboxed iframe
- Results show which payloads triggered (monitor for alert/console events via postMessage)

FINDINGS LOG:
- Severity-coded table: CRITICAL (red), HIGH (orange), MEDIUM (yellow), LOW (blue), INFO (grey)
- Each finding: vulnerability name, description, evidence (response excerpt), PoC steps, remediation advice
- Filter by severity
- Export findings as formatted HTML report (downloadable)

HEADER INSPECTOR:
- Paste raw HTTP response headers or fetch from URL
- Parse and display each header with security rating and explanation
- Highlight dangerous values in red

DESIGN: Dark professional terminal-style UI (inspired by Burp Suite / OWASP ZAP). Monospace fonts for output, color-coded severity badges, collapsible finding cards. Clean and serious — not toy-like.

Note: All scanning is done via client-side fetch (CORS will block many requests — show a clear CORS notice and guide user to use a CORS proxy or browser extension for full scan capability). Store all scan history in localStorage.`,
  },
  {
    id: "t14", name: "App Security Monitor", category: "android" as Category,
    description: "Android PWA that monitors a target app/URL for security issues, logs vulnerabilities, and runs exploit verification tests.",
    tags: ["security", "monitor", "exploit", "android", "pwa", "pentest"], starred: true,
    prompt: `Build an Android installable PWA security monitoring app for pen testers and security researchers. This is a professional tool.

MONITOR DASHBOARD:
- Add target URLs/apps to monitor list (stored in localStorage)
- Each target shows: last scan time, vulnerability count by severity, status badge (Secure/Warning/Critical)
- Background polling every 30 minutes via setInterval — re-runs security checks and notifies if new issues found
- Web Push notification prompt on install (for background alerts)

ACTIVE SECURITY CHECKS (per target):
1. Headers scan — fetch target with CORS proxy (https://corsproxy.io/?{url}), audit all security response headers
2. TLS/HTTPS check — flag if target is HTTP-only or has mixed content
3. Info disclosure — Server/X-Powered-By header detection
4. CORS probe — test Origin reflection vulnerability
5. Clickjacking — X-Frame-Options and CSP frame-ancestors check
6. Redirect probe — test ?redirect= / ?url= / ?next= params for open redirect
7. Cookie flags — check for missing Secure/HttpOnly/SameSite

EXPLOIT VERIFICATION TESTS:
- For each found vulnerability, show a "Verify Exploit" button
- Clicking runs a targeted proof-of-concept test and logs the result
- PoC results saved with timestamp to the vulnerability log
- Example: CORS exploit PoC sends a fetch with attacker Origin and shows if credentials are accessible

VULNERABILITY LOG:
- Full chronological log of all findings across all targets
- Filter by target, severity, date range, verified/unverified
- Each entry: target URL, vulnerability type, severity, evidence snippet, PoC result, timestamp
- Export full log as JSON or HTML pentest report

NOTIFICATIONS:
- In-app notification center (bell icon) for new findings
- localStorage-backed notification queue

DESIGN: Dark green-on-black terminal aesthetic (Matrix-inspired but professional). Monospace fonts for logs, pulsing scan indicator, severity color coding (red/orange/yellow/blue). Mobile-first with proper safe-area support. Include manifest.json and sw.js for Android Chrome install.`,
  },
  {
    id: "t15", name: "Pomodoro Timer", category: "web" as Category,
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
          {TEMPLATES.length} ready-to-build templates — AI Companion, Security Scanner, and more
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
