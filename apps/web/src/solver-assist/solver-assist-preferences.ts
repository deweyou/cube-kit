import type { PuzzleAssistMethod } from '@cubegin/solver';
import {
  getDefaultSolverAssistMethod,
  isSolverAssistMethodForEvent,
  type SolverAssistEventId,
} from './solver-assist-config';

const SOLVER_ASSIST_METHODS_STORAGE_KEY = 'cubegin-solver-assist-methods';
const SOLVER_ASSIST_TARGET_ORDERS_STORAGE_KEY = 'cubegin-solver-assist-target-orders';

type StoredSolverAssistMethods = Partial<Record<SolverAssistEventId, PuzzleAssistMethod>>;
type StoredSolverAssistTargetOrders = Partial<Record<PuzzleAssistMethod, unknown>>;

const normalizeTargetOrder = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value.filter((target): target is string => typeof target === 'string' && target.length > 0),
    ),
  ];
};

const readStoredMethods = (): StoredSolverAssistMethods => {
  try {
    const storedValue = localStorage.getItem(SOLVER_ASSIST_METHODS_STORAGE_KEY);
    if (storedValue === null) return {};

    const parsedValue: unknown = JSON.parse(storedValue);
    return typeof parsedValue === 'object' && parsedValue !== null
      ? (parsedValue as StoredSolverAssistMethods)
      : {};
  } catch {
    return {};
  }
};

const readStoredTargetOrders = (): StoredSolverAssistTargetOrders => {
  try {
    const storedValue = localStorage.getItem(SOLVER_ASSIST_TARGET_ORDERS_STORAGE_KEY);
    if (storedValue === null) return {};

    const parsedValue: unknown = JSON.parse(storedValue);
    return typeof parsedValue === 'object' && parsedValue !== null
      ? (parsedValue as StoredSolverAssistTargetOrders)
      : {};
  } catch {
    return {};
  }
};

export const readSolverAssistMethod = (eventId: SolverAssistEventId): PuzzleAssistMethod => {
  const storedMethod = readStoredMethods()[eventId];
  return storedMethod !== undefined && isSolverAssistMethodForEvent(eventId, storedMethod)
    ? storedMethod
    : getDefaultSolverAssistMethod(eventId);
};

export const writeSolverAssistMethod = (
  eventId: SolverAssistEventId,
  method: PuzzleAssistMethod,
): void => {
  if (!isSolverAssistMethodForEvent(eventId, method)) return;

  try {
    localStorage.setItem(
      SOLVER_ASSIST_METHODS_STORAGE_KEY,
      JSON.stringify({ ...readStoredMethods(), [eventId]: method }),
    );
  } catch {
    // Formula viewing still works when browser storage is unavailable.
  }
};

export const readSolverAssistTargetOrder = (method: PuzzleAssistMethod): string[] =>
  normalizeTargetOrder(readStoredTargetOrders()[method]);

export const writeSolverAssistTargetOrder = (
  method: PuzzleAssistMethod,
  targets: readonly string[],
): void => {
  try {
    localStorage.setItem(
      SOLVER_ASSIST_TARGET_ORDERS_STORAGE_KEY,
      JSON.stringify({
        ...readStoredTargetOrders(),
        [method]: normalizeTargetOrder(targets),
      }),
    );
  } catch {
    // Formula viewing and reordering still work when browser storage is unavailable.
  }
};
