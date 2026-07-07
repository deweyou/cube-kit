import { describe, expect, it } from 'vitest';
import { createCubeDefinition, type CubeFacelet, type EventId } from '@cubegin/scramble-puzzle';
import { createCubePlayerAdapter } from './cube-player-adapter.js';
import type { PlayerMoveAnimation, Vector3Like } from '../puzzle-adapter.js';

type Coordinate3 = readonly [number, number, number];

interface SimulatedSticker {
  readonly color: CubeFacelet;
  normal: Coordinate3;
}

interface SimulatedPiece {
  readonly id: string;
  coord: Coordinate3;
  readonly stickers: readonly SimulatedSticker[];
}

const CUBE_FACES = ['R', 'U', 'F', 'L', 'D', 'B'] as const;

const NORMAL_BY_FACE = {
  R: [1, 0, 0],
  U: [0, 1, 0],
  F: [0, 0, 1],
  L: [-1, 0, 0],
  D: [0, -1, 0],
  B: [0, 0, -1],
} satisfies Record<CubeFacelet, Coordinate3>;

const FACE_BY_NORMAL = new Map(
  Object.entries(NORMAL_BY_FACE).map(([face, normal]) => [normal.join(':'), face as CubeFacelet]),
);

const faceFromNormal = (normal: Coordinate3): CubeFacelet => {
  const face = FACE_BY_NORMAL.get(normal.join(':'));

  if (face === undefined) throw new Error(`unknown cube sticker normal ${normal.join(',')}`);

  return face;
};

const coordinateFromPieceId = (pieceId: string): Coordinate3 => {
  const [, x, y, z] = pieceId.split('-');

  return [Number(x), Number(y), Number(z)];
};

const rotateCoordinate = (
  coord: Coordinate3,
  axis: Vector3Like,
  angleRadians: number,
): Coordinate3 => {
  const cos = Math.round(Math.cos(angleRadians));
  const sin = Math.round(Math.sin(angleRadians));
  const [x, y, z] = coord;

  if (axis.x !== 0) return [x, y * cos - z * sin, y * sin + z * cos];
  if (axis.y !== 0) return [x * cos + z * sin, y, -x * sin + z * cos];

  return [x * cos - y * sin, x * sin + y * cos, z];
};

const applyPlayerAnimationToPieces = (
  pieces: readonly SimulatedPiece[],
  animation: PlayerMoveAnimation,
  size: number,
): void => {
  const affectedPieceIds = new Set(animation.affectedPieceIds);
  const center = (size - 1) / 2;

  for (const piece of pieces) {
    if (!affectedPieceIds.has(piece.id)) continue;

    const angleRadians = animation.angleRadiansByPieceId?.[piece.id] ?? animation.angleRadians;
    const centeredCoord = piece.coord.map((value) => value - center) as unknown as Coordinate3;
    const rotatedCoord = rotateCoordinate(centeredCoord, animation.axis, angleRadians);

    piece.coord = rotatedCoord.map((value) => Math.round(value + center)) as unknown as Coordinate3;

    for (const sticker of piece.stickers) {
      sticker.normal = rotateCoordinate(sticker.normal, animation.axis, angleRadians);
    }
  }
};

const positionForFace = (
  face: CubeFacelet,
  coord: Coordinate3,
  size: number,
): readonly [number, number] => {
  const [x, y, z] = coord;

  if (face === 'U') return [z, x];
  if (face === 'D') return [size - 1 - z, x];
  if (face === 'F') return [size - 1 - y, x];
  if (face === 'B') return [size - 1 - y, size - 1 - x];
  if (face === 'R') return [size - 1 - y, size - 1 - z];

  return [size - 1 - y, z];
};

const imageRows = (image: readonly (readonly (readonly CubeFacelet[])[])[]): readonly string[] =>
  image.flatMap((face) => face.map((row) => row.join('')));

const createPlayerImageAfterFormula = (
  size: number,
  eventId: EventId,
  formula: string,
): readonly (readonly (readonly CubeFacelet[])[])[] => {
  const adapter = createCubePlayerAdapter(size, [eventId]);
  const model = adapter.createRenderableModel(adapter.createInitialState());
  let state = adapter.createInitialState();
  const pieces: SimulatedPiece[] = model.pieces.map((piece) => ({
    coord: coordinateFromPieceId(piece.id),
    id: piece.id,
    stickers: piece.stickers.map((sticker) => ({
      color: sticker.face as CubeFacelet,
      normal: NORMAL_BY_FACE[sticker.face as CubeFacelet],
    })),
  }));

  for (const move of adapter.parseFormula(formula)) {
    const animation = adapter.describeMove(move, state);

    applyPlayerAnimationToPieces(pieces, animation, size);
    state = adapter.applyMove(state, move);
  }

  const image = CUBE_FACES.map(() =>
    Array.from({ length: size }, () => Array<CubeFacelet>(size).fill('U')),
  );

  for (const piece of pieces) {
    for (const sticker of piece.stickers) {
      const face = faceFromNormal(sticker.normal);
      const [row, col] = positionForFace(face, piece.coord, size);

      image[CUBE_FACES.indexOf(face)][row][col] = sticker.color;
    }
  }

  return image;
};

const expectPlayerImageMatchesCubeState = (
  size: number,
  eventId: EventId,
  formula: string,
): void => {
  const cube = createCubeDefinition(size, [eventId]);
  const cubeState = cube.applyAlgorithm(cube.createSolvedState(), formula);
  const playerImage = createPlayerImageAfterFormula(size, eventId, formula);

  expect(imageRows(playerImage), formula).toEqual(imageRows(cubeState.image));
};

const expectMoveUsesTrackedState = (
  adapter: ReturnType<typeof createCubePlayerAdapter>,
  formula: string,
) => {
  const [firstMove, secondMove] = adapter.parseFormula(formula);

  if (firstMove === undefined || secondMove === undefined) {
    throw new Error(`expected two cube moves for ${formula}`);
  }

  const initialState = adapter.createInitialState();
  const afterFirstMove = adapter.applyMove(initialState, firstMove);
  const affectedFromSolved = adapter.describeMove(secondMove, initialState).affectedPieceIds;
  const affectedAfterFirst = adapter.describeMove(secondMove, afterFirstMove).affectedPieceIds;

  expect(affectedAfterFirst).not.toEqual(affectedFromSolved);
};

const stickerColorsByFace = (model: ReturnType<ReturnType<typeof createCubePlayerAdapter>['createRenderableModel']>) => {
  const colorsByFace: Record<string, string> = {};

  for (const piece of model.pieces) {
    for (const sticker of piece.stickers) {
      colorsByFace[sticker.face] = sticker.color;
    }
  }

  return colorsByFace;
};

describe('createCubePlayerAdapter', () => {
  it('creates a stickered cubie model without inter-piece gaps', () => {
    const adapter = createCubePlayerAdapter(3, ['333']);
    const model = adapter.createRenderableModel(adapter.createInitialState());

    expect(model.pieces).toHaveLength(26);

    const corner = model.pieces.find((piece) => piece.id === 'cube-2-2-2');

    expect(corner).toBeDefined();
    expect(corner?.body).toEqual({ color: '#111827', size: 1, type: 'box' });
    expect(corner?.position).toEqual({ x: 1, y: 1, z: 1 });
    expect(corner?.stickers.map((sticker) => sticker.face).sort()).toEqual(['F', 'R', 'U']);

    const frontSticker = corner?.stickers.find((sticker) => sticker.face === 'F');
    const stickerXValues = frontSticker?.polygon.map((vertex) => vertex.x) ?? [];

    expect(Math.max(...stickerXValues)).toBeLessThan(0.5);
    expect(frontSticker?.polygon.every((vertex) => vertex.z > 0.5)).toBe(true);
    expect(stickerColorsByFace(model)).toEqual({
      B: '#0000ff',
      D: '#ffff00',
      F: '#00ff00',
      L: '#ff8000',
      R: '#ff0000',
      U: '#ffffff',
    });
  });

  it('describes affected cubies for face and wide moves', () => {
    const adapter = createCubePlayerAdapter(3, ['333']);
    const state = adapter.createInitialState();
    const [faceMove, wideMove] = adapter.parseFormula('R Rw');

    if (faceMove === undefined || wideMove === undefined) {
      throw new Error('cube parser did not return expected moves');
    }

    const faceAnimation = adapter.describeMove(faceMove, state);
    const wideAnimation = adapter.describeMove(wideMove, state);

    expect(faceAnimation).toMatchObject({
      angleRadians: -Math.PI / 2,
      axis: { x: 1, y: 0, z: 0 },
      pivot: { x: 0, y: 0, z: 0 },
    });
    expect(faceAnimation.affectedPieceIds).toHaveLength(9);
    expect(faceAnimation.affectedPieceIds).toContain('cube-2-2-2');
    expect(faceAnimation.affectedPieceIds).not.toContain('cube-1-2-2');

    expect(wideAnimation.affectedPieceIds).toHaveLength(17);
    expect(wideAnimation.affectedPieceIds).toContain('cube-1-2-2');
    expect(wideAnimation.affectedPieceIds).not.toContain('cube-0-2-2');
  });

  it('describes U and F turns with CubeState-compatible signed directions', () => {
    const adapter = createCubePlayerAdapter(3, ['333']);
    const state = adapter.createInitialState();
    const [uMove, uPrimeMove, fMove, fPrimeMove] = adapter.parseFormula("U U' F F'");

    if (
      uMove === undefined
      || uPrimeMove === undefined
      || fMove === undefined
      || fPrimeMove === undefined
    ) {
      throw new Error('cube parser did not return expected U/F moves');
    }

    expect(adapter.describeMove(uMove, state).angleRadians).toBeCloseTo(-Math.PI / 2);
    expect(adapter.describeMove(uPrimeMove, state).angleRadians).toBeCloseTo(Math.PI / 2);
    expect(adapter.describeMove(fMove, state).angleRadians).toBeCloseTo(-Math.PI / 2);
    expect(adapter.describeMove(fPrimeMove, state).angleRadians).toBeCloseTo(Math.PI / 2);
  });

  it('matches scramble-puzzle cube states after face, wide, and rotation formulas', () => {
    expectPlayerImageMatchesCubeState(3, '333', 'U');
    expectPlayerImageMatchesCubeState(3, '333', 'F');
    expectPlayerImageMatchesCubeState(3, '333', 'R U');
    expectPlayerImageMatchesCubeState(3, '333', "R U R' U'");
    expectPlayerImageMatchesCubeState(4, '444', "Rw U Rw' U'");
    expectPlayerImageMatchesCubeState(4, '444', '3Fw2 U2 Rw');
    expectPlayerImageMatchesCubeState(4, '444', "x y z z' y' x'");
  });

  it('tracks cubies through multi-step formulas', () => {
    const adapter = createCubePlayerAdapter(3, ['333']);

    expectMoveUsesTrackedState(adapter, 'R U');
  });
});
