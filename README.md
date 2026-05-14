# Agent Studio

Build Web and Android apps in plain English - powered entirely by free AI. No API key required.

Agent Studio is a personal AI-powered app development platform. Describe what you want in natural language, and a five-agent pipeline writes, designs, tests, and packages your app. Comes with J.A.R.V.I.S. - a voice-activated AI assistant that talks back, searches the web, and can push code changes directly to your repo.

---

## Install on Android

1. Open Chrome on your phone
2. Navigate to your Replit deployment URL
3. Tap the three-dot menu and select Add to Home Screen
4. Agent Studio installs as a full-screen app - no Play Store needed

Optimised for Samsung Galaxy S20 FE 5G (6.5 inch FHD+, Android 13, Chrome).

---

## Features

### J.A.R.V.I.S. - Voice AI Assistant
- Always listening - hands-free mode or tap-to-speak
- Deep British male voice - auto-selects best available neural voice
- Wake word - say Hey Jarvis to activate
- Internet search - retrieves live web information before responding
- App control - navigate pages, trigger builds, manage memory by voice
- Code changes - ask Jarvis to add features, fix bugs, or modify files
- Offline queue - messages queued when offline, answered on reconnect

### Five-Agent Build Pipeline

Architect plans the app structure. Builder writes all source code. UI Designer enhances the interface. QA finds and fixes every bug. Packager delivers the final output.

### Web Apps
- Single self-contained index.html - runs in any browser
- Installable as Android PWA from Chrome
- No build tools, no bundler, no dependencies

### Android Apps - No Expo
- Kotlin plus Material 3 - native Android code
- APK output - sideload directly to your device
- No React Native, no Expo, no cross-platform compromise

### Memory Bank
- Persistent knowledge that injects into every future build
- Auto-created after each successful build
- autoInclude entries inject automatically into every prompt

### Self-Upgrade System
- Agents analyse their own prompts for inefficiencies
- Propose before/after improvements with impact ratings
- You review, approve, or skip each proposal
- Approved changes are permanently written into how the system operates

### System Analysis and Security Scanner
- Scans the codebase for security flaws and improvement areas
- Proposes targeted fixes with severity ratings: High, Medium, Low
- The platform can diagnose and improve itself

### Upload and Fix
- Upload an existing app (.html or .zip)
- Describe what to fix, improve, or add
- The rebuild pipeline analyses and rewrites it
- Download the improved version as a zip

---

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS 4, shadcn/ui, framer-motion
- Routing: wouter
- Backend: Express 5, TypeScript
- Database: PostgreSQL, Drizzle ORM
- AI Engine: Pollinations AI (free, no key needed) or Groq
- Voice Input: Web Speech API SpeechRecognition
- Voice Output: Web Speech API SpeechSynthesis - British male voice
- Package Manager: pnpm workspaces
- Node Version: 24

---

## Setup and Running

Install dependencies:
  pnpm install

Run the API server:
  pnpm --filter @workspace/api-server run dev

Run Agent Studio (set env vars first):
  export PORT=3000
  export BASE_PATH=/
  pnpm --filter @workspace/agent-studio run dev

Build everything:
  pnpm run build

---

## Configuration

All settings are in the Settings page inside the app.

- Groq API Key: Optional. Free at console.groq.com. Faster AI responses. Falls back to Pollinations if not set.
- GitHub Token: Personal access token for pushing built apps and Jarvis code changes.
- GitHub Repo: owner/repo format - where Jarvis pushes code changes.
- Voice Name: Override the auto-selected voice.
- Wake Word: Enable Hey Jarvis always-on listening.
- Web Research: Allow Jarvis to search the internet before responding.
- Self-Upgrading: Allow the system to propose prompt improvements.

---

## Talking to Jarvis

Say: Build me a todo app
Jarvis: Starts the 5-agent pipeline immediately

Say: Build me a fitness tracker for Android
Jarvis: Builds a native Kotlin Android app

Say: Take me to Projects
Jarvis: Navigates to the Projects page

Say: What is the weather today
Jarvis: Searches the web and answers

Say: Add a dark mode toggle to Settings
Jarvis: Modifies the file and pushes to GitHub

Say: Open mic / Hands free
Jarvis: Enables continuous always-on listening

Say: Hey Jarvis
Jarvis: Wake word - activates from idle

Say: Go to sleep Jarvis
Jarvis: Disables voice entirely

---

## App Output Formats

Web Apps: index.html - single self-contained file with inlined CSS and JS. Runs in any browser. Installable as Android PWA from Chrome.

Android Apps: Complete Kotlin project with MainActivity.kt, layouts, AndroidManifest.xml. Build with Android Studio or Gradle.

---

## Key Pages

- Dashboard: Overview, Self-Upgrade proposals, System Analysis scanner
- Studio: Describe your app, then the 5-agent build pipeline runs
- Projects: All built apps - preview, download ZIP, push to GitHub
- Assistant: Full J.A.R.V.I.S. chat with voice and text
- Rebuild: Upload an existing app to fix, improve, or extend
- Memory Bank: Persistent knowledge that shapes every build
- Training: 74 lessons across 19 modules
- Agents: View and configure each agent
- Library: 15 pre-built app templates
- Settings: API keys, voice config, system toggles, live source download
- Editor: Live code editor with syntax highlighting

---

## License

MIT - personal use.

Built for personal use. Powered by free AI - Pollinations AI requires no API key.
