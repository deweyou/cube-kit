export interface FaceletTrackingState {
  readonly positionPieceIds: readonly string[];
}

export type SourceByTarget = readonly number[];

export const createFaceletIds = (
  puzzle: string,
  faces: readonly string[],
  stickersPerFace: number,
): readonly string[] =>
  faces.flatMap((face) =>
    Array.from({ length: stickersPerFace }, (_value, sticker) => `${puzzle}-${face}-${sticker}`),
  );

export const createFaceletTrackingState = (
  pieceIds: readonly string[],
): FaceletTrackingState =>
  Object.freeze({
    positionPieceIds: Object.freeze([...pieceIds]),
  });

export const createIdentitySourceByTarget = (length: number): number[] =>
  Array.from({ length }, (_value, index) => index);

export const affectedPieceIdsForSourceByTarget = (
  state: FaceletTrackingState,
  sourceByTarget: SourceByTarget,
): readonly string[] => {
  const affectedPieceIds = new Set<string>();

  sourceByTarget.forEach((sourcePosition, targetPosition) => {
    if (sourcePosition === targetPosition) return;

    const pieceId = state.positionPieceIds[sourcePosition];

    if (pieceId !== undefined) affectedPieceIds.add(pieceId);
  });

  return [...affectedPieceIds];
};

export const applySourceByTarget = (
  state: FaceletTrackingState,
  sourceByTarget: SourceByTarget,
): FaceletTrackingState =>
  createFaceletTrackingState(
    sourceByTarget.map((sourcePosition) => state.positionPieceIds[sourcePosition] ?? ''),
  );
