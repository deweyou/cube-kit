import type { CubeFace, CubeMove } from '@cubegin/scramble-puzzle';

export type PlayerAxis = 'x' | 'y' | 'z';

export interface CubeMoveAnimation {
  readonly axis: PlayerAxis;
  readonly layers: readonly number[];
  readonly angleRadians: number;
}

const axisForFace = (face: CubeFace): PlayerAxis => {
  if (face === 'R' || face === 'L') return 'x';
  if (face === 'U' || face === 'D') return 'y';

  return 'z';
};

const isPositiveFace = (face: CubeFace): boolean => face === 'L' || face === 'U' || face === 'F';

const outerLayerForFace = (face: CubeFace, size: number): number =>
  face === 'R' || face === 'U' || face === 'F' ? size - 1 : 0;

const layersForMove = (move: CubeMove, size: number): readonly number[] => {
  if (move.isRotation) {
    return Array.from({ length: size }, (_value, index) => index);
  }

  const outerLayer = outerLayerForFace(move.face, size);
  const direction = outerLayer === 0 ? 1 : -1;

  return Array.from({ length: move.width }, (_value, offset) => outerLayer + direction * offset)
    .filter((layer) => layer >= 0 && layer < size)
    .sort((a, b) => a - b);
};

export const mapCubeMoveToAnimation = (move: CubeMove, size: number): CubeMoveAnimation => {
  const direction = isPositiveFace(move.face) ? 1 : -1;
  const turns = move.amount === 3 ? -1 : move.amount;

  return {
    axis: axisForFace(move.face),
    layers: layersForMove(move, size),
    angleRadians: direction * turns * (Math.PI / 2),
  };
};
