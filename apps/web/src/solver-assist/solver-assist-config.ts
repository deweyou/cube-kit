import type { PuzzleAssistEventId, PuzzleAssistMethod } from '@cubegin/solver';
import type { EventId } from '@cubegin/shared/events';

export type SolverAssistEventId = Extract<
  EventId,
  '333' | '333oh' | '333fm' | '222' | 'sq1' | 'pyram' | 'skewb'
>;

export type SolverAssistPresentation = 'alternatives' | 'staged' | 'single';

export interface SolverAssistMethodOption {
  readonly label: string;
  readonly method: PuzzleAssistMethod;
  readonly presentation: SolverAssistPresentation;
}

const THREE_BY_THREE_SPEED_METHODS = [
  { method: 'cross', label: 'Cross', presentation: 'alternatives' },
  { method: 'xcross', label: 'XCross', presentation: 'alternatives' },
  { method: 'eoline', label: 'EOline', presentation: 'alternatives' },
  { method: 'roux-s1', label: 'Roux S1', presentation: 'alternatives' },
  { method: 'roux-s2', label: 'Roux S2', presentation: 'staged' },
  { method: 'cfop-f2l', label: 'CFOP F2L', presentation: 'staged' },
  { method: 'zz-f2l', label: 'ZZ F2L', presentation: 'staged' },
] as const satisfies readonly SolverAssistMethodOption[];

const SOLVER_ASSIST_METHODS = {
  '333': THREE_BY_THREE_SPEED_METHODS,
  '333oh': THREE_BY_THREE_SPEED_METHODS,
  '333fm': [
    { method: 'cross', label: 'Cross', presentation: 'alternatives' },
    { method: 'xcross', label: 'XCross', presentation: 'alternatives' },
    { method: 'eoline', label: 'EOline', presentation: 'alternatives' },
    { method: 'eofc', label: 'EOFC', presentation: 'alternatives' },
    { method: 'petrus-s1', label: 'Petrus S1', presentation: 'alternatives' },
    { method: 'petrus-s2', label: 'Petrus S2', presentation: 'staged' },
    { method: 'eo-dr', label: 'EO + DR', presentation: 'staged' },
    { method: 'block-222', label: '2×2×2 Block', presentation: 'alternatives' },
  ],
  '222': [
    { method: '222-face', label: 'Face', presentation: 'alternatives' },
    { method: '222-layer', label: 'Layer', presentation: 'alternatives' },
  ],
  sq1: [
    { method: 'sq1-shape-ftm', label: 'Shape FTM', presentation: 'single' },
    { method: 'sq1-shape-twist', label: 'Shape Twist', presentation: 'single' },
  ],
  pyram: [{ method: 'pyraminx-v', label: 'V', presentation: 'alternatives' }],
  skewb: [{ method: 'skewb-face', label: 'Face', presentation: 'alternatives' }],
} as const satisfies Record<SolverAssistEventId, readonly SolverAssistMethodOption[]>;

const SOLVER_EVENT_IDS: Record<SolverAssistEventId, PuzzleAssistEventId> = {
  '333': '333',
  '333oh': '333',
  '333fm': '333',
  '222': '222',
  sq1: 'sq1',
  pyram: 'pyram',
  skewb: 'skewb',
};

export const isSolverAssistEvent = (eventId: EventId): eventId is SolverAssistEventId =>
  Object.hasOwn(SOLVER_ASSIST_METHODS, eventId);

export const getSolverAssistMethods = (
  eventId: SolverAssistEventId,
): readonly SolverAssistMethodOption[] => SOLVER_ASSIST_METHODS[eventId];

export const getDefaultSolverAssistMethod = (eventId: SolverAssistEventId): PuzzleAssistMethod =>
  SOLVER_ASSIST_METHODS[eventId][0].method;

export const isSolverAssistMethodForEvent = (
  eventId: SolverAssistEventId,
  method: PuzzleAssistMethod,
): boolean => SOLVER_ASSIST_METHODS[eventId].some((option) => option.method === method);

export const getSolverAssistMethodOption = (
  eventId: SolverAssistEventId,
  method: PuzzleAssistMethod,
): SolverAssistMethodOption =>
  SOLVER_ASSIST_METHODS[eventId].find((option) => option.method === method) ??
  SOLVER_ASSIST_METHODS[eventId][0];

export const getPuzzleAssistEventId = (eventId: SolverAssistEventId): PuzzleAssistEventId =>
  SOLVER_EVENT_IDS[eventId];
