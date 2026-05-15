# Self Analyze, Training School, Automatic Memory Bank, Constraints, Asset Generator, Paid Access, and Legal Gate Spec

This spec defines the next working upgrade for Agent Studio Builder.

## Legal note

This app needs real legal review before public distribution. The app should include strong standard protections, but final Terms, Privacy Policy, copyright/IP language, payment language, and acceptable-use language should be reviewed by a qualified attorney before launch.

## First-Launch Legal Agreement Gate

When a regular user opens the app for the first time, the app should show a legal agreement gate before they can build, repair, generate assets, or pay.

The screen should include:

- short plain-English summary
- checkbox: "I agree to the Terms of Service, Privacy Policy, Acceptable Use Policy, Payment Terms, and Copyright/IP Terms"
- disabled Continue button until checked
- links/buttons to open the full fine print
- saved agreement timestamp/version
- ability to re-show agreement when terms are updated

The fine print should be readable inside the app in a mobile-friendly legal viewer.

Legal documents/sections should include:

- Terms of Service
- Privacy Policy
- Acceptable Use Policy
- Payment/Refund Terms
- Copyright and Intellectual Property Terms
- Generated Content Disclaimer
- User Responsibility Disclaimer
- AI Output Disclaimer
- No Warranty / Limitation of Liability
- Pro/Standard tier limits
- Constraints and safety policy
- DMCA/copyright contact placeholder
- Data retention/deletion language

Regular users must agree before using the app. Owner/admin can bypass for development, but the owner should still be able to preview the user agreement flow.

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

## Owner/Admin Access

John is the owner/admin. Owner/admin access should have the full builder system available:

- Self Analyze & Upgrade
- Approval Installer
- Repair / Fix / Upgrade
- Training School
- Automatic Memory Bank controls
- Constraints controls
- Asset Generator
- provider settings
- deep system upgrades
- builder prompt upgrades

Regular users must not see or use owner-only system improvement tools such as Self Analyze & Upgrade, builder prompt upgrades, deep system training controls, or internal installer controls.

## Paid Access and User Tiers

Add a payment/tier model for regular users.

Suggested tiers:

### Owner/Admin

For John only. Full access. No app-build charge.

### Standard User

Suggested price: **$20 per app**.

Standard users can build normal apps but have more constraints enabled. They cannot use owner-only screens. They cannot generate unfiltered apps or turn off higher-level content constraints.

### Pro / No-Extra-Constraints User

Suggested price: **$30 per app**.

Pro users get fewer optional constraints and more creative freedom. Legal and safety guardrails still remain. Pro does not mean illegal or harmful content is allowed.

Pro users may access mature/unfiltered creative mode where allowed by law and platform rules, but they still cannot generate clearly harmful or illegal apps.

## User Visibility Rules

Regular users should not see:

- Self Analyze & Upgrade screen
- builder prompt internals
- deep system upgrade controls
- owner training controls
- app-wide memory bank internals
- installer internals beyond their own app job status
- provider/admin keys
- unrestricted constraints settings

Regular users may see:

- build form
- repair/upload flow if allowed by tier
- their own app projects
- payment screen
- limited constraints popup
- asset generator if allowed by tier
- status of their own build

## Builder Freedom and Constraints

Agent Studio should not be overly filtered for normal creative, personal, adult, experimental, fictional, or private app ideas. The builder should try to build what John asks for instead of refusing just because an idea is unusual, mature, edgy, or not a standard business app.

Default owner/admin behavior should be permissive for legitimate apps, including unfiltered-style apps, mature-themed apps, creative tools, personal companion apps, offline tools, and private-use apps.

For regular users, constraints depend on tier:

- Standard users: more constraints enabled by default.
- Pro users: fewer optional constraints enabled.
- Owner/admin: full control over optional constraints.

However, all tiers still need basic hard guardrails for clearly harmful or illegal requests, such as malware, credential theft, stalking, exploitation, instructions for real-world violence, child sexual content, or other abusive systems. If a request crosses that line, Jarvis should redirect toward a safe version of the app rather than silently building something dangerous.

The goal is: build broadly, do not over-censor normal app ideas, but do not become a tool for harm.

## Constraints Page

Add a dedicated **Constraints** page where John can check and uncheck build rules.

Most optional owner/admin constraints should default to OFF. John should decide which constraints apply. The page should support saving global defaults and also changing constraints per project.

Constraint examples:

- family-safe mode
- adult/mature mode allowed
- unfiltered creative mode
- offline-first required
- no cloud dependency
- no paid APIs
- Pollinations default
- OpenAI optional only
- no Expo
- PWA Android target
- Capacitor allowed later
- security hardening required
- performance priority
- accessibility priority
- minimal dependencies
- allow internet research
- allow downloads with approval
- require approval before installer changes
- strict code quality
- fast build mode
- deep build mode
- time-consuming upgrades allowed
- time-consuming upgrades require extra warning

The Constraints page should be clear and mobile-friendly, with large checkbox rows and short explanations.

## Pre-Build / Pre-Repair Constraints Popup

Before starting a new build, Agent Studio should show a constraints popup. Before repairing or upgrading an uploaded app, the same constraints popup should appear.

The popup should let John:

- review active constraints
- check or uncheck constraints for this specific job
- add extra custom instructions
- remove constraints from an uploaded app repair job
- choose whether constraints apply only once or become global defaults
- continue build/repair after confirming

For regular users, the popup should show only the constraints they are allowed to control under their tier. Locked constraints should be visible only if helpful, with a clear upgrade/paywall message.

This popup should not be annoying or complex. It should be fast: review, check/uncheck, continue.

If John has already set global defaults, the popup should pre-fill those defaults but still allow quick edits.

## Payment Flow

Before a regular user starts a paid build, the app should show pricing clearly:

- Standard build: $20 per app
- Pro / fewer optional constraints: $30 per app

The system should explain what each tier includes before payment.

Payment confirmation should unlock that specific build job. The paid job should store tier, constraints, project ID, payment status, and build status.

## Asset Generator

Add an **Asset Generator** page/section for creating media that can be used inside apps built by Agent Studio.

The Asset Generator should help John create:

- app icons
- launcher icons
- splash images
- logos
- screenshots
- UI mockup images
- background images
- character images
- product images
- placeholders
- thumbnails
- short videos
- intro clips
- demo clips
- loading animations
- media packs for a specific project

The goal is to let John fill in his generated apps with usable pictures and videos instead of leaving apps empty or placeholder-heavy.

Asset Generator behavior:

- Works from a prompt or from a selected project/app context.
- Can generate app-specific icons and images that match the app style.
- Can create multiple size variants for icons and UI images.
- Can save generated assets into a project asset folder or media library.
- Can attach generated assets to a build or repair job.
- Can let builders request needed assets during build planning.
- Can use Pollinations or other free providers by default when possible.
- Can support optional premium providers if John adds keys later.
- Should clearly label generated assets and where they are used.
- Should be mobile-friendly on Samsung Galaxy S20 FE 5G.

For regular users, Asset Generator access may depend on tier. Standard users may get limited asset generation. Pro users may get more asset freedom. Owner/admin gets full access.

Video generation should be treated as provider-dependent. If a free provider is unavailable, the app should still support saving video prompts, storyboard frames, animation plans, or placeholder video assets until a real video provider is configured.

When a build needs images or videos, Jarvis should ask whether to generate assets, use placeholders, or continue without media.

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
- asset/media generator upgrades
- payment/tier/access upgrades
- legal agreement and privacy upgrades

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
- icon/image/video generation workflows
- asset packaging for generated apps
- payment/tier/access control behavior
- terms/privacy/copyright/legal agreement behavior

John should be able to add more lessons later, almost like teaching his own AI. The app should support personal training lessons so John can teach his builder system new solutions, preferences, coding rules, app strategies, and design rules.

## Goal

The goal is to make Agent Studio more than a static app builder. It should become a learning builder system that improves over time, remembers solved problems, avoids repeating mistakes, and can grow into a more capable personal app-building platform for John.
