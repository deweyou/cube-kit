import {
  solvePuzzleAssist,
  type PuzzleAssistEventId,
  type PuzzleAssistMethod,
  type PuzzleAssistOptions,
} from '@cubegin/solver';

import { CliError } from '../errors.js';

const SOLVER_METHODS = {
  '333': [
    'cross',
    'xcross',
    'eoline',
    'eofc',
    'roux-s1',
    'roux-s2',
    'petrus-s1',
    'petrus-s2',
    'cfop-f2l',
    'zz-f2l',
    'block-222',
    'eo-dr',
    '333-two-phase',
    '333-general',
  ],
  '222': ['222-face', '222-layer'],
  sq1: ['sq1-shape-ftm', 'sq1-shape-twist'],
  pyram: ['pyraminx-v'],
  skewb: ['skewb-face'],
} as const satisfies Record<PuzzleAssistEventId, readonly PuzzleAssistMethod[]>;

const SOLVER_EVENT_ORDER = [
  '333',
  '222',
  'sq1',
  'pyram',
  'skewb',
] as const satisfies readonly PuzzleAssistEventId[];

export interface SolverEventItem {
  readonly id: PuzzleAssistEventId;
  readonly methods: readonly PuzzleAssistMethod[];
}

export const listSolverEvents = (): { readonly events: readonly SolverEventItem[] } => ({
  events: SOLVER_EVENT_ORDER.map((id) => ({
    id,
    methods: SOLVER_METHODS[id],
  })),
});

export const listSolverMethods = (
  eventId: string,
): { readonly eventId: PuzzleAssistEventId; readonly methods: readonly PuzzleAssistMethod[] } => {
  const normalizedEventId = parseAssistEventId(eventId);
  return {
    eventId: normalizedEventId,
    methods: SOLVER_METHODS[normalizedEventId],
  };
};

export const runSolverAssist = (
  eventId: string,
  scramble: string,
  methods: readonly string[],
  options: PuzzleAssistOptions = {},
): { readonly eventId: PuzzleAssistEventId; readonly results: ReturnType<typeof solvePuzzleAssist> } => {
  const normalizedEventId = parseAssistEventId(eventId);
  const normalizedMethods = parseMethods(normalizedEventId, methods);

  return {
    eventId: normalizedEventId,
    results: solvePuzzleAssist(normalizedEventId, normalizedMethods, scramble, options),
  };
};

const parseAssistEventId = (eventId: string): PuzzleAssistEventId => {
  if (Object.hasOwn(SOLVER_METHODS, eventId)) return eventId as PuzzleAssistEventId;
  throw new CliError('UNKNOWN_SOLVER_EVENT', `Unsupported solver event id: ${eventId}`, {
    exitCode: 3,
    hints: ['Run `cubegin solver events --json`.'],
  });
};

const parseMethods = (
  eventId: PuzzleAssistEventId,
  methods: readonly string[],
): readonly PuzzleAssistMethod[] => {
  const supported = SOLVER_METHODS[eventId];
  const requested = methods.length > 0 ? methods : supported;

  for (const method of requested) {
    if (!(supported as readonly string[]).includes(method)) {
      throw new CliError('UNKNOWN_SOLVER_METHOD', `Unsupported solver method: ${method}`, {
        exitCode: 3,
        hints: [`Run \`cubegin solver methods ${eventId} --json\`.`],
      });
    }
  }

  return requested as readonly PuzzleAssistMethod[];
};
