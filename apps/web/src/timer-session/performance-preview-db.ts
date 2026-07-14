import type { SolveRecord } from '@cubegin/shared/timer-session';
import { createMemoryTimerSessionDb } from './timer-session-db';
import type { TimerList, TimerSessionDb } from './timer-session-store';

export const PERFORMANCE_PREVIEW_SOLVE_COUNT = 12_000;

const PERFORMANCE_PREVIEW_LIST: TimerList = {
  createdAt: 0,
  id: 'performance:12000',
  isDefault: false,
  name: '性能测试 · 12,000 条',
  scrambleTypeId: '333',
};

const PERFORMANCE_PREVIEW_CREATED_AT = new Date(2026, 6, 10, 12, 0).getTime();

const createPerformancePreviewSolves = (): SolveRecord[] =>
  Array.from({ length: PERFORMANCE_PREVIEW_SOLVE_COUNT }, (_, index): SolveRecord => ({
    createdAt: PERFORMANCE_PREVIEW_CREATED_AT - index * 1_000,
    elapsedMs: 8_000 + ((index * 941) % 18_000),
    eventId: '333',
    id: `${PERFORMANCE_PREVIEW_LIST.id}:${PERFORMANCE_PREVIEW_SOLVE_COUNT - index}`,
    penalty: index % 211 === 0 ? 'dnf' : index % 97 === 0 ? '+2' : 'none',
    scramble: "R U R' U'",
    sessionId: PERFORMANCE_PREVIEW_LIST.id,
  }));

export const shouldUsePerformancePreview = () =>
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('mock') === '12000';

export const createPerformancePreviewTimerSessionDb = (): TimerSessionDb => {
  const memoryDb = createMemoryTimerSessionDb();
  const performanceSolves = createPerformancePreviewSolves();
  let isSeeded = false;

  return {
    ...memoryDb,
    async initialize(defaultLists) {
      if (isSeeded) return;

      await memoryDb.initialize([...defaultLists, PERFORMANCE_PREVIEW_LIST]);
      await Promise.all(performanceSolves.map((solve) => memoryDb.addSolve(solve)));
      await memoryDb.setActiveListId(PERFORMANCE_PREVIEW_LIST.id);
      isSeeded = true;
    },
  };
};
