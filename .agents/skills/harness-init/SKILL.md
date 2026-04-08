---
name: harness-init
description: Initialize the harness-dev environment in any frontend project. Sets up knowledge/ directory structure, installs scripts and templates, updates CLAUDE.md with a knowledge index, and configures .claude/settings.json hooks. Use this skill when the user says "init harness", "setup harness-dev", "initialize knowledge base", or when knowledge/.scripts/ does not exist and /harness-dev is about to run.
version: 1.0.0
---

# Harness Init

One-time setup skill that prepares a project for the `harness-dev` workflow.

## What It Creates

```
knowledge/
├── constitution.md          ← project principles (interactive setup)
├── specs/                   ← harness-dev writes here per feature
├── learnings/               ← cross-feature accumulated insights
└── .scripts/
    ├── bash/                ← runtime scripts (copied from skill)
    │   ├── common.sh
    │   ├── check-prerequisites.sh
    │   ├── create-new-feature.sh
    │   └── setup-plan.sh
    └── templates/           ← spec/plan/tasks/checklist/archive templates
```

CLAUDE.md gets a `## Harness Development` section pointing to `knowledge/`.
`.claude/settings.json` gets validation hooks.

---

## Execution Steps

### Step 0 — Check existing state

Run:
```bash
ls knowledge/ 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

- If `knowledge/` already exists, ask: "knowledge/ already exists. Re-initialize? (yes/no)"
- If "no", stop.
- If "yes" or NOT_FOUND, continue.

---

### Step 1 — Create directory structure

Run:
```bash
mkdir -p knowledge/specs knowledge/.scripts/bash knowledge/.scripts/templates
```

---

### Step 2 — Copy scripts from skill references

The skill is installed at `.claude/skills/harness-init/`. Run:

```bash
SKILL_REF=".claude/skills/harness-init/references"
```

Check that the skill references directory exists:
```bash
ls "$SKILL_REF/scripts/" 2>/dev/null || echo "SKILL_NOT_FOUND"
```

If SKILL_NOT_FOUND, inform the user:
> "Skill references not found at .claude/skills/harness-init/references/. Make sure harness-init is installed via `npx skills add`."
> Stop execution.

Copy scripts:
```bash
cp "$SKILL_REF/scripts/common.sh"               knowledge/.scripts/bash/common.sh
cp "$SKILL_REF/scripts/check-prerequisites.sh"  knowledge/.scripts/bash/check-prerequisites.sh
cp "$SKILL_REF/scripts/create-new-feature.sh"   knowledge/.scripts/bash/create-new-feature.sh
cp "$SKILL_REF/scripts/setup-plan.sh"           knowledge/.scripts/bash/setup-plan.sh
cp "$SKILL_REF/scripts/update-agent-context.sh" knowledge/.scripts/bash/update-agent-context.sh
chmod +x knowledge/.scripts/bash/*.sh
```

Copy templates:
```bash
cp "$SKILL_REF/templates/spec-template.md"        knowledge/.scripts/templates/spec-template.md
cp "$SKILL_REF/templates/plan-template.md"        knowledge/.scripts/templates/plan-template.md
cp "$SKILL_REF/templates/tasks-template.md"       knowledge/.scripts/templates/tasks-template.md
cp "$SKILL_REF/templates/checklist-template.md"   knowledge/.scripts/templates/checklist-template.md
cp "$SKILL_REF/templates/archive-template.md"     knowledge/.scripts/templates/archive-template.md
cp "$SKILL_REF/templates/agent-file-template.md"  knowledge/.scripts/templates/agent-file-template.md
```

---

### Step 3 — Interactive constitution setup

Read the constitution template:
```bash
cat .claude/skills/harness-init/references/constitution-template.md
```

Then interactively collect from the user:

Ask the following questions one at a time (wait for answer before proceeding):

1. **Project name?** (used for constitution title)
2. **Project type?** (React component library / Next.js app / Node.js service / CLI tool / other)
3. **Primary goal?** (one sentence explaining why this project exists)
4. **Core tech stack?** (language version, framework, build tool, package manager)
5. **Test tool and command?** (framework + run command)
6. **Build/check command?** (lint, format, type-check commands)
7. **Any special architecture boundaries or naming conventions to record?** (optional, press Enter to skip)

Based on answers, fill in the constitution template and write to `knowledge/constitution.md`.

---

### Step 4 — Update CLAUDE.md

Check if CLAUDE.md exists:
```bash
ls CLAUDE.md 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

**If CLAUDE.md does not exist**: Create a minimal one:
```markdown
# [Project Name]

[One-line project description from constitution]

## Commands

[User should fill in project-specific commands here]

## Harness Development

Context and knowledge base for AI-assisted development:

- **Constitution** (project principles): [knowledge/constitution.md](knowledge/constitution.md)
- **Feature specs**: [knowledge/specs/](knowledge/specs/)

> Scripts and templates are managed by harness-dev at `knowledge/.scripts/` — do not edit manually.
> Topic-specific knowledge files (e.g. `knowledge/design-tokens.md`) are added here by the archive step when generalizable patterns are discovered.
```

**If CLAUDE.md exists**: Add the following section at the end (only if `## Harness Development` section doesn't already exist):

```markdown

## Harness Development

Context and knowledge base for AI-assisted development:

- **Constitution** (project principles): [knowledge/constitution.md](knowledge/constitution.md)
- **Feature specs**: [knowledge/specs/](knowledge/specs/)

> Scripts and templates are managed by harness-dev at `knowledge/.scripts/` — do not edit manually.
> Topic-specific knowledge files (e.g. `knowledge/design-tokens.md`) are added here by the archive step when generalizable patterns are discovered.
```

---

### Step 5 — Configure .claude/settings.json hooks

Check if `.claude/settings.json` exists and read its current content.

Add or merge the following hooks into the settings (preserve existing settings):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'f=\"$CLAUDE_TOOL_INPUT_PATH\"; [[ \"$f\" == *\"/SKILL.md\" ]] && python3 -c \"import sys, re; content=open(\\\"$f\\\").read(); errors=[]; fields=[\\\"name\\\",\\\"description\\\",\\\"version\\\"]; [errors.append(f) for f in fields if not re.search(f+\\\":\\\", content[:500])]; sys.exit(0) if not errors else (print(\\\"[harness-hook] SKILL.md missing fields:\\\", errors), sys.exit(0))\" 2>/dev/null || true'"
          }
        ]
      }
    ]
  }
}
```

**Note**: If settings.json already has hooks, use Read + Edit to merge carefully — do not overwrite existing hooks. If the file doesn't exist, create `.claude/` directory and write the full settings.

---

### Step 6 — Summary

Show the user a setup summary:

```
✓ harness-dev environment initialized

knowledge/
├── constitution.md     ← review and adjust as needed
├── specs/              ← feature specs will be created here
└── .scripts/           ← managed scripts and templates

CLAUDE.md               ← updated with harness section
.claude/settings.json   ← validation hooks added

Next: run /harness-dev <feature description> to start a feature.
```

Suggest adding `knowledge/.scripts/` to `.gitignore` if the user prefers not to commit generated scripts, OR keeping it committed so the team shares the same scripts. Ask their preference.
