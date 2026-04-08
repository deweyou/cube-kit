# harness-init

> One-time setup skill that bootstraps the `harness-dev` environment in any frontend project.

## What it does

`harness-init` prepares a project for spec-driven feature development. It creates a `knowledge/` directory as a persistent knowledge base, installs the runtime scripts and templates that `harness-dev` depends on, guides you through building a project constitution interactively, and wires up CLAUDE.md as a lean content map that Claude reads at the start of every session.

Run it once per project. After that, use `/harness-dev` for every feature.

## When it triggers

- User says: `"init harness"`, `"setup harness-dev"`, `"initialize knowledge base"`
- User runs `/harness-init`
- `harness-dev` is about to run but `knowledge/.scripts/` does not exist

## Installation

```bash
npx skills add https://github.com/deweyou/skills --skill harness-init
```

## Setup flow

```
/harness-init
      │
      ▼
┌─────────────────────────────────────────────────────┐
│  Step 0 — Check existing state                      │
│  Is knowledge/ already present? → ask to re-init    │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Step 1 — Create directory structure                │
│                                                     │
│  knowledge/                                         │
│  ├── specs/          (harness-dev writes here)      │
│  └── .scripts/                                      │
│      ├── bash/       (runtime scripts)              │
│      └── templates/  (spec/plan/tasks templates)    │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Step 2 — Copy scripts & templates                  │
│  Source: .claude/skills/harness-init/references/    │
│  Destination: knowledge/.scripts/                   │
│                                                     │
│  Scripts: common.sh, check-prerequisites.sh,        │
│           create-new-feature.sh, setup-plan.sh,     │
│           update-agent-context.sh                   │
│  Templates: spec, plan, tasks, checklist, archive,  │
│             agent-file                              │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Step 3 — Interactive constitution setup            │
│  (7 questions, one at a time)                       │
│                                                     │
│  1. Project name                                    │
│  2. Project type (React / Next.js / Node / CLI ...) │
│  3. Primary goal (one sentence)                     │
│  4. Core tech stack                                 │
│  5. Test tool and command                           │
│  6. Build/check command                             │
│  7. Architecture boundaries (optional)              │
│                                                     │
│  → writes knowledge/constitution.md                 │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Step 4 — Update CLAUDE.md                          │
│  Adds "## Harness Development" section pointing to  │
│  constitution.md and specs/                         │
│  Creates CLAUDE.md if it does not exist             │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Step 5 — Configure .claude/settings.json           │
│  Adds PostToolUse hook that validates SKILL.md      │
│  frontmatter on every Write/Edit                    │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Step 6 — Summary                                   │
│  Reports what was created, asks whether to add      │
│  knowledge/.scripts/ to .gitignore                  │
└─────────────────────────────────────────────────────┘
```

## What gets created

```
knowledge/
├── constitution.md          ← project principles + accumulated learnings (Section VII)
├── specs/                   ← harness-dev creates one subdirectory per feature here
└── .scripts/
    ├── bash/
    │   ├── common.sh
    │   ├── check-prerequisites.sh
    │   ├── create-new-feature.sh
    │   ├── setup-plan.sh
    │   └── update-agent-context.sh
    └── templates/
        ├── spec-template.md
        ├── plan-template.md
        ├── tasks-template.md
        ├── checklist-template.md
        ├── archive-template.md
        └── agent-file-template.md

CLAUDE.md                    ← updated with Harness Development section
.claude/settings.json        ← PostToolUse hook added
```

Topic-specific knowledge files (e.g. `knowledge/design-tokens.md`) are **not** created at init time. They are added on demand by the archive step of `harness-dev` when a genuinely reusable pattern is discovered.

## constitution.md structure

The constitution is the single source of truth for project principles. It is only read when a harness-dev session starts — Claude uses it to validate plans and accumulate learnings over time.

```
I.    Project Identity
II.   Core Principles
III.  Technical Standards
IV.   Architecture Boundaries
V.    Testing Standards
VI.   Naming Conventions
VII.  Accumulated Learnings   ← auto-appended by harness-dev archive step
```

## Version

`1.0.0` — see [SKILL.md](./SKILL.md) for the full workflow specification.
