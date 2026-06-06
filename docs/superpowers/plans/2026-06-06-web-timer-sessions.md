# Web Timer Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the `apps/web` Rubik's cube timer with event-linked solve sessions, result persistence, result detail editing, and a reusable platform-agnostic session package.

**Architecture:** Add `packages/timer-session` for pure types and rules, then wire `apps/web` to that package through a web-only IndexedDB repository and React hooks. Keep scramble generation/rendering in the existing scramble packages and keep browser APIs out of package code.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library, vite-plus, native IndexedDB, `@deweyou-design/react`, `@cubegin/timer`, `@cubegin/scramble-core`, `@cubegin/scramble-image`, `@cubegin/scramble-puzzle`.

---

## File Structure

- Create `packages/timer-session/package.json`: workspace package manifest matching existing package scripts.
- Create `packages/timer-session/tsconfig.json`: TypeScript config matching package conventions.
- Create `packages/timer-session/vite.config.ts`: vite-plus pack/test config.
- Create `packages/timer-session/src/types.ts`: `SolvePenalty`, `SolveRecord`, `SolveSession`, repository interfaces, and transition input/result types.
- Create `packages/timer-session/src/event-labels.ts`: shared WCA event display labels and default session name helper.
- Create `packages/timer-session/src/session-rules.ts`: default session helpers, delete eligibility, sort helpers, and event/session transition rules.
- Create `packages/timer-session/src/solve-format.ts`: penalty display and reverse sequence helpers.
- Create `packages/timer-session/src/index.ts`: public barrel.
- Create `packages/timer-session/src/*.test.ts`: package unit tests.
- Modify `apps/web/package.json`: add `@cubegin/timer-session` and include it in `prepare:deps`.
- Create `apps/web/src/timer/storage/timer-session-db.ts`: native IndexedDB adapter implementing the package repository interface.
- Create `apps/web/src/timer/storage/memory-timer-session-repository.ts`: test/in-memory fallback repository.
- Create `apps/web/src/timer/hooks/use-timer-sessions.ts`: React hook around repository state and package transition rules.
- Modify `apps/web/src/timer/hooks/use-timer-gesture.ts`: add Enter start/stop support while preserving existing H5 touch behavior.
- Modify `apps/web/src/timer/components/elapsed-display.tsx`: use Helvetica timer digits.
- Modify `apps/web/src/timer/components/event-selector.tsx`: export event labels or consume package labels.
- Modify `apps/web/src/timer/components/result-actions.tsx`: four final actions that save or discard immediately.
- Create `apps/web/src/timer/components/session-selector.tsx`: session picker plus create/delete controls.
- Create `apps/web/src/timer/components/solve-list.tsx`: reverse ordered solve rows.
- Create `apps/web/src/timer/components/solve-detail.tsx`: solve detail dialog/drawer with penalty edit and delete.
- Create `apps/web/src/timer/components/storage-alert.tsx`: compact persistence error notice.
- Modify `apps/web/src/timer/views/scramble-view.tsx`: add start button and layout slot for session panel.
- Modify `apps/web/src/timer/views/result-view.tsx`: receive four action callbacks and remove local penalty toggle state.
- Modify `apps/web/src/timer/views/timing-view.tsx`: ensure Helvetica elapsed display remains visually centered.
- Modify `apps/web/src/timer/timer-page.tsx`: integrate sessions, persistence, result actions, detail state, and event/session synchronization.
- Modify `apps/web/src/timer/timer-page.test.tsx`: cover full workflow with fake storage and mocked scrambles.
- Modify `docs/project-structure.md`, `docs/timer-workflow.md`, and `docs/.state.md` if durable package ownership or workflow knowledge changes after implementation.

---

### Task 1: Add `@cubegin/timer-session` Package Skeleton

**Files:**

- Create: `packages/timer-session/package.json`
- Create: `packages/timer-session/tsconfig.json`
- Create: `packages/timer-session/vite.config.ts`
- Create: `packages/timer-session/src/index.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Write package manifest**

Create `packages/timer-session/package.json`:

```json
{
  "name": "@cubegin/timer-session",
  "version": "0.0.0",
  "description": "Platform-agnostic solve session and result rules for Cubegin.",
  "license": "MIT",
  "files": ["dist"],
  "type": "module",
  "exports": {
    ".": "./dist/index.mjs",
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "vp pack",
    "dev": "vp pack --watch",
    "test": "vp test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@cubegin/scramble-puzzle": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vite-plus": "catalog:",
    "vitest": "catalog:"
  }
}
```

- [ ] **Step 2: Add package configs**

Create `packages/timer-session/vite.config.ts`:

```ts
import { defineConfig } from 'vite-plus';
import { defineConfig as definePackConfig } from 'vite-plus/pack';

export default defineConfig({
  pack: definePackConfig({
    dts: {},
    exports: true,
  }),
});
```

Create `packages/timer-session/tsconfig.json` by copying the structure from `packages/timer/tsconfig.json`.

- [ ] **Step 3: Add an empty barrel**

Create `packages/timer-session/src/index.ts`:

```ts
export {};
```

- [ ] **Step 4: Wire web dependency**

Modify `apps/web/package.json`:

```json
"prepare:deps": "pnpm --filter @cubegin/timer build && pnpm --filter @cubegin/timer-session build && pnpm --filter @cubegin/scramble-puzzle build && pnpm --filter @cubegin/scramble-core build && pnpm --filter @cubegin/scramble-image build"
```

Add dependency:

```json
"@cubegin/timer-session": "workspace:*"
```

- [ ] **Step 5: Verify package skeleton builds**

Run:

```bash
corepack pnpm --filter @cubegin/timer-session build
```

Expected: build succeeds and creates `packages/timer-session/dist/index.mjs`.

- [ ] **Step 6: Commit**

```bash
git add packages/timer-session apps/web/package.json
git commit -m "feat: add timer session package"
```

---

### Task 2: Implement Package Types, Formatting, and Session Rules with Tests

**Files:**

- Create: `packages/timer-session/src/types.ts`
- Create: `packages/timer-session/src/event-labels.ts`
- Create: `packages/timer-session/src/session-rules.ts`
- Create: `packages/timer-session/src/solve-format.ts`
- Create: `packages/timer-session/src/session-rules.test.ts`
- Create: `packages/timer-session/src/solve-format.test.ts`
- Modify: `packages/timer-session/src/index.ts`

- [ ] **Step 1: Write failing tests for default sessions and delete rules**

Create `packages/timer-session/src/session-rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  canDeleteSession,
  createDefaultSession,
  getDefaultSessionId,
  resolveEventChange,
  resolveSessionChange,
  sortSessionsByCreatedDesc,
} from './session-rules';
import type { SolveRecord, SolveSession } from './types';

const customSession: SolveSession = {
  id: 'custom-1',
  name: '练习',
  isDefault: false,
  createdAt: 30,
};

describe('session rules', () => {
  it('creates deterministic default sessions for events', () => {
    const session = createDefaultSession('333', 100);
    expect(session).toEqual({
      id: 'default:333',
      name: '3×3×3',
      eventId: '333',
      isDefault: true,
      createdAt: 100,
    });
    expect(getDefaultSessionId('222')).toBe('default:222');
  });

  it('protects default sessions and allows custom sessions to be deleted', () => {
    expect(canDeleteSession(createDefaultSession('333', 100))).toBe(false);
    expect(canDeleteSession(customSession)).toBe(true);
  });

  it('sorts sessions by creation time descending', () => {
    const oldDefault = createDefaultSession('333', 10);
    expect(sortSessionsByCreatedDesc([oldDefault, customSession])).toEqual([
      customSession,
      oldDefault,
    ]);
  });

  it('switches event changes to the matching default session', () => {
    expect(resolveEventChange('222')).toEqual({
      eventId: '222',
      sessionId: 'default:222',
      shouldGenerateScramble: true,
    });
  });

  it('keeps event unchanged for an empty custom session', () => {
    expect(resolveSessionChange(customSession, [], '333')).toEqual({
      eventId: '333',
      sessionId: 'custom-1',
      shouldGenerateScramble: false,
    });
  });

  it('uses default session event when the selected default session is empty', () => {
    expect(resolveSessionChange(createDefaultSession('444', 10), [], '333')).toEqual({
      eventId: '444',
      sessionId: 'default:444',
      shouldGenerateScramble: true,
    });
  });

  it('uses the newest solve event when a session has solves', () => {
    const solves: SolveRecord[] = [
      {
        id: 'old',
        sessionId: 'custom-1',
        eventId: '222',
        scramble: 'R U',
        elapsedMs: 1000,
        penalty: 'none',
        createdAt: 10,
      },
      {
        id: 'new',
        sessionId: 'custom-1',
        eventId: '555',
        scramble: 'R U F',
        elapsedMs: 2000,
        penalty: '+2',
        createdAt: 20,
      },
    ];

    expect(resolveSessionChange(customSession, solves, '333')).toEqual({
      eventId: '555',
      sessionId: 'custom-1',
      shouldGenerateScramble: true,
    });
  });
});
```

- [ ] **Step 2: Write failing tests for solve display helpers**

Create `packages/timer-session/src/solve-format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  getDisplayedElapsedMs,
  getReverseSequenceNumber,
  getSolveDisplayText,
} from './solve-format';

describe('solve formatting', () => {
  it('applies +2 only to displayed elapsed milliseconds', () => {
    expect(getDisplayedElapsedMs(12345, 'none')).toBe(12345);
    expect(getDisplayedElapsedMs(12345, '+2')).toBe(14345);
    expect(getDisplayedElapsedMs(12345, 'dnf')).toBeNull();
  });

  it('formats solve display text to milliseconds', () => {
    expect(getSolveDisplayText(12345, 'none')).toBe('12.345');
    expect(getSolveDisplayText(12345, '+2')).toBe('14.345');
    expect(getSolveDisplayText(12345, 'dnf')).toBe('DNF');
  });

  it('calculates reverse sequence numbers for descending rows', () => {
    expect(getReverseSequenceNumber(10, 0)).toBe(10);
    expect(getReverseSequenceNumber(10, 4)).toBe(6);
  });
});
```

- [ ] **Step 3: Implement package types**

Create `packages/timer-session/src/types.ts`:

```ts
import type { WcaEventId } from '@cubegin/scramble-puzzle';

export type SolvePenalty = 'none' | '+2' | 'dnf';

export interface SolveRecord {
  id: string;
  sessionId: string;
  eventId: WcaEventId;
  scramble: string;
  elapsedMs: number;
  penalty: SolvePenalty;
  createdAt: number;
}

export interface SolveSession {
  id: string;
  name: string;
  eventId?: WcaEventId;
  isDefault: boolean;
  createdAt: number;
}

export interface TimerSessionRepository {
  initializeDefaultSessions(now: number): Promise<SolveSession[]>;
  listSessions(): Promise<SolveSession[]>;
  createSession(name: string, now: number): Promise<SolveSession>;
  deleteSession(sessionId: string): Promise<void>;
  listSolves(sessionId: string): Promise<SolveRecord[]>;
  addSolve(record: SolveRecord): Promise<SolveRecord>;
  updateSolvePenalty(solveId: string, penalty: SolvePenalty): Promise<SolveRecord>;
  deleteSolve(solveId: string): Promise<void>;
}

export interface SessionTransition {
  eventId: WcaEventId;
  sessionId: string;
  shouldGenerateScramble: boolean;
}
```

- [ ] **Step 4: Implement event labels**

Create `packages/timer-session/src/event-labels.ts`:

```ts
import type { WcaEventId } from '@cubegin/scramble-puzzle';

export const WCA_EVENT_LABELS: Record<WcaEventId, string> = {
  '333': '3×3×3',
  '222': '2×2×2',
  '444': '4×4×4',
  '555': '5×5×5',
  '666': '6×6×6',
  '777': '7×7×7',
  '333bld': '3BLD',
  '333fm': 'FMC',
  '333oh': '单手',
  clock: 'Clock',
  minx: 'Megaminx',
  pyram: 'Pyraminx',
  skewb: 'Skewb',
  sq1: 'SQ-1',
  '444bld': '4BLD',
  '555bld': '5BLD',
  '333mbld': 'Multi',
};

export const getWcaEventLabel = (eventId: WcaEventId): string => WCA_EVENT_LABELS[eventId];
```

- [ ] **Step 5: Implement session rules**

Create `packages/timer-session/src/session-rules.ts`:

```ts
import type { WcaEventId } from '@cubegin/scramble-puzzle';
import { getWcaEventLabel } from './event-labels';
import type { SessionTransition, SolveRecord, SolveSession } from './types';

export const getDefaultSessionId = (eventId: WcaEventId): string => `default:${eventId}`;

export const createDefaultSession = (eventId: WcaEventId, createdAt: number): SolveSession => ({
  id: getDefaultSessionId(eventId),
  name: getWcaEventLabel(eventId),
  eventId,
  isDefault: true,
  createdAt,
});

export const canDeleteSession = (session: SolveSession): boolean => !session.isDefault;

export const sortSessionsByCreatedDesc = (sessions: SolveSession[]): SolveSession[] =>
  [...sessions].sort((a, b) => b.createdAt - a.createdAt || a.name.localeCompare(b.name));

export const sortSolvesByCreatedDesc = (solves: SolveRecord[]): SolveRecord[] =>
  [...solves].sort((a, b) => b.createdAt - a.createdAt);

export const resolveEventChange = (eventId: WcaEventId): SessionTransition => ({
  eventId,
  sessionId: getDefaultSessionId(eventId),
  shouldGenerateScramble: true,
});

export const resolveSessionChange = (
  session: SolveSession,
  sessionSolves: SolveRecord[],
  currentEventId: WcaEventId,
): SessionTransition => {
  const newestSolve = sortSolvesByCreatedDesc(sessionSolves)[0];
  const nextEventId = newestSolve?.eventId ?? session.eventId ?? currentEventId;

  return {
    eventId: nextEventId,
    sessionId: session.id,
    shouldGenerateScramble: nextEventId !== currentEventId,
  };
};
```

- [ ] **Step 6: Implement solve formatting**

Create `packages/timer-session/src/solve-format.ts`:

```ts
import type { SolvePenalty } from './types';

export const getDisplayedElapsedMs = (elapsedMs: number, penalty: SolvePenalty): number | null => {
  if (penalty === 'dnf') return null;
  if (penalty === '+2') return elapsedMs + 2000;
  return elapsedMs;
};

export const formatMilliseconds = (ms: number): string => (ms / 1000).toFixed(3);

export const getSolveDisplayText = (elapsedMs: number, penalty: SolvePenalty): string => {
  const displayedMs = getDisplayedElapsedMs(elapsedMs, penalty);
  return displayedMs === null ? 'DNF' : formatMilliseconds(displayedMs);
};

export const getReverseSequenceNumber = (total: number, descendingIndex: number): number =>
  total - descendingIndex;
```

- [ ] **Step 7: Export package API**

Update `packages/timer-session/src/index.ts`:

```ts
export * from './event-labels';
export * from './session-rules';
export * from './solve-format';
export * from './types';
```

- [ ] **Step 8: Run package tests**

Run:

```bash
corepack pnpm --filter @cubegin/timer-session test
```

Expected: all new package tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/timer-session
git commit -m "feat: add timer session rules"
```

---

### Task 3: Add Web Storage Repositories

**Files:**

- Create: `apps/web/src/timer/storage/memory-timer-session-repository.ts`
- Create: `apps/web/src/timer/storage/timer-session-db.ts`
- Create: `apps/web/src/timer/storage/timer-session-db.test.ts`

- [ ] **Step 1: Implement memory repository for tests and fallback**

Create `apps/web/src/timer/storage/memory-timer-session-repository.ts`:

```ts
import { WCA_EVENT_IDS } from '@cubegin/scramble-puzzle';
import {
  createDefaultSession,
  sortSessionsByCreatedDesc,
  sortSolvesByCreatedDesc,
  type SolvePenalty,
  type SolveRecord,
  type SolveSession,
  type TimerSessionRepository,
} from '@cubegin/timer-session';

export const createMemoryTimerSessionRepository = (): TimerSessionRepository => {
  const sessions = new Map<string, SolveSession>();
  const solves = new Map<string, SolveRecord>();

  return {
    async initializeDefaultSessions(now) {
      WCA_EVENT_IDS.forEach((eventId, index) => {
        const session = createDefaultSession(eventId, now + index);
        if (!sessions.has(session.id)) sessions.set(session.id, session);
      });
      return sortSessionsByCreatedDesc([...sessions.values()]);
    },
    async listSessions() {
      return sortSessionsByCreatedDesc([...sessions.values()]);
    },
    async createSession(name, now) {
      const session: SolveSession = {
        id: crypto.randomUUID(),
        name,
        isDefault: false,
        createdAt: now,
      };
      sessions.set(session.id, session);
      return session;
    },
    async deleteSession(sessionId) {
      sessions.delete(sessionId);
      [...solves.values()].forEach((solve) => {
        if (solve.sessionId === sessionId) solves.delete(solve.id);
      });
    },
    async listSolves(sessionId) {
      return sortSolvesByCreatedDesc(
        [...solves.values()].filter((solve) => solve.sessionId === sessionId),
      );
    },
    async addSolve(record) {
      solves.set(record.id, record);
      return record;
    },
    async updateSolvePenalty(solveId, penalty: SolvePenalty) {
      const solve = solves.get(solveId);
      if (!solve) throw new Error(`Solve not found: ${solveId}`);
      const updated = { ...solve, penalty };
      solves.set(solveId, updated);
      return updated;
    },
    async deleteSolve(solveId) {
      solves.delete(solveId);
    },
  };
};
```

- [ ] **Step 2: Write IndexedDB adapter tests**

Create `apps/web/src/timer/storage/timer-session-db.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createMemoryTimerSessionRepository } from './memory-timer-session-repository';

describe('timer session repository contract', () => {
  it('creates sessions and lists solves newest first', async () => {
    const repository = createMemoryTimerSessionRepository();
    await repository.initializeDefaultSessions(100);
    const custom = await repository.createSession('练习', 1000);

    await repository.addSolve({
      id: 'old',
      sessionId: custom.id,
      eventId: '333',
      scramble: 'R U',
      elapsedMs: 1100,
      penalty: 'none',
      createdAt: 10,
    });
    await repository.addSolve({
      id: 'new',
      sessionId: custom.id,
      eventId: '222',
      scramble: 'R U R',
      elapsedMs: 900,
      penalty: '+2',
      createdAt: 20,
    });

    expect((await repository.listSolves(custom.id)).map((solve) => solve.id)).toEqual([
      'new',
      'old',
    ]);
  });

  it('updates penalties and deletes solves', async () => {
    const repository = createMemoryTimerSessionRepository();
    const custom = await repository.createSession('练习', 1000);
    await repository.addSolve({
      id: 'solve',
      sessionId: custom.id,
      eventId: '333',
      scramble: 'R U',
      elapsedMs: 1100,
      penalty: 'none',
      createdAt: 10,
    });

    expect((await repository.updateSolvePenalty('solve', 'dnf')).penalty).toBe('dnf');
    await repository.deleteSolve('solve');
    expect(await repository.listSolves(custom.id)).toEqual([]);
  });
});
```

- [ ] **Step 3: Implement IndexedDB adapter**

Create `apps/web/src/timer/storage/timer-session-db.ts` with:

```ts
import { WCA_EVENT_IDS } from '@cubegin/scramble-puzzle';
import {
  createDefaultSession,
  sortSessionsByCreatedDesc,
  sortSolvesByCreatedDesc,
  type SolvePenalty,
  type SolveRecord,
  type SolveSession,
  type TimerSessionRepository,
} from '@cubegin/timer-session';

const DB_NAME = 'cubegin-timer';
const DB_VERSION = 1;
const SESSION_STORE = 'sessions';
const SOLVE_STORE = 'solves';

const openTimerDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open timer database'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        const sessions = db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
        sessions.createIndex('createdAt', 'createdAt');
        sessions.createIndex('isDefault', 'isDefault');
        sessions.createIndex('eventId', 'eventId');
      }
      if (!db.objectStoreNames.contains(SOLVE_STORE)) {
        const solves = db.createObjectStore(SOLVE_STORE, { keyPath: 'id' });
        solves.createIndex('sessionId', 'sessionId');
        solves.createIndex('eventId', 'eventId');
        solves.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    request.onsuccess = () => resolve(request.result);
  });

export const createIndexedDbTimerSessionRepository = async (): Promise<TimerSessionRepository> => {
  const db = await openTimerDb();
  const tx = <T>(
    storeName: string,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => Promise<T>,
  ) => run(db.transaction(storeName, mode).objectStore(storeName));

  const getAllSessions = () =>
    tx(SESSION_STORE, 'readonly', async (store) =>
      sortSessionsByCreatedDesc((await requestToPromise(store.getAll())) as SolveSession[]),
    );

  return {
    async initializeDefaultSessions(now) {
      const existing = new Set((await getAllSessions()).map((session) => session.id));
      await tx(SESSION_STORE, 'readwrite', async (store) => {
        await Promise.all(
          WCA_EVENT_IDS.map((eventId, index) => {
            const session = createDefaultSession(eventId, now + index);
            return existing.has(session.id)
              ? Promise.resolve(session.id)
              : requestToPromise(store.put(session));
          }),
        );
      });
      return getAllSessions();
    },
    async listSessions() {
      return getAllSessions();
    },
    async createSession(name, now) {
      const session: SolveSession = {
        id: crypto.randomUUID(),
        name,
        isDefault: false,
        createdAt: now,
      };
      await tx(SESSION_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.put(session));
      });
      return session;
    },
    async deleteSession(sessionId) {
      await tx(SESSION_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.delete(sessionId));
      });
      const sessionSolves = await this.listSolves(sessionId);
      await tx(SOLVE_STORE, 'readwrite', async (store) => {
        await Promise.all(sessionSolves.map((solve) => requestToPromise(store.delete(solve.id))));
      });
    },
    async listSolves(sessionId) {
      return tx(SOLVE_STORE, 'readonly', async (store) => {
        const index = store.index('sessionId');
        const records = (await requestToPromise(index.getAll(sessionId))) as SolveRecord[];
        return sortSolvesByCreatedDesc(records);
      });
    },
    async addSolve(record) {
      await tx(SOLVE_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.put(record));
      });
      return record;
    },
    async updateSolvePenalty(solveId, penalty: SolvePenalty) {
      return tx(SOLVE_STORE, 'readwrite', async (store) => {
        const solve = (await requestToPromise(store.get(solveId))) as SolveRecord | undefined;
        if (!solve) throw new Error(`Solve not found: ${solveId}`);
        const updated = { ...solve, penalty };
        await requestToPromise(store.put(updated));
        return updated;
      });
    },
    async deleteSolve(solveId) {
      await tx(SOLVE_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.delete(solveId));
      });
    },
  };
};
```

- [ ] **Step 4: Run storage tests**

Run:

```bash
corepack pnpm --filter web test -- timer-session-db.test.ts
```

Expected: repository contract tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/timer/storage
git commit -m "feat: add timer session storage"
```

---

### Task 4: Add `useTimerSessions` Hook

**Files:**

- Create: `apps/web/src/timer/hooks/use-timer-sessions.ts`
- Create: `apps/web/src/timer/hooks/use-timer-sessions.test.tsx`

- [ ] **Step 1: Write hook tests**

Create `apps/web/src/timer/hooks/use-timer-sessions.test.tsx` using `renderHook`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getDefaultSessionId } from '@cubegin/timer-session';
import { createMemoryTimerSessionRepository } from '../storage/memory-timer-session-repository';
import { useTimerSessions } from './use-timer-sessions';

describe('useTimerSessions', () => {
  it('initializes default sessions and starts on 333', async () => {
    const repository = createMemoryTimerSessionRepository();
    const { result } = renderHook(() => useTimerSessions({ repository }));

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.eventId).toBe('333');
    expect(result.current.activeSessionId).toBe(getDefaultSessionId('333'));
    expect(
      result.current.sessions.some((session) => session.id === getDefaultSessionId('222')),
    ).toBe(true);
  });

  it('switches event changes to default sessions', async () => {
    const repository = createMemoryTimerSessionRepository();
    const { result } = renderHook(() => useTimerSessions({ repository }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => result.current.selectEvent('222'));

    expect(result.current.eventId).toBe('222');
    expect(result.current.activeSessionId).toBe(getDefaultSessionId('222'));
  });

  it('keeps an empty custom session on the current event', async () => {
    const repository = createMemoryTimerSessionRepository();
    const { result } = renderHook(() => useTimerSessions({ repository }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => result.current.createSession('练习'));
    const custom = result.current.sessions.find((session) => session.name === '练习');

    await act(async () => result.current.selectSession(custom!.id));

    expect(result.current.eventId).toBe('333');
    expect(result.current.activeSessionId).toBe(custom!.id);
  });

  it('saves solves and switches custom sessions by newest solve event', async () => {
    const repository = createMemoryTimerSessionRepository();
    const { result } = renderHook(() => useTimerSessions({ repository }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => result.current.createSession('练习'));
    const custom = result.current.sessions.find((session) => session.name === '练习')!;
    await act(async () => result.current.selectSession(custom.id));
    await act(async () =>
      result.current.saveSolve({
        eventId: '555',
        scramble: 'R U F',
        elapsedMs: 1234,
        penalty: '+2',
      }),
    );
    await act(async () => result.current.selectEvent('333'));
    await act(async () => result.current.selectSession(custom.id));

    expect(result.current.eventId).toBe('555');
    expect(result.current.solves[0].penalty).toBe('+2');
  });

  it('updates penalties and deletes solves', async () => {
    const repository = createMemoryTimerSessionRepository();
    const { result } = renderHook(() => useTimerSessions({ repository }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () =>
      result.current.saveSolve({
        eventId: '333',
        scramble: 'R U',
        elapsedMs: 1000,
        penalty: 'none',
      }),
    );
    const solveId = result.current.solves[0].id;

    await act(async () => result.current.updateSolvePenalty(solveId, 'dnf'));
    expect(result.current.solves[0].penalty).toBe('dnf');

    await act(async () => result.current.deleteSolve(solveId));
    expect(result.current.solves).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement the hook**

Create `apps/web/src/timer/hooks/use-timer-sessions.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WcaEventId } from '@cubegin/scramble-puzzle';
import {
  canDeleteSession,
  getDefaultSessionId,
  resolveEventChange,
  resolveSessionChange,
  type SolvePenalty,
  type SolveRecord,
  type SolveSession,
  type TimerSessionRepository,
} from '@cubegin/timer-session';

interface SaveSolveInput {
  eventId: WcaEventId;
  scramble: string;
  elapsedMs: number;
  penalty: SolvePenalty;
}

interface UseTimerSessionsOptions {
  repository: TimerSessionRepository;
  now?: () => number;
  createId?: () => string;
}

export const useTimerSessions = ({
  repository,
  now = () => Date.now(),
  createId = () => crypto.randomUUID(),
}: UseTimerSessionsOptions) => {
  const [sessions, setSessions] = useState<SolveSession[]>([]);
  const [solves, setSolves] = useState<SolveRecord[]>([]);
  const [eventId, setEventId] = useState<WcaEventId>('333');
  const [activeSessionId, setActiveSessionId] = useState(getDefaultSessionId('333'));
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>();

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions],
  );

  const refreshSessions = useCallback(async () => {
    setSessions(await repository.listSessions());
  }, [repository]);

  const refreshSolves = useCallback(
    async (sessionId = activeSessionId) => {
      setSolves(await repository.listSolves(sessionId));
    },
    [activeSessionId, repository],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const initialized = await repository.initializeDefaultSessions(now());
        if (cancelled) return;
        setSessions(initialized);
        setActiveSessionId(getDefaultSessionId('333'));
        setSolves(await repository.listSolves(getDefaultSessionId('333')));
        setIsReady(true);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [now, repository]);

  const selectEvent = useCallback(
    async (nextEventId: WcaEventId) => {
      const transition = resolveEventChange(nextEventId);
      setEventId(transition.eventId);
      setActiveSessionId(transition.sessionId);
      await refreshSessions();
      await refreshSolves(transition.sessionId);
      return transition;
    },
    [refreshSessions, refreshSolves],
  );

  const selectSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return undefined;
      const sessionSolves = await repository.listSolves(sessionId);
      const transition = resolveSessionChange(session, sessionSolves, eventId);
      setActiveSessionId(sessionId);
      setSolves(sessionSolves);
      setEventId(transition.eventId);
      return transition;
    },
    [eventId, repository, sessions],
  );

  const createSession = useCallback(
    async (name: string) => {
      const session = await repository.createSession(name, now());
      await refreshSessions();
      setActiveSessionId(session.id);
      setSolves([]);
      return session;
    },
    [now, refreshSessions, repository],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session || !canDeleteSession(session)) return;
      await repository.deleteSession(sessionId);
      await refreshSessions();
      const fallback = getDefaultSessionId(eventId);
      setActiveSessionId(fallback);
      setSolves(await repository.listSolves(fallback));
    },
    [eventId, refreshSessions, repository, sessions],
  );

  const saveSolve = useCallback(
    async (input: SaveSolveInput) => {
      const record = await repository.addSolve({
        id: createId(),
        sessionId: activeSessionId,
        createdAt: now(),
        ...input,
      });
      await refreshSolves(activeSessionId);
      return record;
    },
    [activeSessionId, createId, now, refreshSolves, repository],
  );

  const updateSolvePenalty = useCallback(
    async (solveId: string, penalty: SolvePenalty) => {
      const updated = await repository.updateSolvePenalty(solveId, penalty);
      await refreshSolves(activeSessionId);
      return updated;
    },
    [activeSessionId, refreshSolves, repository],
  );

  const deleteSolve = useCallback(
    async (solveId: string) => {
      await repository.deleteSolve(solveId);
      await refreshSolves(activeSessionId);
    },
    [activeSessionId, refreshSolves, repository],
  );

  return {
    activeSession,
    activeSessionId,
    canDeleteActiveSession: activeSession ? canDeleteSession(activeSession) : false,
    createSession,
    deleteSession,
    deleteSolve,
    error,
    eventId,
    isReady,
    saveSolve,
    selectEvent,
    selectSession,
    sessions,
    solves,
    updateSolvePenalty,
  };
};
```

- [ ] **Step 3: Run hook tests**

Run:

```bash
corepack pnpm --filter web test -- use-timer-sessions.test.tsx
```

Expected: hook tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/timer/hooks/use-timer-sessions.ts apps/web/src/timer/hooks/use-timer-sessions.test.tsx
git commit -m "feat: add web timer session hook"
```

---

### Task 5: Update Gesture and Result Action Behavior

**Files:**

- Modify: `apps/web/src/timer/hooks/use-timer-gesture.ts`
- Modify: `apps/web/src/timer/hooks/use-timer-gesture.test.ts`
- Modify: `apps/web/src/timer/components/elapsed-display.tsx`
- Modify: `apps/web/src/timer/components/result-actions.tsx`
- Modify: `apps/web/src/timer/views/result-view.tsx`
- Modify: `apps/web/src/timer/views/result-view.test.tsx`

- [ ] **Step 1: Update gesture tests for Enter**

Modify `apps/web/src/timer/hooks/use-timer-gesture.test.ts` with cases:

```ts
it('starts on Enter key down when idle', () => {
  const onStart = vi.fn();
  renderHook(() => useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }));

  fireEvent.keyDown(document, { code: 'Enter' });

  expect(onStart).toHaveBeenCalledTimes(1);
});

it('stops on Enter key down when running', () => {
  const onStop = vi.fn();
  renderHook(() => useTimerGesture(true, { onStart: vi.fn(), onStop, onCancel: vi.fn() }));

  fireEvent.keyDown(document, { code: 'Enter' });

  expect(onStop).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Implement Enter support**

Update `useTimerGesture` keydown handling:

```ts
if (e.code === 'Enter' && !e.repeat) {
  e.preventDefault();
  if (isRunningRef.current) {
    onStopRef.current();
  } else {
    onStartRef.current();
  }
  return;
}
```

Keep existing Space behavior unless it conflicts with input controls. If focus is inside `input`, `textarea`, `select`, or a content-editable element, ignore keyboard start/stop.

- [ ] **Step 3: Set Helvetica timer font**

Update `apps/web/src/timer/components/elapsed-display.tsx` so the display style uses:

```ts
fontFamily: 'Helvetica, Arial, sans-serif';
```

- [ ] **Step 4: Write result action tests**

Create or extend `apps/web/src/timer/views/result-view.test.tsx`:

```ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResultView } from './result-view';

describe('ResultView', () => {
  it('exposes continue, +2, DNF, and delete actions', async () => {
    const onContinue = vi.fn();
    const onPlusTwo = vi.fn();
    const onDnf = vi.fn();
    const onDelete = vi.fn();

    render(
      <ResultView
        elapsed={1234}
        scramble="R U"
        onContinue={onContinue}
        onPlusTwo={onPlusTwo}
        onDnf={onDnf}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '继续' }));
    await userEvent.click(screen.getByRole('button', { name: '+2' }));
    await userEvent.click(screen.getByRole('button', { name: 'DNF' }));
    await userEvent.click(screen.getByRole('button', { name: '删除' }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onPlusTwo).toHaveBeenCalledTimes(1);
    expect(onDnf).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5: Implement result action components**

Update `ResultActions` props:

```ts
interface ResultActionsProps {
  onContinue: () => void;
  onPlusTwo: () => void;
  onDnf: () => void;
  onDelete: () => void;
}
```

Render one primary `继续` button and three secondary/destructive actions: `+2`, `DNF`, `删除`.

Update `ResultView` props to pass these four callbacks directly and remove local penalty toggle state.

- [ ] **Step 6: Run focused tests**

Run:

```bash
corepack pnpm --filter web test -- use-timer-gesture.test.ts result-view.test.tsx
```

Expected: gesture and result view tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/timer/hooks/use-timer-gesture.ts apps/web/src/timer/hooks/use-timer-gesture.test.ts apps/web/src/timer/components/elapsed-display.tsx apps/web/src/timer/components/result-actions.tsx apps/web/src/timer/views/result-view.tsx apps/web/src/timer/views/result-view.test.tsx
git commit -m "feat: update timer result actions"
```

---

### Task 6: Build Session UI Components

**Files:**

- Create: `apps/web/src/timer/components/session-selector.tsx`
- Create: `apps/web/src/timer/components/solve-list.tsx`
- Create: `apps/web/src/timer/components/solve-detail.tsx`
- Create: `apps/web/src/timer/components/storage-alert.tsx`
- Create: `apps/web/src/timer/components/session-components.test.tsx`

- [ ] **Step 1: Write component tests**

Create `apps/web/src/timer/components/session-components.test.tsx`:

```ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SessionSelector } from './session-selector';
import { SolveDetail } from './solve-detail';
import { SolveList } from './solve-list';

const sessions = [
  { id: 'default:333', name: '3×3×3', eventId: '333' as const, isDefault: true, createdAt: 1 },
  { id: 'custom', name: '练习', isDefault: false, createdAt: 2 },
];

const solves = [
  {
    id: 'new',
    sessionId: 'custom',
    eventId: '333' as const,
    scramble: 'R U',
    elapsedMs: 1234,
    penalty: '+2' as const,
    createdAt: 2000,
  },
  {
    id: 'old',
    sessionId: 'custom',
    eventId: '222' as const,
    scramble: 'R U R',
    elapsedMs: 1000,
    penalty: 'none' as const,
    createdAt: 1000,
  },
];

describe('session components', () => {
  it('selects and creates sessions', async () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();
    render(
      <SessionSelector
        sessions={sessions}
        activeSessionId="default:333"
        canDeleteActiveSession={false}
        onCreateSession={onCreate}
        onDeleteActiveSession={vi.fn()}
        onSelectSession={onSelect}
      />,
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: '成绩列表' }), 'custom');
    await userEvent.click(screen.getByRole('button', { name: '新建列表' }));

    expect(onSelect).toHaveBeenCalledWith('custom');
    expect(onCreate).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '删除列表' })).toBeDisabled();
  });

  it('shows reverse sequence numbers and displayed times', () => {
    render(<SolveList solves={solves} onSelectSolve={vi.fn()} />);

    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('3.234')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('edits penalty and deletes from detail', async () => {
    const onPenalty = vi.fn();
    const onDelete = vi.fn();
    render(
      <SolveDetail
        solve={solves[0]}
        onClose={vi.fn()}
        onDelete={onDelete}
        onPenaltyChange={onPenalty}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'DNF' }));
    await userEvent.click(screen.getByRole('button', { name: '删除成绩' }));

    expect(onPenalty).toHaveBeenCalledWith('new', 'dnf');
    expect(onDelete).toHaveBeenCalledWith('new');
  });
});
```

- [ ] **Step 2: Implement `SessionSelector`**

Use native `select` if no Deweyou select is available. Use Deweyou `Button` for create/delete.

Behavior:

- `aria-label="成绩列表"` on the select.
- `新建列表` prompts for a name with a simple controlled input or `window.prompt('列表名称')`; use controlled input if it keeps styling acceptable.
- `删除列表` is disabled when `canDeleteActiveSession` is false.

- [ ] **Step 3: Implement `SolveList`**

Render compact rows as buttons. Use `getReverseSequenceNumber` and `getSolveDisplayText` from `@cubegin/timer-session`.

Each row includes:

- `#${sequence}`
- display text
- event label
- penalty marker for +2/DNF
- compact creation time from `new Date(createdAt).toLocaleString()`

- [ ] **Step 4: Implement `SolveDetail`**

Render a modal-like fixed overlay or dialog-like panel:

- result display
- event label
- scramble text
- `<ScrambleImage svg={renderScrambleImage(solve.eventId, solve.scramble)} />`
- creation time
- three penalty buttons: `无`, `+2`, `DNF`
- `删除成绩`
- close button

Catch `renderScrambleImage` errors and show an image error message.

- [ ] **Step 5: Implement `StorageAlert`**

Render nothing when `message` is undefined. Otherwise render compact text: `成绩暂时无法保存：${message}`.

- [ ] **Step 6: Run component tests**

Run:

```bash
corepack pnpm --filter web test -- session-components.test.tsx
```

Expected: session component tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/timer/components
git commit -m "feat: add timer session components"
```

---

### Task 7: Integrate Sessions into TimerPage

**Files:**

- Modify: `apps/web/src/timer/timer-page.tsx`
- Modify: `apps/web/src/timer/timer-page.test.tsx`
- Modify: `apps/web/src/timer/views/scramble-view.tsx`
- Modify: `apps/web/src/timer/views/timing-view.tsx`

- [ ] **Step 1: Extend TimerPage tests for full flow**

Modify `apps/web/src/timer/timer-page.test.tsx` to mock storage with the memory repository and assert:

```ts
it('starts with the start button, saves +2, and lists the solve', async () => {
  generate
    .mockResolvedValueOnce({ eventId: '333', scramble: 'R U' })
    .mockResolvedValueOnce({ eventId: '333', scramble: 'F R' });

  render(<TimerPage />);

  await screen.findAllByText('R U');
  await userEvent.click(screen.getByRole('button', { name: '开始' }));
  await userEvent.keyboard('{Enter}');
  await userEvent.click(await screen.findByRole('button', { name: '+2' }));

  expect(await screen.findByText('+2')).toBeInTheDocument();
  expect(await screen.findByText('F R')).toBeInTheDocument();
});

it('discards deleted results without adding a solve row', async () => {
  generate
    .mockResolvedValueOnce({ eventId: '333', scramble: 'R U' })
    .mockResolvedValueOnce({ eventId: '333', scramble: 'F R' });

  render(<TimerPage />);

  await screen.findAllByText('R U');
  await userEvent.click(screen.getByRole('button', { name: '开始' }));
  await userEvent.keyboard('{Enter}');
  await userEvent.click(await screen.findByRole('button', { name: '删除' }));

  expect(screen.queryByText('#1')).not.toBeInTheDocument();
  expect(await screen.findByText('F R')).toBeInTheDocument();
});

it('switches event changes to the matching default list', async () => {
  generate
    .mockResolvedValueOnce({ eventId: '333', scramble: 'R U' })
    .mockResolvedValueOnce({ eventId: '222', scramble: 'R U R' });

  render(<TimerPage />);

  await screen.findAllByText('R U');
  await userEvent.selectOptions(screen.getByRole('combobox', { name: '魔方类型' }), '222');

  expect(screen.getByRole('combobox', { name: '成绩列表' })).toHaveValue('default:222');
});
```

Use fake timers or mock `useTimer` only if real elapsed assertions become flaky; the persistence checks only need a nonzero elapsed.

- [ ] **Step 2: Allow repository injection for tests**

Update `TimerPage` signature:

```ts
interface TimerPageProps {
  repository?: TimerSessionRepository;
}

export const TimerPage = ({ repository: injectedRepository }: TimerPageProps) => {
  // create IndexedDB repository when no injection exists
};
```

In tests, render `<TimerPage repository={createMemoryTimerSessionRepository()} />`.

- [ ] **Step 3: Create repository on mount**

In `TimerPage`, use state for `repository`:

```ts
const [repository, setRepository] = useState<TimerSessionRepository | null>(
  injectedRepository ?? null,
);

useEffect(() => {
  if (injectedRepository) return;
  let cancelled = false;
  void createIndexedDbTimerSessionRepository()
    .then((dbRepository) => {
      if (!cancelled) setRepository(dbRepository);
    })
    .catch((cause) => {
      if (!cancelled) {
        setStorageError(cause instanceof Error ? cause.message : String(cause));
        setRepository(createMemoryTimerSessionRepository());
      }
    });
  return () => {
    cancelled = true;
  };
}, [injectedRepository]);
```

- [ ] **Step 4: Integrate `useTimerSessions`**

Only render the full timer once `repository` exists. Then call:

```ts
const sessions = useTimerSessions({ repository });
```

Use `sessions.eventId` as the authoritative current event. Remove the old independent `eventId` state.

- [ ] **Step 5: Wire event/session changes to scramble loading**

Replace old event change handler:

```ts
const handleEventChange = useCallback(
  async (id: WcaEventId) => {
    setScramble('');
    setScrambleError(undefined);
    setIsScrambleLoading(true);
    const transition = await sessions.selectEvent(id);
    if (transition?.shouldGenerateScramble) void loadScramble(transition.eventId);
  },
  [loadScramble, sessions],
);
```

Add session change handler with `sessions.selectSession(id)`.

- [ ] **Step 6: Wire result actions**

Use one helper:

```ts
const finishResult = useCallback(
  async (penalty?: SolvePenalty) => {
    if (penalty) {
      await sessions.saveSolve({
        eventId: sessions.eventId,
        scramble,
        elapsedMs: finalElapsed,
        penalty,
      });
    }
    reset();
    setPageState('scramble');
    void loadScramble(sessions.eventId);
  },
  [finalElapsed, loadScramble, reset, scramble, sessions],
);
```

Map buttons:

- `继续` -> `finishResult('none')`
- `+2` -> `finishResult('+2')`
- `DNF` -> `finishResult('dnf')`
- `删除` -> `finishResult(undefined)`

- [ ] **Step 7: Add detail state and handlers**

Track `selectedSolveId`; derive selected solve from `sessions.solves`.

Render `SolveDetail` when selected. Wire:

- `onPenaltyChange` -> `sessions.updateSolvePenalty`
- `onDelete` -> `sessions.deleteSolve` and close detail
- `onClose` -> clear selected id

- [ ] **Step 8: Update ScrambleView layout**

Add props:

```ts
sessionPanel: ReactNode;
onStart: () => void;
```

Render a responsive two-column layout with:

- left/center timer controls
- right/below session panel
- `开始` Deweyou button disabled when loading or error exists

Use `aria-label="魔方类型"` on event selector.

- [ ] **Step 9: Run TimerPage tests**

Run:

```bash
corepack pnpm --filter web test -- timer-page.test.tsx
```

Expected: all TimerPage tests pass.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/timer
git commit -m "feat: persist web timer solves"
```

---

### Task 8: Polish Responsive Styling and Runtime UX

**Files:**

- Modify/Create: component CSS modules or inline styles under `apps/web/src/timer/**`
- Modify: `apps/web/src/timer/components/event-selector.tsx`
- Modify: `apps/web/src/timer/views/scramble-view.tsx`

- [ ] **Step 1: Inspect available Deweyou components**

Run:

```bash
rg -n "export .*Select|select" node_modules/@deweyou-design apps/web/node_modules/@deweyou-design -g '*.d.ts' -g '*.js' -g '*.mjs'
```

Expected: know whether a Deweyou Select exists. If it exists, use it; if not, keep the native select with design-system colors.

- [ ] **Step 2: Add stable responsive dimensions**

Ensure these elements have stable dimensions:

- event selector row
- scramble image area
- start button
- timer display
- result buttons
- solve list rows
- detail panel

Use `min-height`, `max-width`, `grid-template-columns`, and responsive media queries. Do not use viewport-scaled font sizes for compact controls.

- [ ] **Step 3: Avoid visual regressions**

Check CSS color usage and keep the palette balanced. Do not introduce decorative gradient blobs, nested cards, or landing-page hero treatment.

- [ ] **Step 4: Run web tests**

Run:

```bash
corepack pnpm --filter web test
```

Expected: all web tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/timer
git commit -m "style: polish timer session UI"
```

---

### Task 9: Update Repository Memory and Final Verification

**Files:**

- Modify: `docs/project-structure.md`
- Modify: `docs/timer-workflow.md`
- Modify: `docs/.state.md`
- Modify: `docs/.todo.md` only if new follow-up work remains

- [ ] **Step 1: Update durable docs**

Update docs to mention:

- `packages/timer-session` owns session and solve rules.
- `apps/web` persists solve history through IndexedDB.
- TimerPage now has session/list/detail workflow.
- wx-app can reuse `@cubegin/timer-session` with a future storage adapter.

- [ ] **Step 2: Run root verification**

Run:

```bash
corepack pnpm test
corepack pnpm check
corepack pnpm build:web
```

Expected: all commands pass.

- [ ] **Step 3: Run local app**

Start dev server:

```bash
corepack pnpm dev:web
```

Expected: Vite dev server starts and prints a local URL.

- [ ] **Step 4: Browser verification**

Open the local URL in the in-app browser and verify:

- desktop viewport shows timer plus session panel without overlap
- mobile viewport stacks timer and session panel cleanly
- event selector changes the scramble and active default session
- start button starts timing
- Enter starts and stops timing
- continue saves a normal solve
- +2 saves adjusted display
- DNF saves invalid display
- delete does not save
- custom session can be created and deleted
- default session delete control is disabled
- solve detail shows scramble image and supports penalty edit/delete

- [ ] **Step 5: Stop dev server**

Terminate the dev server session. Do not leave long-running shell sessions active.

- [ ] **Step 6: Commit docs**

```bash
git add docs/project-structure.md docs/timer-workflow.md docs/.state.md docs/.todo.md
git commit -m "docs: update timer session memory"
```

---

## Self-Review

Spec coverage:

- Event switching, scramble text/image, start button, Enter start/stop: covered by Tasks 5, 7, and 9.
- Result actions and save/delete behavior: covered by Tasks 5 and 7.
- Solve record fields: covered by Task 2 types and Task 7 save flow.
- Default/custom session rules: covered by Tasks 2, 4, 6, and 7.
- Custom session deletion and protected defaults: covered by Tasks 2, 4, 6, and 9.
- Reverse ordered solve list, sequence numbers, millisecond display: covered by Tasks 2 and 6.
- Solve detail with scramble image, creation time, penalty edit, delete: covered by Tasks 6, 7, and 9.
- Helvetica timer digits: covered by Task 5.
- IndexedDB persistence: covered by Task 3 and Task 7.
- Reusable package extraction: covered by Tasks 1 and 2.
- Styling and Deweyou UI use: covered by Tasks 6, 8, and 9.

Placeholder scan: no unresolved markers or ambiguous task gaps are intentionally left in this plan.

Type consistency:

- Package exports are defined before web imports.
- `SolvePenalty`, `SolveRecord`, `SolveSession`, and `TimerSessionRepository` names are consistent across package, hook, storage, and UI tasks.
- Event/session transition functions return a shared `SessionTransition`.
