# harness-dev

> Spec-driven feature development workflow for frontend projects. Runs the full pipeline: specify → plan → tasks → implement → archive.

## What it does

`harness-dev` takes a natural language feature description and orchestrates an 8-step workflow: it writes the spec, generates a technical plan with constitution compliance checks, breaks down tasks in TDD order, implements them phase by phase with build validation, and finally archives learnings back to the knowledge base with selective promotion — only genuinely reusable insights get persisted, not everything.

Each step has a checkpoint that pauses for user confirmation before proceeding. The archive step distinguishes between feature-specific details (stays in `archive.md`) and generalizable patterns (promoted to `knowledge/constitution.md` or a named topic file).

## Prerequisites

Run `/harness-init` once per project first. `knowledge/.scripts/` must exist.

## Installation

```bash
npx skills add https://github.com/deweyou/skills --skill harness-dev
```

## Usage

```
/harness-dev <feature description>
```

Example:

```
/harness-dev add dark mode toggle to the settings panel
```

## Full workflow

```
/harness-dev <description>
      │
      ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 1 — Create feature directory                           │
│  Runs: create-new-feature.sh --number YYYYMMDD               │
│  Creates: knowledge/specs/YYYYMMDD-feature-name/             │
│  Creates: git branch YYYYMMDD-feature-name                   │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 2 — Specify                              [Checkpoint 1]│
│  Reads CLAUDE.md → loads project context                     │
│  Writes spec.md:                                             │
│    • User stories with priorities (P1/P2/P3)                 │
│    • Functional requirements (FR-001, FR-002 …)              │
│    • Success criteria (SC-001, SC-002 …)                     │
│    • NEEDS CLARIFICATION items flagged                       │
└─────────────────────────────┬────────────────────────────────┘
                              │  user confirms scope
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 3 — Clarify (optional)                                 │
│  Up to 5 targeted questions on underspecified areas          │
│  Answers encoded back into spec.md                           │
│  Reply "skip" to go straight to planning                     │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 4 — Plan                                 [Checkpoint 2]│
│  Runs: setup-plan.sh                                         │
│  Writes plan.md:                                             │
│    • Technical context (language, framework, build tools)    │
│    • Constitution compliance check (pass/fail per principle) │
│    • Project structure (files to create/modify)              │
└─────────────────────────────┬────────────────────────────────┘
                              │  user confirms architecture
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 5 — Tasks                                [Checkpoint 3]│
│  Runs: check-prerequisites.sh                                │
│  Writes tasks.md:                                            │
│    • Organized by phase (Setup → Foundation → Stories →      │
│      Polish)                                                 │
│    • TDD order: tests written before implementation          │
│    • Parallel tasks marked [P]                               │
│    • Cross-artifact consistency check (every FR has a task)  │
└─────────────────────────────┬────────────────────────────────┘
                              │  user confirms task list
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 6 — Implement                            [Checkpoint 4]│
│  Reads: tasks.md + plan.md (required)                        │
│         research.md, data-model.md, contracts/ (if present)  │
│  Execute phase by phase:                                     │
│    • Write failing tests first (TDD)                         │
│    • Implement to pass tests                                 │
│    • Mark tasks [x] as completed                             │
│    • Run build/lint/type-check after each phase              │
│    • Fix failures before moving to next phase                │
└─────────────────────────────┬────────────────────────────────┘
                              │  all tasks complete, build passing
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 7 — Checklist                            [Checkpoint 5]│
│  Copies checklist-template.md                                │
│  Generates customized review.md for this feature             │
│  Includes constitution compliance section (always required)  │
└─────────────────────────────┬────────────────────────────────┘
                              │  user replies "archive"
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 8 — Archive                                            │
│  See: Selective knowledge promotion below                    │
└──────────────────────────────────────────────────────────────┘
```

## Selective knowledge promotion

The archive step applies a judgment filter to each finding before writing anything to `knowledge/`:

```
For each finding in archive.md:
      │
      ▼
  Would this still be useful in 3 months?
  Could it help a future feature make a better decision?
      │
      ├── YES ──→  Is it a reusable pattern / design rule / API convention?
      │                  │
      │                  ├── YES ──→  Create knowledge/<topic>.md
      │                  │            Add pointer to CLAUDE.md
      │                  │            Append summary to constitution.md Section VII
      │                  │
      │                  └── NO ───→  Append to constitution.md Section VII only
      │                               (principle update / architecture clarification)
      │
      └── NO ───→  Stay in archive.md only
                   (feature-specific detail / one-off workaround)
```

This keeps `knowledge/` signal-dense. Feature-specific details never pollute the shared knowledge base.

## Output per feature

```
knowledge/specs/YYYYMMDD-feature-name/
├── spec.md          ← user stories, FRs, success criteria
├── plan.md          ← architecture, constitution compliance
├── tasks.md         ← implementation checklist (all [x] when done)
├── checklist/
│   └── review.md    ← customized review checklist
└── archive.md       ← delivery summary, decisions, pitfalls, patterns

knowledge/constitution.md       ← Section VII appended after each feature
knowledge/<topic>.md            ← created on demand (promoted patterns only)
CLAUDE.md                       ← pointer added when a topic file is created
```

## Version

`1.0.0` — see [SKILL.md](./SKILL.md) for the full workflow specification.
