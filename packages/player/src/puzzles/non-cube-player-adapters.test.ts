import { describe, expect, it } from 'vitest';
import { getFtoMoveSourceByTarget } from '@cubegin/scramble-puzzle';
import { createFtoPlayerAdapter } from './fto/fto-player-adapter.js';
import { createMegaminxPlayerAdapter } from './megaminx/megaminx-player-adapter.js';
import { createPyraminxPlayerAdapter } from './pyraminx/pyraminx-player-adapter.js';
import { createSkewbPlayerAdapter } from './skewb/skewb-player-adapter.js';

const CUBE_ALIGNED_STICKER_SCALE = 0.84;

const getColoredSticker = <Face extends string>(modelFace: {
  readonly stickers: readonly { readonly face: Face; readonly polygon: readonly unknown[] }[];
}) => modelFace.stickers.find((sticker) => !sticker.face.endsWith('-border'));

const coloredStickerPolygonSizes = (
  model: {
    readonly pieces: readonly {
      readonly stickers: readonly {
        readonly face: string;
        readonly polygon: readonly unknown[];
      }[];
    }[];
  },
  face?: string,
) =>
  model.pieces
    .flatMap((piece) => piece.stickers)
    .filter((sticker) => !sticker.face.endsWith('-border'))
    .filter((sticker) => face === undefined || sticker.face === face)
    .map((sticker) => sticker.polygon.length);

const countColoredStickerPolygonSize = (
  model: {
    readonly pieces: readonly {
      readonly stickers: readonly {
        readonly face: string;
        readonly polygon: readonly unknown[];
      }[];
    }[];
  },
  face: string,
  size: number,
) => coloredStickerPolygonSizes(model, face).filter((polygonSize) => polygonSize === size).length;

const stickerFaceCounts = (model: {
  readonly pieces: readonly {
    readonly stickers: readonly {
      readonly face: string;
    }[];
  }[];
}): Readonly<Record<string, number>> => {
  const counts: Record<string, number> = {};

  for (const piece of model.pieces) {
    for (const sticker of piece.stickers) {
      if (sticker.face.endsWith('-border')) continue;

      counts[sticker.face] = (counts[sticker.face] ?? 0) + 1;
    }
  }

  return counts;
};

const stickerColorsByFace = (model: {
  readonly pieces: readonly {
    readonly stickers: readonly {
      readonly color: string;
      readonly face: string;
    }[];
  }[];
}): Readonly<Record<string, string>> => {
  const colors: Record<string, string> = {};

  for (const piece of model.pieces) {
    for (const sticker of piece.stickers) {
      if (sticker.face.endsWith('-border')) continue;

      colors[sticker.face] = sticker.color;
    }
  }

  return colors;
};

const pentagonalPiecePositionByFace = (model: {
  readonly pieces: readonly {
    readonly id: string;
    readonly stickers: readonly {
      readonly face: string;
      readonly polygon: readonly unknown[];
    }[];
  }[];
}): ReadonlyMap<string, number> => {
  const centerPositionByFace = new Map<string, number>();

  model.pieces.forEach((piece, position) => {
    const coloredSticker = getColoredSticker(piece);

    if (coloredSticker?.polygon.length === 5) {
      centerPositionByFace.set(coloredSticker.face, position);
    }
  });

  return centerPositionByFace;
};

const polygonCenter = (
  polygon: readonly { readonly x: number; readonly y: number; readonly z: number }[],
) =>
  polygon.reduce(
    (sum, vertex) => ({
      x: sum.x + vertex.x / polygon.length,
      y: sum.y + vertex.y / polygon.length,
      z: sum.z + vertex.z / polygon.length,
    }),
    { x: 0, y: 0, z: 0 },
  );

const averageRadiusFromCenter = (
  polygon: readonly { readonly x: number; readonly y: number; readonly z: number }[],
) => {
  const center = polygonCenter(polygon);

  return (
    polygon.reduce(
      (sum, vertex) =>
        sum +
        Math.hypot(vertex.x - center.x, vertex.y - center.y, vertex.z - center.z),
      0,
    ) / polygon.length
  );
};

const stickerScaleRatios = (model: {
  readonly pieces: readonly {
    readonly stickers: readonly {
      readonly face: string;
      readonly polygon: readonly { readonly x: number; readonly y: number; readonly z: number }[];
    }[];
  }[];
}): readonly number[] =>
  model.pieces.map((piece) => {
    const borderSticker = piece.stickers.find((sticker) => sticker.face.endsWith('-border'));
    const coloredSticker = piece.stickers.find((sticker) => !sticker.face.endsWith('-border'));

    if (borderSticker === undefined || coloredSticker === undefined) {
      throw new Error('expected paired border and colored stickers');
    }

    return (
      averageRadiusFromCenter(coloredSticker.polygon) /
      averageRadiusFromCenter(borderSticker.polygon)
    );
  });

const expectStickerScaleCloseTo = (
  model: Parameters<typeof stickerScaleRatios>[0],
  expectedScale: number,
) => {
  const ratios = stickerScaleRatios(model);

  expect(ratios.length).toBeGreaterThan(0);

  for (const ratio of ratios) {
    expect(ratio).toBeCloseTo(expectedScale, 5);
  }
};

const centroidDistance = (polygon: readonly { readonly x: number; readonly y: number; readonly z: number }[]) => {
  const center = polygon.reduce(
    (sum, vertex) => ({
      x: sum.x + vertex.x / polygon.length,
      y: sum.y + vertex.y / polygon.length,
      z: sum.z + vertex.z / polygon.length,
    }),
    { x: 0, y: 0, z: 0 },
  );

  return Math.hypot(center.x, center.y, center.z);
};

const roundedVertexKey = (vertex: { readonly x: number; readonly y: number; readonly z: number }) =>
  `${vertex.x.toFixed(5)}:${vertex.y.toFixed(5)}:${vertex.z.toFixed(5)}`;

const expectBorderVertexCloseTo = (
  model: {
    readonly pieces: readonly {
      readonly stickers: readonly {
        readonly face: string;
        readonly polygon: readonly { readonly x: number; readonly y: number; readonly z: number }[];
      }[];
    }[];
  },
  face: string,
  expected: { readonly x: number; readonly y: number; readonly z: number },
) => {
  const vertices = model.pieces.flatMap((piece) =>
    piece.stickers
      .filter((sticker) => sticker.face === `${face}-border`)
      .flatMap((sticker) => sticker.polygon),
  );

  expect(
    vertices.some(
      (vertex) =>
        Math.hypot(vertex.x - expected.x, vertex.y - expected.y, vertex.z - expected.z) < 0.000001,
    ),
  ).toBe(true);
};

const outerVertexCount = (model: {
  readonly pieces: readonly {
    readonly stickers: readonly {
      readonly face: string;
      readonly polygon: readonly { readonly x: number; readonly y: number; readonly z: number }[];
    }[];
  }[];
}) => {
  const vertices = model.pieces.flatMap((piece) =>
    piece.stickers
      .filter((sticker) => sticker.face.endsWith('-border'))
      .flatMap((sticker) => sticker.polygon),
  );
  const maxDistance = Math.max(...vertices.map((vertex) => Math.hypot(vertex.x, vertex.y, vertex.z)));
  const outerVertices = vertices.filter(
    (vertex) => Math.hypot(vertex.x, vertex.y, vertex.z) > maxDistance - 0.00001,
  );

  return new Set(outerVertices.map(roundedVertexKey)).size;
};

const coloredFaceDirection = (
  model: {
    readonly pieces: readonly {
      readonly stickers: readonly {
        readonly face: string;
        readonly polygon: readonly { readonly x: number; readonly y: number; readonly z: number }[];
      }[];
    }[];
  },
  face: string,
) => {
  const faceCenters = model.pieces.flatMap((piece) =>
    piece.stickers
      .filter((sticker) => sticker.face === face)
      .map((sticker) =>
        sticker.polygon.reduce(
          (sum, vertex) => ({
            x: sum.x + vertex.x / sticker.polygon.length,
            y: sum.y + vertex.y / sticker.polygon.length,
            z: sum.z + vertex.z / sticker.polygon.length,
          }),
          { x: 0, y: 0, z: 0 },
        ),
      ),
  );
  const center = faceCenters.reduce(
    (sum, vertex) => ({
      x: sum.x + vertex.x / faceCenters.length,
      y: sum.y + vertex.y / faceCenters.length,
      z: sum.z + vertex.z / faceCenters.length,
    }),
    { x: 0, y: 0, z: 0 },
  );
  const length = Math.hypot(center.x, center.y, center.z);

  return {
    x: center.x / length,
    y: center.y / length,
    z: center.z / length,
  };
};

const expectDirectionCloseTo = (
  actual: { readonly x: number; readonly y: number; readonly z: number },
  expected: { readonly x: number; readonly y: number; readonly z: number },
) => {
  expect(actual.x).toBeCloseTo(expected.x, 4);
  expect(actual.y).toBeCloseTo(expected.y, 4);
  expect(actual.z).toBeCloseTo(expected.z, 4);
};

const subtractVectors = (
  first: { readonly x: number; readonly y: number; readonly z: number },
  second: { readonly x: number; readonly y: number; readonly z: number },
) => ({
  x: first.x - second.x,
  y: first.y - second.y,
  z: first.z - second.z,
});

const addVectors = (
  first: { readonly x: number; readonly y: number; readonly z: number },
  second: { readonly x: number; readonly y: number; readonly z: number },
) => ({
  x: first.x + second.x,
  y: first.y + second.y,
  z: first.z + second.z,
});

const scaleVector = (
  vector: { readonly x: number; readonly y: number; readonly z: number },
  scale: number,
) => ({
  x: vector.x * scale,
  y: vector.y * scale,
  z: vector.z * scale,
});

const dotVectors = (
  first: { readonly x: number; readonly y: number; readonly z: number },
  second: { readonly x: number; readonly y: number; readonly z: number },
) => first.x * second.x + first.y * second.y + first.z * second.z;

const crossVectors = (
  first: { readonly x: number; readonly y: number; readonly z: number },
  second: { readonly x: number; readonly y: number; readonly z: number },
) => ({
  x: first.y * second.z - first.z * second.y,
  y: first.z * second.x - first.x * second.z,
  z: first.x * second.y - first.y * second.x,
});

const normalizeVector = (vector: { readonly x: number; readonly y: number; readonly z: number }) => {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
};

const rotateAroundAxis = (
  point: { readonly x: number; readonly y: number; readonly z: number },
  axis: { readonly x: number; readonly y: number; readonly z: number },
  angleRadians: number,
  pivot: { readonly x: number; readonly y: number; readonly z: number },
) => {
  const normalizedAxis = normalizeVector(axis);
  const offset = subtractVectors(point, pivot);
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const rotatedOffset = addVectors(
    addVectors(scaleVector(offset, cos), scaleVector(crossVectors(normalizedAxis, offset), sin)),
    scaleVector(normalizedAxis, dotVectors(normalizedAxis, offset) * (1 - cos)),
  );

  return addVectors(rotatedOffset, pivot);
};

const distanceBetween = (
  first: { readonly x: number; readonly y: number; readonly z: number },
  second: { readonly x: number; readonly y: number; readonly z: number },
) => Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);

const pieceCenter = (piece: {
  readonly stickers: readonly {
    readonly face: string;
    readonly polygon: readonly { readonly x: number; readonly y: number; readonly z: number }[];
  }[];
}) => {
  const coloredSticker = piece.stickers.find((sticker) => !sticker.face.endsWith('-border'));

  if (coloredSticker === undefined) throw new Error('expected a colored sticker');

  return coloredSticker.polygon.reduce(
    (sum, vertex) => ({
      x: sum.x + vertex.x / coloredSticker.polygon.length,
      y: sum.y + vertex.y / coloredSticker.polygon.length,
      z: sum.z + vertex.z / coloredSticker.polygon.length,
    }),
    { x: 0, y: 0, z: 0 },
  );
};

const expectColoredStickersOutsideBorders = (model: {
  readonly pieces: readonly {
    readonly stickers: readonly {
      readonly face: string;
      readonly polygon: readonly { readonly x: number; readonly y: number; readonly z: number }[];
    }[];
  }[];
}) => {
  for (const piece of model.pieces) {
    const border = piece.stickers.find((sticker) => sticker.face.endsWith('-border'));
    const colored = piece.stickers.find((sticker) => !sticker.face.endsWith('-border'));

    expect(colored).toBeDefined();
    expect(border).toBeDefined();
    expect(centroidDistance(colored?.polygon ?? [])).toBeGreaterThan(
      centroidDistance(border?.polygon ?? []),
    );
  }
};

const expectMoveUsesTrackedState = <Move, State>(
  adapter: {
    createInitialState(): State;
    parseFormula(formula: string): readonly Move[];
    describeMove(move: Move, state: State): { readonly affectedPieceIds: readonly string[] };
    applyMove(state: State, move: Move): State;
  },
  formula: string,
) => {
  const [firstMove, secondMove] = adapter.parseFormula(formula);

  if (firstMove === undefined || secondMove === undefined) {
    throw new Error(`expected two moves for ${formula}`);
  }

  const initialState = adapter.createInitialState();
  const afterFirstMove = adapter.applyMove(initialState, firstMove);
  const affectedFromSolved = adapter.describeMove(secondMove, initialState).affectedPieceIds;
  const affectedAfterFirst = adapter.describeMove(secondMove, afterFirstMove).affectedPieceIds;

  expect(affectedAfterFirst).not.toEqual(affectedFromSolved);
};

const sourceByTargetForSolvedMove = <Move>(
  adapter: {
    createInitialState(): { readonly positionPieceIds: readonly string[] };
    parseFormula(formula: string): readonly Move[];
    applyMove(
      state: { readonly positionPieceIds: readonly string[] },
      move: Move,
    ): { readonly positionPieceIds: readonly string[] };
  },
  formula: string,
): readonly number[] => {
  const initialState = adapter.createInitialState();
  const [move] = adapter.parseFormula(formula);

  if (move === undefined) throw new Error(`expected a move for ${formula}`);

  const sourceIndexByPieceId = new Map(
    initialState.positionPieceIds.map((pieceId, index) => [pieceId, index]),
  );
  const movedState = adapter.applyMove(initialState, move);

  return movedState.positionPieceIds.map((pieceId) => {
    const sourceIndex = sourceIndexByPieceId.get(pieceId);

    if (sourceIndex === undefined) {
      throw new Error(`missing source piece ${pieceId}`);
    }

    return sourceIndex;
  });
};

const expectSolvedMoveGeometryMatchesState = <Move>(
  adapter: {
    createInitialState(): { readonly positionPieceIds: readonly string[] };
    createRenderableModel(state: { readonly positionPieceIds: readonly string[] }): {
      readonly pieces: readonly {
        readonly id: string;
        readonly stickers: readonly {
          readonly face: string;
          readonly polygon: readonly { readonly x: number; readonly y: number; readonly z: number }[];
        }[];
      }[];
    };
    parseFormula(formula: string): readonly Move[];
    describeMove(
      move: Move,
      state: { readonly positionPieceIds: readonly string[] },
    ): {
      readonly affectedPieceIds: readonly string[];
      readonly angleRadians: number;
      readonly axis: { readonly x: number; readonly y: number; readonly z: number };
      readonly pivot: { readonly x: number; readonly y: number; readonly z: number };
    };
    applyMove(
      state: { readonly positionPieceIds: readonly string[] },
      move: Move,
    ): { readonly positionPieceIds: readonly string[] };
  },
  formula: string,
) => {
  const initialState = adapter.createInitialState();
  const model = adapter.createRenderableModel(initialState);
  const pieceIndexById = new Map(model.pieces.map((piece, index) => [piece.id, index]));
  const pieceCenters = model.pieces.map(pieceCenter);

  for (const move of adapter.parseFormula(formula)) {
    const animation = adapter.describeMove(move, initialState);
    const affectedPieceIds = new Set(animation.affectedPieceIds);
    const afterMove = adapter.applyMove(initialState, move);

    afterMove.positionPieceIds.forEach((sourcePieceId, targetPosition) => {
      const sourcePosition = pieceIndexById.get(sourcePieceId);

      if (sourcePosition === undefined) throw new Error(`missing source piece ${sourcePieceId}`);
      if (sourcePosition === targetPosition) return;

      const sourceCenter = pieceCenters[sourcePosition];
      const targetCenter = pieceCenters[targetPosition];

      if (sourceCenter === undefined || targetCenter === undefined) {
        throw new Error('missing piece center');
      }

      expect(affectedPieceIds.has(sourcePieceId)).toBe(true);
      expect(
        distanceBetween(
          rotateAroundAxis(sourceCenter, animation.axis, animation.angleRadians, animation.pivot),
          targetCenter,
        ),
      ).toBeLessThan(0.02);
    });
  }
};

describe('non-cube player adapters', () => {
  it('uses cube-aligned sticker borders across non-cube puzzle models', () => {
    const adapters = [
      createPyraminxPlayerAdapter(),
      createSkewbPlayerAdapter(),
      createFtoPlayerAdapter(),
      createMegaminxPlayerAdapter(),
    ];

    for (const adapter of adapters) {
      expectStickerScaleCloseTo(
        adapter.createRenderableModel(adapter.createInitialState()),
        CUBE_ALIGNED_STICKER_SCALE,
      );
    }
  });

  it('creates a pyraminx model with distinct turn and tip move regions', () => {
    const adapter = createPyraminxPlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const [turnMove, tipMove] = adapter.parseFormula('U u');

    if (turnMove === undefined || tipMove === undefined) {
      throw new Error('pyraminx parser did not return expected moves');
    }

    const turnAnimation = adapter.describeMove(turnMove, adapter.createInitialState());
    const tipAnimation = adapter.describeMove(tipMove, adapter.createInitialState());
    const coloredSticker = getColoredSticker(model.pieces[0]);
    const turnAffectedPieceIds = new Set(turnAnimation.affectedPieceIds);

    expect(model.pieces).toHaveLength(36);
    expect(stickerFaceCounts(model)).toEqual({ D: 9, F: 9, L: 9, R: 9 });
    expect(stickerColorsByFace(model)).toEqual({
      D: '#ffff00',
      F: '#00ff00',
      L: '#ff0000',
      R: '#0000ff',
    });
    expect(coloredSticker?.polygon).toHaveLength(3);
    expectColoredStickersOutsideBorders(model);
    expectBorderVertexCloseTo(model, 'F', {
      x: -0.523395244184,
      y: 1.068376068376,
      z: 0.302182385122,
    });
    expect(tipAnimation.affectedPieceIds.length).toBeGreaterThan(0);
    expect(turnAnimation.affectedPieceIds.length).toBeGreaterThan(tipAnimation.affectedPieceIds.length);
    expect(turnAnimation.affectedPieceIds).toHaveLength(12);
    expect(
      tipAnimation.affectedPieceIds.every((pieceId) => turnAffectedPieceIds.has(pieceId)),
    ).toBe(true);
    expect(turnAnimation.angleRadians).toBeCloseTo(-(Math.PI * 2) / 3);
    expectMoveUsesTrackedState(adapter, 'U L');
    expectSolvedMoveGeometryMatchesState(adapter, 'U L R B u l r b');
  });

  it('creates a skewb model with diagonal rotation axes', () => {
    const adapter = createSkewbPlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const [move] = adapter.parseFormula('R');

    if (move === undefined) throw new Error('skewb parser did not return expected move');

    const animation = adapter.describeMove(move, adapter.createInitialState());
    const coloredSticker = getColoredSticker(model.pieces[0]);

    expect(model.pieces).toHaveLength(30);
    expect(stickerFaceCounts(model)).toEqual({ B: 5, D: 5, F: 5, L: 5, R: 5, U: 5 });
    expect(stickerColorsByFace(model)).toEqual({
      B: '#ff8000',
      D: '#ffff00',
      F: '#ff0000',
      L: '#00ff00',
      R: '#0000ff',
      U: '#ffffff',
    });
    expect(coloredSticker?.polygon.length).toBeGreaterThanOrEqual(3);
    expect(countColoredStickerPolygonSize(model, 'F', 4)).toBe(1);
    expectBorderVertexCloseTo(model, 'F', { x: -1.110288979211, y: 1.110288979211, z: 1.110288979211 });
    expectColoredStickersOutsideBorders(model);
    expect(animation.affectedPieceIds.length).toBeGreaterThan(0);
    expect(animation.affectedPieceIds.length).toBeLessThan(model.pieces.length);
    expect(animation.axis).not.toEqual({ x: 1, y: 0, z: 0 });
    expectMoveUsesTrackedState(adapter, 'R U');
    expectSolvedMoveGeometryMatchesState(adapter, 'R U L B');
  });

  it('creates an FTO model with triangular face-turn regions', () => {
    const adapter = createFtoPlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const [move] = adapter.parseFormula("BR'");

    if (move === undefined) throw new Error('FTO parser did not return expected move');

    const animation = adapter.describeMove(move, adapter.createInitialState());
    const coloredSticker = getColoredSticker(model.pieces[0]);

    expect(model.pieces).toHaveLength(72);
    expect(stickerFaceCounts(model)).toEqual({
      B: 9,
      BL: 9,
      BR: 9,
      D: 9,
      F: 9,
      L: 9,
      R: 9,
      U: 9,
    });
    expect(stickerColorsByFace(model)).toEqual({
      B: '#0000ff',
      BL: '#ffaa00',
      BR: '#bbbbbb',
      D: '#ffff00',
      F: '#00dd00',
      L: '#880088',
      R: '#ff0000',
      U: '#ffffff',
    });
    expect(coloredSticker?.polygon).toHaveLength(3);
    expectColoredStickersOutsideBorders(model);
    expect(animation.affectedPieceIds.length).toBeGreaterThan(9);
    expect(animation.angleRadians).toBeCloseTo((Math.PI * 2) / 3);
    expectMoveUsesTrackedState(adapter, 'U F');
    expectSolvedMoveGeometryMatchesState(adapter, "U D F B L R BL BR");
  });

  it('matches FTO facelet permutations used by scramble-puzzle', () => {
    const adapter = createFtoPlayerAdapter();

    for (const face of ['U', 'D', 'F', 'B', 'L', 'R', 'BL', 'BR'] as const) {
      for (const amount of [1, 2] as const) {
        const formula = `${face}${amount === 2 ? "'" : ''}`;
        const [move] = adapter.parseFormula(formula);

        if (move === undefined) throw new Error(`expected an FTO move for ${formula}`);

        expect(sourceByTargetForSolvedMove(adapter, formula)).toEqual(
          getFtoMoveSourceByTarget(move),
        );
      }
    }
  });

  it('creates a megaminx model with pentagonal face and big-turn animations', () => {
    const adapter = createMegaminxPlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const [faceMove, bigTurnMove] = adapter.parseFormula("U2' R++");
    const [bottomBigTurnMove] = adapter.parseFormula('D++');

    if (faceMove === undefined || bigTurnMove === undefined || bottomBigTurnMove === undefined) {
      throw new Error('megaminx parser did not return expected moves');
    }

    const faceAnimation = adapter.describeMove(faceMove, adapter.createInitialState());
    const bigTurnAnimation = adapter.describeMove(bigTurnMove, adapter.createInitialState());
    const bottomBigTurnAnimation = adapter.describeMove(
      bottomBigTurnMove,
      adapter.createInitialState(),
    );
    const coloredSticker = getColoredSticker(model.pieces[0]);

    expect(model.pieces).toHaveLength(132);
    expect(stickerFaceCounts(model)).toEqual({
      B: 11,
      BL: 11,
      BR: 11,
      D: 11,
      DBL: 11,
      DBR: 11,
      DL: 11,
      DR: 11,
      F: 11,
      L: 11,
      R: 11,
      U: 11,
    });
    expect(stickerColorsByFace(model)).toEqual({
      B: '#71e600',
      BL: '#ffcc00',
      BR: '#0000b3',
      D: '#999999',
      DBL: '#ff8433',
      DBR: '#ff99ff',
      DL: '#88ddff',
      DR: '#ffffb3',
      F: '#006600',
      L: '#8a1aff',
      R: '#dd0000',
      U: '#ffffff',
    });
    expect(coloredSticker?.polygon).toHaveLength(4);
    expect(countColoredStickerPolygonSize(model, 'U', 5)).toBe(1);
    expect(countColoredStickerPolygonSize(model, 'U', 4)).toBe(10);
    expectBorderVertexCloseTo(model, 'U', {
      x: -0.147250734777,
      y: 1.528181677484,
      z: 0.94446821767,
    });
    expectColoredStickersOutsideBorders(model);
    expect(outerVertexCount(model)).toBe(20);
    expectDirectionCloseTo(coloredFaceDirection(model, 'U'), { x: 0, y: 1, z: 0 });
    expectDirectionCloseTo(coloredFaceDirection(model, 'F'), {
      x: 0,
      y: 0.4472135955,
      z: 0.894427191,
    });
    expectDirectionCloseTo(coloredFaceDirection(model, 'DR'), {
      x: -0.5257311121,
      y: -0.4472135955,
      z: 0.7236067977,
    });
    expectDirectionCloseTo(coloredFaceDirection(model, 'B'), {
      x: 0.8506508084,
      y: -0.4472135955,
      z: -0.2763932023,
    });
    expectDirectionCloseTo(coloredFaceDirection(model, 'DL'), {
      x: -0.8506508084,
      y: -0.4472135955,
      z: -0.2763932023,
    });
    expect(faceAnimation.affectedPieceIds.length).toBeGreaterThan(11);
    expect(faceAnimation.angleRadians).toBeCloseTo((-Math.PI * 4) / 5);
    expect(bigTurnAnimation.affectedPieceIds.length).toBeGreaterThan(
      faceAnimation.affectedPieceIds.length,
    );
    expect(bigTurnAnimation.affectedPieceIds).toHaveLength(105);
    expect(bottomBigTurnAnimation.affectedPieceIds).toHaveLength(105);
    expect(bigTurnAnimation.durationMultiplier).toBeGreaterThan(1);
    expectMoveUsesTrackedState(adapter, 'U F');
    expectSolvedMoveGeometryMatchesState(adapter, 'U F R++ D--');
  });

  it('includes the current megaminx face center in face-turn animations', () => {
    const adapter = createMegaminxPlayerAdapter();
    const initialState = adapter.createInitialState();
    const model = adapter.createRenderableModel(initialState);
    const centerPositionByFace = pentagonalPiecePositionByFace(model);

    for (const move of adapter.parseFormula('U BL BR R F L D DR DBR B DBL DL')) {
      if (move.type !== 'face') throw new Error('expected face moves only');

      const centerPosition = centerPositionByFace.get(move.face);

      if (centerPosition === undefined) {
        throw new Error(`missing megaminx center position for ${move.face}`);
      }

      const centerPieceId = initialState.positionPieceIds[centerPosition];

      expect(adapter.describeMove(move, initialState).affectedPieceIds).toContain(centerPieceId);
    }

    const [bigTurnMove, faceMove] = adapter.parseFormula('R++ R');

    if (bigTurnMove === undefined || faceMove === undefined || faceMove.type !== 'face') {
      throw new Error('megaminx parser did not return expected moves');
    }

    const afterBigTurn = adapter.applyMove(initialState, bigTurnMove);
    const centerPosition = centerPositionByFace.get(faceMove.face);

    if (centerPosition === undefined) {
      throw new Error(`missing megaminx center position for ${faceMove.face}`);
    }

    const currentCenterPieceId = afterBigTurn.positionPieceIds[centerPosition];

    expect(adapter.describeMove(faceMove, afterBigTurn).affectedPieceIds).toContain(
      currentCenterPieceId,
    );
  });
});
