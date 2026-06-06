# Scramble Docs Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual static VitePress learning site at `apps/scramble-docs` for WCA scramble generation and scramble image rendering principles.

**Architecture:** Add a standalone workspace app that uses VitePress and contains static Chinese/English Markdown pages. The app links to existing Cubegin package docs and source files but does not import runtime scramble packages.

**Tech Stack:** VitePress `1.6.4`, TypeScript config for app tooling, pnpm workspace scripts, Markdown/Mermaid content.

---

## File Structure

- Create `apps/scramble-docs/package.json` with `dev`, `build`, and `preview` scripts.
- Create `apps/scramble-docs/tsconfig.json` for VitePress config typechecking.
- Create `apps/scramble-docs/docs/.vitepress/config.mts` with bilingual nav/sidebar.
- Create root and locale Markdown pages under `apps/scramble-docs/docs/`.
- Modify root `package.json` with `dev:scramble-docs` and `build:scramble-docs`.
- Modify `README.md`, `AGENTS.md`, and `docs/project-structure.md` to route the new app.
- Modify `docs/.state.md` to record the new docs app memory pass.

## Task 1: Scaffold VitePress App

**Files:**
- Create: `apps/scramble-docs/package.json`
- Create: `apps/scramble-docs/tsconfig.json`
- Create: `apps/scramble-docs/docs/.vitepress/config.mts`
- Create: `apps/scramble-docs/docs/index.md`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add app manifest**

Create `apps/scramble-docs/package.json`:

```json
{
  "name": "scramble-docs",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vitepress dev docs",
    "build": "vitepress build docs",
    "preview": "vitepress preview docs"
  },
  "devDependencies": {
    "vitepress": "^1.6.4"
  }
}
```

- [ ] **Step 2: Add app tsconfig**

Create `apps/scramble-docs/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "types": ["node"]
  },
  "include": ["docs/.vitepress/**/*.ts", "docs/.vitepress/**/*.mts"]
}
```

- [ ] **Step 3: Add VitePress config**

Create `apps/scramble-docs/docs/.vitepress/config.mts` with locales for `root`, `zh`, and `en`. Use root redirects through language cards, set `lastUpdated: true`, and configure matching sidebars.

- [ ] **Step 4: Add root landing page**

Create `apps/scramble-docs/docs/index.md` with language links and the official-WCA disclaimer.

- [ ] **Step 5: Add root scripts**

Update root `package.json`:

```json
"dev:scramble-docs": "vp run scramble-docs#dev",
"build:scramble-docs": "vp run scramble-docs#build"
```

- [ ] **Step 6: Install dependencies**

Run:

```bash
pnpm install --ignore-scripts
```

Expected: lockfile updated and install completes.

- [ ] **Step 7: Verify scaffold build failure is content-only if pages are missing**

Skip full build until Task 2 creates locale pages.

- [ ] **Step 8: Commit scaffold**

```bash
git add apps/scramble-docs/package.json apps/scramble-docs/tsconfig.json apps/scramble-docs/docs/.vitepress/config.mts apps/scramble-docs/docs/index.md package.json pnpm-lock.yaml
git commit -m "feat(scramble-docs): scaffold vitepress app"
```

## Task 2: Write Bilingual Learning Content

**Files:**
- Create: `apps/scramble-docs/docs/zh/index.md`
- Create: `apps/scramble-docs/docs/zh/wca-rules.md`
- Create: `apps/scramble-docs/docs/zh/generation.md`
- Create: `apps/scramble-docs/docs/zh/state-transition.md`
- Create: `apps/scramble-docs/docs/zh/image-rendering.md`
- Create: `apps/scramble-docs/docs/zh/cubegin-packages.md`
- Create matching `apps/scramble-docs/docs/en/*.md`

- [ ] **Step 1: Write Chinese pages**

Write six Chinese pages with Mermaid diagrams and source links. Required concepts:

- WCA Regulation 4b and 4b3.
- TNoodle baseline and official-program disclaimer.
- Random-state vs random-turn generation.
- Event dispatch and special BLD/MBLD behavior.
- Move parser and state transition as shared capability.
- Parse/apply/render SVG image pipeline.
- Cubegin package boundaries and tests.

- [ ] **Step 2: Write English pages**

Mirror the Chinese page structure and technical meaning in English.

- [ ] **Step 3: Verify content links are repo-relative or stable external URLs**

Run:

```bash
rg -n "TODO|TBD|localhost|file://" apps/scramble-docs/docs
```

Expected: no matches.

- [ ] **Step 4: Commit content**

```bash
git add apps/scramble-docs/docs/zh apps/scramble-docs/docs/en
git commit -m "docs(scramble-docs): add bilingual learning content"
```

## Task 3: Update Repository Routing And Memory

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/project-structure.md`
- Modify: `docs/.state.md`

- [ ] **Step 1: Update README**

Add `apps/scramble-docs` to workspace layout, quick start, and app/package overview.

- [ ] **Step 2: Update AGENTS routing**

Add the docs app to the knowledge base and task routing, pointing future agents to `apps/scramble-docs`.

- [ ] **Step 3: Update project structure memory**

Add the app to the Mermaid diagram, directory layout, startup path, and key files. Use relative links with `#L` anchors and update footer.

- [ ] **Step 4: Update `.state.md`**

Increment iteration and add `scramble docs site` to covered areas.

- [ ] **Step 5: Run docs guard**

Run:

```bash
pnpm test:docs
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit routing and memory**

```bash
git add README.md AGENTS.md docs/project-structure.md docs/.state.md
git commit -m "docs: route scramble docs app"
```

## Task 4: Verify Site

**Files:**
- No new files expected unless verification exposes required fixes.

- [ ] **Step 1: Validate YAML/Markdown hygiene**

Run:

```bash
git diff --check
```

Expected: exit 0.

- [ ] **Step 2: Build app directly**

Run:

```bash
pnpm --filter scramble-docs build
```

Expected: VitePress build succeeds.

- [ ] **Step 3: Build app through root script**

Run:

```bash
pnpm build:scramble-docs
```

Expected: VitePress build succeeds through vite-plus workspace script.

- [ ] **Step 4: Run docs guard**

Run:

```bash
pnpm test:docs
```

Expected: 2 tests pass.

- [ ] **Step 5: Inspect git state**

Run:

```bash
git status --short
```

Expected: clean after commits.

## Self-Review

- Spec coverage: all requested areas map to tasks.
- Placeholder scan: no TODO/TBD placeholders in implementation steps.
- Type consistency: package name is consistently `scramble-docs`.
- Scope: app is static and does not duplicate playground runtime behavior.
