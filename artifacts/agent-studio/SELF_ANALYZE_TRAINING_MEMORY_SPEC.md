# Self Analyze, Training School, and Automatic Memory Bank Spec

This spec defines the next working upgrade for Agent Studio Builder.

## Self Analyze & Upgrade

The main self-improvement action should be named **Self Analyze & Upgrade**.

It must do a high-critique inspection of the current Agent Studio system before suggesting upgrades. It checks the internal system first:

- current app architecture
- agent prompts
- builder pipeline
- failed builds
- repeated bugs
- UI problems
- upload flow
- Repair / Fix / Upgrade flow
- installer behavior
- Jarvis voice and conversation behavior
- memory bank quality
- training progress
- Android/PWA readiness
- security gaps
- performance gaps
- missing features

It should not always use external sources. The system should use internal memory, training, current app state, and known solutions first. Outside research should only be used when current best practices are needed, a solution is missing, or John approves web research.

## Upgrade Types

Self Analyze & Upgrade proposals may include:

- repairs
- optimizations
- enhancements
- new features
- security upgrades
- feature upgrades
- performance upgrades
- UI/design upgrades
- builder training upgrades
- time-consuming upgrades
- deep system upgrades

Time-consuming and deep upgrades must be clearly labeled before approval. They should explain why they take longer, what they touch, and what could go wrong.

## Approval Installer

Nothing installs silently.

Flow:

1. Jarvis/builders analyze the system.
2. They produce proposals with category, reason, risk, effort, affected areas, expected result, and rollback note.
3. John approves or rejects each proposal.
4. Approval automatically triggers the built-in installer.
5. Installer applies the approved upgrade.
6. Installer reports success/failure and changed areas.
7. Memory Bank automatically records the result.

Approval is the trigger. The user should not need to manually copy files, hunt for code locations, or run extra commands inside the app.

## Automatic Memory Bank

The Memory Bank is primarily system-created, not user-created. John can add/edit memories if he wants, but Jarvis and builders should create useful memories automatically from real work.

A memory should usually include:

- problem
- solution
- result
- involved app/feature/file/person/agent
- what to do next time
- what to avoid next time

The Memory Bank UI should use small clickable memory bubbles/chips. Bubbles should group memories by involved subject:

- app name
- feature
- file
- repair type
- platform
- agent
- person
- tag

Clicking a memory bubble should pull related memories into Jarvis/build context so the AI can work faster and already know past solutions.

## No Duplicate Memories

The system must prevent double memories.

Before saving a new automatic memory, compare:

- title
- body
- tags
- involved subjects
- normalized text
- problem/solution/result similarity

If an equivalent memory exists, update or merge the existing memory instead of creating a duplicate.

## Training School

The Training section should act like a school for the builder AI.

Training lessons should be clickable. When John clicks a lesson, the AI learns it and saves the learning into the automatic Memory Bank. Future Jarvis and builder prompts should be able to refer back to trained lessons.

Training should cover:

- Android app capabilities
- web app capabilities
- PWA behavior
- Capacitor-style Android packaging
- UI/UX design
- accessibility
- security
- performance
- frontend structure
- backend structure
- repair patterns
- common coding mistakes
- successful solutions from this project
- updated best practices when approved

John should be able to add more lessons later, almost like teaching his own AI. The app should support personal training lessons so John can teach his builder system new solutions, preferences, coding rules, app strategies, and design rules.

## Goal

The goal is to make Agent Studio more than a static app builder. It should become a learning builder system that improves over time, remembers solved problems, avoids repeating mistakes, and can grow into a more capable personal app-building platform for John.
