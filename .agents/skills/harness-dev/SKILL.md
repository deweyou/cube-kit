---
name: harness-dev
description: "Spec-driven feature development workflow for frontend projects. Runs the full pipeline: specify → plan → tasks → implement → archive. Reads project constitution from knowledge/constitution.md and accumulates learnings after each feature. Use when the user says \"build feature X\", \"implement Y\", \"develop Z\", \"/harness-dev <description>\", or wants to start a new feature using the spec-driven workflow. Requires harness-init to have been run first."
version: 1.0.0
---

# Harness Dev

Spec-driven development workflow for frontend projects. Orchestrates the full pipeline from natural language description to implementation, then archives learnings back to the knowledge base.

## Prerequisites

`knowledge/.scripts/` must exist. If not, tell the user to run `/harness-init` first.

```bash
ls knowledge/.scripts/bash/create-new-feature.sh 2>/dev/null || echo "MISSING"
```

If MISSING:
> "Run `/harness-init` first to set up the harness-dev environment."
> Stop.

## Usage

```
/harness-dev <feature description>
```

---

## Workflow

Receive `$ARGUMENTS` as the feature description. Each step has a checkpoint — pause and wait for user confirmation before proceeding.

---

### Step 1 — Create feature directory

Run:
```bash
bash knowledge/.scripts/bash/create-new-feature.sh --json --number "$(date '+%Y%m%d')" "$ARGUMENTS"
```

Parse the JSON output to get `BRANCH_NAME`, `SPEC_FILE`, `FEATURE_NUM`.

The script:
- Creates a git branch named `YYYYMMDD-feature-name`
- Creates `knowledge/specs/YYYYMMDD-feature-name/` with a blank `spec.md` from template

Show the user:
```
Feature directory created: knowledge/specs/BRANCH_NAME/
Branch: BRANCH_NAME
```

---

### Step 2 — Specify

Read `CLAUDE.md` to load project context (it points to `knowledge/constitution.md` and other knowledge resources).

Fill in `knowledge/specs/BRANCH_NAME/spec.md` based on `$ARGUMENTS` and the constitution:
- Write user stories with acceptance criteria (P1, P2, P3...)
- Write functional requirements (FR-001, FR-002...)
- Write success criteria (SC-001, SC-002...)
After filling in spec.md, show the user a summary:
- Number of user stories and their priorities
- Key FRs
- Any NEEDS CLARIFICATION items found

**Checkpoint 1/5:**
> **Spec generated.**
> Please confirm: is the user story scope accurate? Anything missing or to cut?
> Reply "continue" or tell me what to adjust.

Wait for user confirmation before proceeding.

---

### Step 3 — Clarify (optional)

Ask:
> Do you want to clarify any ambiguous points in the spec first? (Reply "skip" to proceed)

- "skip" → go to Step 4
- Otherwise → ask up to 5 targeted clarification questions about underspecified areas; encode answers back into spec.md; then continue to Step 4

---

### Step 4 — Plan

Run:
```bash
bash knowledge/.scripts/bash/setup-plan.sh --json
```

This copies the plan template to `knowledge/specs/BRANCH_NAME/plan.md`.

Fill in plan.md:
- Technical context (language, framework, build tools, test commands)
- Constitution compliance check (go through each principle in knowledge/constitution.md)
- Project structure (source files that will be created/modified)
- Complexity tracking (only if constitution violations need justification)

Show the user key decisions:
- Tech stack confirmed
- Architecture approach
- Constitution check results (pass/fail per principle)

**Checkpoint 2/5:**
> **Plan generated.**
> Please confirm: are the technical approach and architecture decisions sound? These are costly to change later — review carefully.
> Reply "continue" or tell me what to adjust.

Wait for user confirmation.

---

### Step 5 — Tasks

Run:
```bash
bash knowledge/.scripts/bash/check-prerequisites.sh --json
```

Verify spec.md and plan.md exist.

Generate `knowledge/specs/BRANCH_NAME/tasks.md`:
- Organize tasks by user story (Phase 1: Setup, Phase 2: Foundation, Phase 3+: User Stories, Phase N: Polish)
- Follow TDD order: tests before implementation
- Mark parallel tasks with [P]
- Include exact file paths in task descriptions

Then run a cross-artifact consistency check:
- Verify every FR in spec.md has at least one task
- Verify tasks reference files consistent with plan.md structure
- Flag any inconsistencies or gaps

Show task count and any consistency risks.

**Checkpoint 3/5:**
> **Tasks generated, consistency analysis complete.**
> N tasks across M phases. Address any flagged risks before proceeding.
> Reply "continue" to start implementation.

Wait for user confirmation.

---

### Step 6 — Implement

Run:
```bash
bash knowledge/.scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

Load context:
- **REQUIRED**: Read tasks.md
- **REQUIRED**: Read plan.md
- **IF EXISTS**: Read research.md, data-model.md, contracts/, quickstart.md

Execute tasks phase by phase:
- Complete each phase before moving to the next
- For TDD tasks: write failing tests first, then implement
- Mark completed tasks as `[x]` in tasks.md
- After each phase, run the project's lint/build command from constitution (e.g. `vp check`)
- If build fails, fix before proceeding to next task

If the build command is not known, ask the user once: "What's the command to check/build this project?"

**After all tasks complete:**
> **Checkpoint 4/5: All tasks complete, build passing.**
> Ready for final review? Reply "continue" to run the checklist.

---

### Step 7 — Checklist

Copy checklist template from `knowledge/.scripts/templates/checklist-template.md` and generate a customized checklist for this feature:
- Replace placeholder items with real checks based on this feature's spec/plan
- Keep constitution compliance section (always required)
- Save as `knowledge/specs/BRANCH_NAME/checklist/review.md`

Show the checklist and ask the user to review.

**Checkpoint 5/5:**
> **Checklist generated.**
> Complete the checklist items, then reply "archive" to trigger the archive step.

---

### Step 8 — Archive

Read:
- `knowledge/specs/BRANCH_NAME/spec.md`
- `knowledge/specs/BRANCH_NAME/plan.md`
- `knowledge/specs/BRANCH_NAME/tasks.md`
- Any checklist files

Copy archive template from `knowledge/.scripts/templates/archive-template.md`.

Fill in `knowledge/specs/BRANCH_NAME/archive.md`:
- **Delivery summary**: What was built and why it matters
- **Key decisions**: Table of technical decisions made during this feature
- **Pitfalls**: Non-obvious problems encountered and how they were solved
- **Reusable patterns**: Patterns, utilities, or approaches worth reusing
- **Constitution feedback**: Any gaps or clarifications needed in constitution.md

After writing archive.md, run:
```bash
bash knowledge/.scripts/bash/update-agent-context.sh claude
```
This syncs the feature's tech stack from `plan.md` into `CLAUDE.md` so future sessions have up-to-date context.

#### Selective knowledge promotion

For each significant finding in archive.md, apply this judgment filter before writing anything to `knowledge/`:

> **Would this finding still be useful in 3 months? Could it help a future feature make a better decision?**

Based on the answer, choose one of three paths:

| Finding type | Action |
|---|---|
| Reusable pattern / design rule / API convention | See below — create a named topic file |
| Principle update / architecture clarification | Append to `knowledge/constitution.md` Section VII only |
| Feature-specific detail / one-off workaround | Stay in `archive.md` only — do not promote |

**Creating a named topic file** (only when warranted):
1. Create `knowledge/<topic>.md` (e.g. `knowledge/design-tokens.md`, `knowledge/auth-flow.md`)
2. Write the pattern/rule/convention as a standalone reference document
3. Add a pointer to `CLAUDE.md` under `## Harness Development`:
   ```markdown
   - **[Topic name]**: [knowledge/topic.md](knowledge/topic.md)
   ```

**Always** append to `knowledge/constitution.md` under `## VII. Accumulated Learnings`:

```markdown
### [BRANCH_NAME] — [date]
- Type: [feature / bugfix / refactor]
- Key findings: [1-2 bullet points of most important, generalizable learnings]
- Promoted: [topic file created, if any — otherwise "none"]
```

Show completion summary:
```
✓ Feature archived

knowledge/specs/BRANCH_NAME/
├── spec.md       ✓
├── plan.md       ✓
├── tasks.md      ✓ (all completed)
├── checklist/    ✓
└── archive.md    ✓ (new)

knowledge/constitution.md        ✓ (learnings appended)
knowledge/<topic>.md             ✓ (if promoted — otherwise omitted)
CLAUDE.md                        ✓ (pointer added — if topic file created)
```

---

## Notes

- Any checkpoint: if user requests changes, re-run the corresponding step (don't skip)
- If build/test commands are consistently failing, surface the issue clearly — don't silently skip
- The archive step is the most important for long-term value — don't skip it even if the user seems done
