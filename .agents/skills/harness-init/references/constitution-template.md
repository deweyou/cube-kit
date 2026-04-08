# [PROJECT NAME] Constitution

> Version: 1.0.0 | Created: [DATE]
>
> This file captures the core development principles for the project. It is initialized
> by `/harness-init` and continuously updated via the archive step of `/harness-dev`.
> CLAUDE.md points here — Claude reads it at the start of each harness-dev workflow.

---

## I. Project Overview

**Project type**: [e.g. React component library / Next.js app / Node.js service / CLI tool]
**Primary goal**: [One sentence explaining why this project exists]
**Target users**: [Who uses this project]

---

## II. Tech Stack Conventions

**Language**: [e.g. TypeScript 5.x, strict mode]
**Runtime**: [e.g. Node.js 20 / Browser / Edge]
**Framework**: [e.g. React 18, Next.js 14]
**Build tool**: [e.g. vite-plus (vp) — all build commands use vp, not vite/pnpm directly]
**Package manager**: [e.g. pnpm — do not use npm/yarn]
**Testing**: [e.g. vitest, command: vp test]
**Lint/format**: [e.g. oxlint + prettier, command: vp check]

---

## III. Naming & File Conventions

- Files and directories: [e.g. kebab-case, e.g. my-component.tsx]
- Variables and functions: [e.g. camelCase]
- Types and interfaces: [e.g. PascalCase]
- Constants: [e.g. SCREAMING_SNAKE_CASE]
- Component files: [e.g. .tsx, arrow function style]
- Test files: [e.g. colocated, named index.test.tsx]

---

## IV. Architecture Boundaries

[Describe core architectural constraints, e.g.:]

- All reusable logic must live in packages/, not only in apps/
- Shared types are defined in packages/types, not duplicated across packages
- [Other boundary conventions]

---

## V. Test Requirements

- Feature changes must include: [e.g. unit tests + at least one integration test]
- Minimum coverage requirement: [e.g. 80% for core logic, or not enforced]
- If a bug is first found in manual QA, a regression test must be added before closing

---

## VI. Documentation Standards

- All spec/plan/tasks documents in `knowledge/specs/` use English
- Each completed feature must have a filled-in archive.md

---

## VII. Accumulated Learnings

> This section is automatically appended by the `/harness-dev` archive step.
> It records cross-feature insights that improve future development.

<!-- harness-dev archive step appends entries here -->
