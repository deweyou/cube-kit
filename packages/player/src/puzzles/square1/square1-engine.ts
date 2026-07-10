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
const SLASH_DURATION_MULTIPLIER = 1.45;
const MIDDLE_RIGHT_PIECE_ID = 'square1-middle-right';

const pieceId = (piece: number): string => `square1-piece-${piece}`;

const SOLVED_WEDGE_PATTERN = [
  [pieceId(0), 'corner'],
  [pieceId(0), 'corner'],
  [pieceId(1), 'edge'],
  [pieceId(2), 'corner'],
  [pieceId(2), 'corner'],
  [pieceId(3), 'edge'],
  [pieceId(4), 'corner'],
  [pieceId(4), 'corner'],
  [pieceId(5), 'edge'],
  [pieceId(6), 'corner'],
  [pieceId(6), 'corner'],
  [pieceId(7), 'edge'],
  [pieceId(8), 'edge'],
  [pieceId(9), 'corner'],
  [pieceId(9), 'corner'],
  [pieceId(10), 'edge'],
  [pieceId(11), 'corner'],
  [pieceId(11), 'corner'],
  [pieceId(12), 'edge'],
  [pieceId(13), 'corner'],
  [pieceId(13), 'corner'],
  [pieceId(14), 'edge'],
  [pieceId(15), 'corner'],
  [pieceId(15), 'corner'],
] satisfies readonly (readonly [string, SquareOneEnginePieceKind])[];

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

// A slash exchanges exactly these two six-slot ranges. Legal slash positions
// guarantee that no corner crosses the range boundary, so adjacent edge slots
// remain stationary even when they touch the middle seam.
export const squareOneSlashAffectedPieceIds = (state: SquareOneEngineState): readonly string[] =>
  uniquePieceIds([...state.wedges.slice(6, 12), ...state.wedges.slice(12, 18)]).concat(
    MIDDLE_RIGHT_PIECE_ID,
  );

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
      angleRadians: -turn.top * TURN_RADIANS,
      axis: TOP_AXIS,
      pivot: ZERO_VECTOR,
      type: 'axis-rotation',
    });
  }

  if (turn.bottom !== 0) {
    operations.push({
      affectedPieceIds: uniquePieceIds(state.wedges.slice(12)),
      angleRadians: turn.bottom * TURN_RADIANS,
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
  durationMultiplier: SLASH_DURATION_MULTIPLIER,
  move: { type: 'slash' },
  operations: [
    {
      affectedPieceIds: squareOneSlashAffectedPieceIds(state),
      angleRadians: -Math.PI,
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

export const canSquareOneEngineSlash = (state: SquareOneEngineState): boolean =>
  state.wedges[0]?.pieceId !== state.wedges[11]?.pieceId &&
  state.wedges[6]?.pieceId !== state.wedges[5]?.pieceId &&
  state.wedges[12]?.pieceId !== state.wedges[23]?.pieceId &&
  state.wedges[18]?.pieceId !== state.wedges[17]?.pieceId;

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
  const topSlots = state.wedges.slice(0, 12);
  const bottomSlots = state.wedges.slice(12);
  const wedges = [
    ...topSlots.slice(0, 6),
    ...bottomSlots.slice(0, 6),
    ...topSlots.slice(6, 12),
    ...bottomSlots.slice(6),
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
