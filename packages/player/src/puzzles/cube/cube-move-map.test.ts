import { describe, expect, it } from 'vitest';
import { mapCubeMoveToAnimation } from './cube-move-map.js';

const faceTurnCases = [
  {
    angleRadians: -Math.PI / 2,
    axis: 'x',
    label: 'R',
    layers: [2],
    move: { face: 'R', amount: 1, width: 1, isRotation: false },
  },
  {
    angleRadians: Math.PI / 2,
    axis: 'x',
    label: "R'",
    layers: [2],
    move: { face: 'R', amount: 3, width: 1, isRotation: false },
  },
  {
    angleRadians: -Math.PI / 2,
    axis: 'y',
    label: 'U',
    layers: [2],
    move: { face: 'U', amount: 1, width: 1, isRotation: false },
  },
  {
    angleRadians: Math.PI / 2,
    axis: 'y',
    label: "U'",
    layers: [2],
    move: { face: 'U', amount: 3, width: 1, isRotation: false },
  },
  {
    angleRadians: -Math.PI / 2,
    axis: 'z',
    label: 'F',
    layers: [2],
    move: { face: 'F', amount: 1, width: 1, isRotation: false },
  },
  {
    angleRadians: Math.PI / 2,
    axis: 'z',
    label: "F'",
    layers: [2],
    move: { face: 'F', amount: 3, width: 1, isRotation: false },
  },
  {
    angleRadians: Math.PI / 2,
    axis: 'x',
    label: 'L',
    layers: [0],
    move: { face: 'L', amount: 1, width: 1, isRotation: false },
  },
  {
    angleRadians: Math.PI / 2,
    axis: 'y',
    label: 'D',
    layers: [0],
    move: { face: 'D', amount: 1, width: 1, isRotation: false },
  },
  {
    angleRadians: Math.PI / 2,
    axis: 'z',
    label: 'B',
    layers: [0],
    move: { face: 'B', amount: 1, width: 1, isRotation: false },
  },
] as const;

describe('mapCubeMoveToAnimation', () => {
  it('maps face turns to axes, layers, and signed radians', () => {
    for (const faceTurnCase of faceTurnCases) {
      const animation = mapCubeMoveToAnimation(faceTurnCase.move, 3);

      expect(animation.axis, faceTurnCase.label).toBe(faceTurnCase.axis);
      expect(animation.layers, faceTurnCase.label).toEqual(faceTurnCase.layers);
      expect(animation.angleRadians, faceTurnCase.label).toBeCloseTo(
        faceTurnCase.angleRadians,
      );
    }
  });

  it('maps wide moves and cube rotations to multiple layers', () => {
    expect(mapCubeMoveToAnimation({ face: 'R', amount: 1, width: 2, isRotation: false }, 4))
      .toMatchObject({ axis: 'x', layers: [2, 3] });
    expect(
      mapCubeMoveToAnimation(
        { face: 'R', amount: 1, width: Number.POSITIVE_INFINITY, isRotation: true },
        4,
      ),
    ).toMatchObject({ axis: 'x', layers: [0, 1, 2, 3] });
  });
});
