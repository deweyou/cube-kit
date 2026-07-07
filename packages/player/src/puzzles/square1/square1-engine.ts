import type {
  PlayerMoveTransform,
  PlayerTransformOperation,
  Vector3Like,
} from '../puzzle-adapter.js';

export type SquareOneEngineLayer = 'top' | 'bottom';
export type SquareOneEnginePieceKind = 'corner' | 'edge';
export type SquareOneEquatorOrientation = 0 | 3;

export interface SquareOneEngineSlot {
  readonly layer: SquareOneEngineLayer;
  readonly pieceId: string;
  readonly pieceKind: SquareOneEnginePieceKind;
  readonly slotWidth: 1 | 2;
}

export interface SquareOneEngineState {
  readonly equatorOrientation: SquareOneEquatorOrientation;
  readonly wedges: readonly SquareOneEngineSlot[];
}

export interface SquareOneTupleTurn {
  readonly bottom: number;
  readonly top: number;
}

export type SquareOneEngineMove =
  | { readonly type: 'tuple'; readonly bottom: number; readonly top: number }
  | { readonly type: 'slash' };

export type SquareOneEngineTransform = PlayerMoveTransform<SquareOneEngineMove>;

const TURN_RADIANS = Math.PI / 6;
const TOP_AXIS = { x: 0, y: 1, z: 0 } as const satisfies Vector3Like;
const ZERO_VECTOR = { x: 0, y: 0, z: 0 } as const satisfies Vector3Like;
const SLASH_AXIS = { x: 1, y: 0, z: 0.27 } as const satisfies Vector3Like;

const SOLVED_WEDGE_PATTERN = [
  ['top-corner-0', 'corner'],
  ['top-corner-0', 'corner'],
  ['top-edge-0', 'edge'],
  ['top-corner-1', 'corner'],
  ['top-corner-1', 'corner'],
  ['top-edge-1', 'edge'],
  ['top-corner-2', 'corner'],
  ['top-corner-2', 'corner'],
  ['top-edge-2', 'edge'],
  ['top-corner-3', 'corner'],
  ['top-corner-3', 'corner'],
  ['top-edge-3', 'edge'],
  ['bottom-edge-0', 'edge'],
  ['bottom-corner-0', 'corner'],
  ['bottom-corner-0', 'corner'],
  ['bottom-edge-1', 'edge'],
  ['bottom-corner-1', 'corner'],
  ['bottom-corner-1', 'corner'],
  ['bottom-edge-2', 'edge'],
  ['bottom-corner-2', 'corner'],
  ['bottom-corner-2', 'corner'],
  ['bottom-edge-3', 'edge'],
  ['bottom-corner-3', 'corner'],
  ['bottom-corner-3', 'corner'],
] as const satisfies readonly (readonly [string, SquareOneEnginePieceKind])[];

export const createSolvedSquareOneEngineState = (): SquareOneEngineState => ({
  equatorOrientation: 0,
  wedges: SOLVED_WEDGE_PATTERN.map(([pieceId, pieceKind], index) =>
    Object.freeze({
      layer: index < 12 ? 'top' : 'bottom',
      pieceId,
      pieceKind,
      slotWidth: pieceKind === 'corner' ? 2 : 1,
    }),
  ),
});

const uniquePieceIds = (slots: readonly SquareOneEngineSlot[]): readonly string[] => [
  ...new Set(slots.map((slot) => slot.pieceId)),
];

const withLayerForIndex = (slot: SquareOneEngineSlot, index: number): SquareOneEngineSlot =>
  Object.freeze({
    ...slot,
    layer: index < 12 ? 'top' : 'bottom',
  });

const rotateSlotsRight = (
  slots: readonly SquareOneEngineSlot[],
  amount: number,
): readonly SquareOneEngineSlot[] => {
  const normalizedAmount = ((amount % slots.length) + slots.length) % slots.length;

  if (normalizedAmount === 0) return slots;

  return [
    ...slots.slice(slots.length - normalizedAmount),
    ...slots.slice(0, slots.length - normalizedAmount),
  ];
};

export const describeSquareOneTupleTransform = (
  turn: SquareOneTupleTurn,
  state: SquareOneEngineState,
): SquareOneEngineTransform => {
  const operations: PlayerTransformOperation[] = [];

  if (turn.top !== 0) {
    operations.push({
      affectedPieceIds: uniquePieceIds(state.wedges.slice(0, 12)),
      angleRadians: turn.top * TURN_RADIANS,
      axis: TOP_AXIS,
      pivot: ZERO_VECTOR,
      type: 'axis-rotation',
    });
  }

  if (turn.bottom !== 0) {
    operations.push({
      affectedPieceIds: uniquePieceIds(state.wedges.slice(12)),
      angleRadians: -turn.bottom * TURN_RADIANS,
      axis: TOP_AXIS,
      pivot: ZERO_VECTOR,
      type: 'axis-rotation',
    });
  }

  return {
    move: { type: 'tuple', bottom: turn.bottom, top: turn.top },
    operations,
  };
};

export const describeSquareOneSlashTransform = (
  state: SquareOneEngineState,
): SquareOneEngineTransform => ({
  move: { type: 'slash' },
  operations: [
    {
      affectedPieceIds: uniquePieceIds([
        ...state.wedges.slice(6, 12),
        ...state.wedges.slice(12, 18),
      ]),
      angleRadians: Math.PI,
      axis: SLASH_AXIS,
      pivot: ZERO_VECTOR,
      type: 'axis-rotation',
    },
  ],
});

export const describeSquareOneMoveTransform = (
  move: SquareOneEngineMove,
  state: SquareOneEngineState,
): SquareOneEngineTransform =>
  move.type === 'slash'
    ? describeSquareOneSlashTransform(state)
    : describeSquareOneTupleTransform({ bottom: move.bottom, top: move.top }, state);

const commitTupleTransform = (
  state: SquareOneEngineState,
  move: Extract<SquareOneEngineMove, { readonly type: 'tuple' }>,
): SquareOneEngineState => {
  const topSlots = rotateSlotsRight(state.wedges.slice(0, 12), move.top);
  const bottomSlots = rotateSlotsRight(state.wedges.slice(12), move.bottom);

  return {
    equatorOrientation: state.equatorOrientation,
    wedges: [...topSlots, ...bottomSlots].map(withLayerForIndex),
  };
};

const toggleEquatorOrientation = (
  equatorOrientation: SquareOneEquatorOrientation,
): SquareOneEquatorOrientation => (equatorOrientation === 0 ? 3 : 0);

const commitSlashTransform = (state: SquareOneEngineState): SquareOneEngineState => {
  const wedges = [
    ...state.wedges.slice(0, 6),
    ...state.wedges.slice(12, 18),
    ...state.wedges.slice(6, 12),
    ...state.wedges.slice(18),
  ];

  return {
    equatorOrientation: toggleEquatorOrientation(state.equatorOrientation),
    wedges: wedges.map(withLayerForIndex),
  };
};

export const commitSquareOneTransform = (
  state: SquareOneEngineState,
  transform: SquareOneEngineTransform,
): SquareOneEngineState =>
  transform.move.type === 'slash'
    ? commitSlashTransform(state)
    : commitTupleTransform(state, transform.move);
