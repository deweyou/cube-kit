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
