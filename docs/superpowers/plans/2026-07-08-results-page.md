# Results Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the persisted Cubegin web results page approved in `docs/superpowers/specs/2026-07-08-results-page-design.md`.

**Architecture:** Move timer list and solve ownership into a web-local session store backed by IndexedDB. `TimerPage` writes solves and list edits through the store; `ResultsPage` reads the same store, renders a score-type dropdown pill plus statistics, and edits/deletes solves through store actions.

**Tech Stack:** React 18, React Router, CSS Modules, `@cubegin/shared/timer-session`, browser IndexedDB, Vitest + Testing Library.

---

### Task 1: Rolling Average Window Helpers

**Files:**
- Modify: `packages/shared/src/timer-session/solve-statistics.ts`
- Modify: `packages/shared/src/timer-session/index.ts`
- Test: `packages/shared/src/timer-session/solve-statistics.test.ts`

- [ ] **Step 1: Write failing tests for rolling average windows**

Add tests that assert `calculateRollingAverageWindows` returns newest-first windows with sequence ranges, displayed component times, trimmed average behavior for `ao5`, and untrimmed `av3`.

```ts
it('builds newest-first ao5 rolling windows with sequence ranges', () => {
  const solves = makeSolvesNewestFirst([8423, 10301, 9884, 11037, 10521, 12003]);

  expect(calculateRollingAverageWindows(solves, 5)[0]).toMatchObject({
    averageType: 'ao5',
    endSequenceNumber: 6,
    startSequenceNumber: 2,
    valueText: '10.235',
  });
});

it('builds untrimmed av3 windows', () => {
  const solves = makeSolvesNewestFirst([9000, 12000, 15000]);

  expect(calculateRollingAverageWindows(solves, 3, { trim: false })[0]?.valueMs).toBe(12000);
});
```

- [ ] **Step 2: Run the shared test and verify it fails**

Run:

```bash
corepack pnpm --filter @cubegin/shared test -- solve-statistics.test.ts
```

Expected: fail because `calculateRollingAverageWindows` does not exist.

- [ ] **Step 3: Implement the rolling-window helper**

Add an exported helper that returns stable data for results UI:

```ts
export type RollingAverageType = 'av3' | 'ao5' | 'ao20' | 'ao50' | 'ao100';

export interface RollingAverageWindow {
  averageType: RollingAverageType;
  componentSolves: SolveRecord[];
  endSequenceNumber: number;
  startSequenceNumber: number;
  valueMs: number | null;
  valueText: string;
}

export const calculateRollingAverageWindows = (
  solvesNewestFirst: readonly SolveRecord[],
  size: number,
  options: { trim?: boolean } = {},
): RollingAverageWindow[] => {
  // Use existing displayed-time and average logic; windows are newest-first.
};
```

- [ ] **Step 4: Run the shared test and verify it passes**

Run:

```bash
corepack pnpm --filter @cubegin/shared test -- solve-statistics.test.ts
```

Expected: pass.

### Task 2: Web Timer Session Store And IndexedDB Adapter

**Files:**
- Create: `apps/web/src/timer-session/timer-session-store.tsx`
- Create: `apps/web/src/timer-session/timer-session-db.ts`
- Modify: `apps/web/src/timer-session/timer-session-store.test.tsx`

- [ ] **Step 1: Replace the early draft store tests with persistence-focused failing tests**

Cover default list initialization, create/update active list, add solve, update penalty, delete solve, and IndexedDB reload.

```tsx
it('persists solves across provider remounts', async () => {
  const first = renderStoreProbe();
  await first.addSolve({ elapsedMs: 8423, scramble: "R U R' U'" });
  first.unmount();

  const second = renderStoreProbe();

  expect(await second.findSolveCount()).toBe('1');
});
```

- [ ] **Step 2: Run store tests and verify they fail**

Run:

```bash
corepack pnpm --filter web test -- src/timer-session/timer-session-store.test.tsx
```

Expected: fail because the store and adapter do not exist.

- [ ] **Step 3: Implement the IndexedDB adapter**

Expose a small promise API:

```ts
export interface TimerSessionDb {
  addSolve(record: SolveRecord): Promise<SolveRecord>;
  deleteSolve(solveId: string): Promise<void>;
  getActiveListId(): Promise<string | undefined>;
  listSessions(): Promise<SolveSession[]>;
  listSolves(sessionId: string): Promise<SolveRecord[]>;
  setActiveListId(listId: string): Promise<void>;
  updateSession(session: SolveSession): Promise<SolveSession>;
  updateSolvePenalty(solveId: string, penalty: SolvePenalty): Promise<SolveRecord>;
}
```

Use object stores `sessions`, `solves`, and `meta`. Keep error messages at this boundary useful enough for the UI.

- [ ] **Step 4: Implement `TimerSessionStoreProvider`**

Expose:

```ts
interface TimerSessionStoreContextValue {
  activeList: TimerList;
  activeListId: string;
  activeListSolveRecords: SolveRecord[];
  addSolve(input: AddSolveInput): Promise<SolveRecord>;
  createList(input: ListInput): Promise<TimerList>;
  deleteSolve(solveId: string): Promise<void>;
  error?: string;
  isLoading: boolean;
  lists: TimerList[];
  retry(): Promise<void>;
  setActiveListId(listId: string): Promise<void>;
  updateList(input: UpdateListInput): Promise<TimerList>;
  updateSolvePenalty(solveId: string, penalty: SolvePenalty): Promise<SolveRecord>;
}
```

Default lists should match current `TimerPage` ids (`main-${eventId}`) so existing UI expectations stay stable.

- [ ] **Step 5: Run store tests and verify they pass**

Run:

```bash
corepack pnpm --filter web test -- src/timer-session/timer-session-store.test.tsx
```

Expected: pass.

### Task 3: Wire Store Into AppRouter And TimerPage

**Files:**
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/app-router.tsx`
- Modify: `apps/web/src/app-router.test.tsx`
- Modify: `apps/web/src/timer/timer-page.tsx`
- Modify: `apps/web/src/timer/timer-page.test.tsx`

- [ ] **Step 1: Write failing tests for route and timer-store integration**

Update `app-router.test.tsx` so `/results` expects `ResultsPage`, not placeholder. Update `timer-page.test.tsx` so stopping the timer appends a solve via the shared store and the list selector reads store lists.

```tsx
it('adds stopped solves to the shared session store', async () => {
  renderTimerPageWithStore();
  fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
  fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

  expect(await screen.findByText('1/1')).toBeTruthy();
});
```

- [ ] **Step 2: Run route and timer tests and verify they fail**

Run:

```bash
corepack pnpm --filter web test -- src/app-router.test.tsx src/timer/timer-page.test.tsx
```

Expected: fail because AppRouter still routes results to placeholder and TimerPage still owns local solve state.

- [ ] **Step 3: Wrap the app in `TimerSessionStoreProvider`**

In `apps/web/src/app.tsx`, nest the session provider inside preferences and outside the app shell/router.

- [ ] **Step 4: Route `/results` to `ResultsPage`**

Lazy-load `ResultsPage` in `app-router.tsx` and keep the existing keep-alive timer behavior for timer/settings.

- [ ] **Step 5: Replace TimerPage list/solve local state with store actions**

Remove `lists`, `activeListId`, and `solveRecordsByListId` local ownership. Keep form local state. Use:

```ts
const {
  activeList,
  activeListId,
  activeListSolveRecords,
  addSolve,
  createList,
  lists,
  setActiveListId,
  updateList,
} = useTimerSessionStore();
```

`stopTimer` calls `addSolve` with elapsed, event, list, penalty, and scramble. List create/edit call the store.

- [ ] **Step 6: Run route and timer tests and verify they pass**

Run:

```bash
corepack pnpm --filter web test -- src/app-router.test.tsx src/timer/timer-page.test.tsx
```

Expected: pass.

### Task 4: Results Page Score Views And Detail

**Files:**
- Create: `apps/web/src/results/results-page.tsx`
- Create: `apps/web/src/results/results-page.module.css`
- Modify: `apps/web/src/results/results-page.test.tsx`
- Modify: `apps/web/src/preferences/app-copy.ts`

- [ ] **Step 1: Rewrite results tests to match the approved UI**

Assert:

- heading and right-side list switcher
- top pill dropdown (`单次成绩`) plus `统计`
- single table columns `#`, `成绩`, `ao5`
- average dropdown mode showing `范围`, average value, and composition
- wide detail preview with penalty controls and delete icon
- English labels

- [ ] **Step 2: Run results tests and verify they fail**

Run:

```bash
corepack pnpm --filter web test -- src/results/results-page.test.tsx
```

Expected: fail because `ResultsPage` is not implemented.

- [ ] **Step 3: Add results copy**

Add `results` copy under `AppCopy` for page labels, score types, table columns, empty states, detail labels, and delete confirmation.

- [ ] **Step 4: Implement ResultsPage layout**

Build:

- header with brand, top nav, and list switcher
- score-type dropdown pill using the existing design select primitive
- statistics pill button
- score summary strip
- single score table
- average score table
- wide detail preview
- narrow modal/sheet detail

- [ ] **Step 5: Implement detail actions**

Single solve detail calls `updateSolvePenalty` and `deleteSolve`. Delete uses a confirmation before committing the action. Average detail is read-only.

- [ ] **Step 6: Run results tests and verify they pass**

Run:

```bash
corepack pnpm --filter web test -- src/results/results-page.test.tsx
```

Expected: pass.

### Task 5: Statistics Charts

**Files:**
- Modify: `apps/web/src/results/results-page.tsx`
- Modify: `apps/web/src/results/results-page.module.css`
- Modify: `apps/web/src/results/results-page.test.tsx`

- [ ] **Step 1: Add failing statistics tests**

Assert the statistics tab shows core metrics, a trend chart region, a distribution chart region, and accessible chart summaries.

- [ ] **Step 2: Run results tests and verify they fail**

Run:

```bash
corepack pnpm --filter web test -- src/results/results-page.test.tsx
```

- [ ] **Step 3: Implement lightweight SVG charts**

Use local SVG with stable dimensions and accessible labels. Trend chart plots recent displayed solve values and `ao5` windows. Distribution chart buckets displayed solve times.

- [ ] **Step 4: Run results tests and verify they pass**

Run:

```bash
corepack pnpm --filter web test -- src/results/results-page.test.tsx
```

Expected: pass.

### Task 6: Final Verification

**Files:**
- Potential docs update: `docs/timer-workflow.md`
- Potential docs update: `docs/project-structure.md`

- [ ] **Step 1: Run targeted test suite**

Run:

```bash
corepack pnpm --filter @cubegin/shared test -- solve-statistics.test.ts
corepack pnpm --filter web test -- src/timer-session/timer-session-store.test.tsx src/results/results-page.test.tsx src/app-router.test.tsx src/timer/timer-page.test.tsx
```

- [ ] **Step 2: Run web typecheck**

Run:

```bash
corepack pnpm --filter web typecheck
```

- [ ] **Step 3: Start the web dev server**

Run:

```bash
corepack pnpm --filter web dev -- --host 127.0.0.1
```

- [ ] **Step 4: Browser-check desktop and mobile**

Verify:

- `/results` loads after a solve is recorded
- score-type pill dropdown switches single/ao5
- wide detail preview appears
- mobile detail modal/sheet appears
- penalty edit updates table and averages
- delete removes the solve after confirmation
- no horizontal overflow

- [ ] **Step 5: Repo-memory check**

Run the repo-memory decision. Update docs only if the new persistent results ownership is durable project knowledge not already captured.
