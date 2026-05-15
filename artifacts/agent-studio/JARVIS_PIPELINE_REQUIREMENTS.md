# Jarvis Builder Pipeline Requirements

This document locks the intended Agent Studio behavior into the repo so future builders do not drift back into the wrong architecture.

## Platform Direction

Agent Studio Builder is a React/Vite web app with a native-feeling mobile interface. It is not an Expo app. Android delivery should be handled as an installable PWA first and optionally Capacitor later.

## Builder Chat Uploads

Every builder-facing chat must support file upload. Uploads may include source files, screenshots, project assets, JSON configs, and zip packages. Files should become part of Jarvis/build context instead of being trapped in only one screen.

## Repair / Fix / Upgrade Section

The Repair section is separate from new app building. It is for taking an existing app/source package, uploading it, analyzing it, and producing repairs, fixes, optimizations, enhancements, or upgrades.

Repair work may include:

- bug repair
- UI repair
- missing button repair
- mobile layout repair
- performance optimization
- security improvement
- Android/PWA improvement
- feature enhancement
- professional design polish

## Approval Installer Rule

Analyze freely. Recommend freely. Train freely. But self-upgrades require John approval before installation.

Required flow:

1. Jarvis or a builder proposes a repair, optimization, enhancement, or new feature.
2. The proposal shows category, reason, affected files/features, risk level, expected result, and rollback note.
3. John approves or rejects it.
4. Approval automatically triggers the built-in installer.
5. The installer applies the approved change immediately to the workspace.
6. The installer reports success/failure, changed areas, and rollback option.
7. Memory Bank records the result.

Approval is the trigger. The user should not need to manually copy files or hunt for where to apply the change.

## Jarvis Conversation and Voice

Jarvis is not a command bot. Jarvis is the conversational brain of Agent Studio.

Jarvis should sound like a natural personal assistant with a Jarvis-style personality:

- calm
- capable
- loyal
- intelligent
- lightly witty
- male European/British-style voice when available
- natural pacing
- free-flowing conversation
- conversational memory
- can discuss, brainstorm, and explain before taking action

Jarvis should support conversation mode and action mode. John should be able to talk naturally, not only issue commands.

Examples Jarvis must understand naturally:

- This page feels wrong. What do you think?
- Can you fix that ugly button?
- I do not like how this chat works.
- Look at this app and tell me what is broken.
- Make this feel more professional.
- Remember this fix because it worked.
- Add upload to all builder chats.

When a request becomes a self-upgrade, Jarvis must prepare a proposal first and wait for approval before the installer runs.

## Training and Memory Bank

The app must automatically learn from project work. The Memory Bank should save:

- problems found
- fixes that worked
- fixes that failed
- approved upgrades
- rejected upgrades
- successful enhancements
- UI repair patterns
- mobile design lessons
- Android/PWA lessons
- coding mistakes to avoid

Training should teach builders Android, web app, PWA, Capacitor-style packaging, UI/UX, accessibility, security, performance, backend/frontend architecture, and repair patterns.
