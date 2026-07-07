import { describe, expect, it } from 'vitest';
import { mapCubeMoveToAnimation } from './cube-move-map.js';

type AxisName = 'x' | 'y' | 'z';
type VectorTuple = readonly [number, number, number];

const rotateVector = (axis: AxisName, angleRadians: number, vector: VectorTuple): VectorTuple => {
  const [x, y, z] = vector;
  const cos = Math.round(Math.cos(angleRadians));
  const sin = Math.round(Math.sin(angleRadians));

  if (axis === 'x') return [x, y * cos - z * sin, y * sin + z * cos];
  if (axis === 'y') return [x * cos + z * sin, y, -x * sin + z * cos];

  return [x * cos - y * sin, x * sin + y * cos, z];
};

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
      expect(animation.angleRadians, faceTurnCase.label).toBeCloseTo(faceTurnCase.angleRadians);
    }
  });

  it('maps wide moves and cube rotations to multiple layers', () => {
    expect(
      mapCubeMoveToAnimation({ face: 'R', amount: 1, width: 2, isRotation: false }, 4),
    ).toMatchObject({ axis: 'x', layers: [2, 3] });
    expect(
      mapCubeMoveToAnimation(
        { face: 'R', amount: 1, width: Number.POSITIVE_INFINITY, isRotation: true },
        4,
      ),
    ).toMatchObject({ axis: 'x', layers: [0, 1, 2, 3] });
  });

  it('maps U and F turns to scramble-state-compatible signed directions', () => {
    const u = mapCubeMoveToAnimation({ face: 'U', amount: 1, width: 1, isRotation: false }, 3);
    const uPrime = mapCubeMoveToAnimation({ face: 'U', amount: 3, width: 1, isRotation: false }, 3);
    const f = mapCubeMoveToAnimation({ face: 'F', amount: 1, width: 1, isRotation: false }, 3);
    const fPrime = mapCubeMoveToAnimation({ face: 'F', amount: 3, width: 1, isRotation: false }, 3);

    expect(rotateVector(u.axis, u.angleRadians, [0, 0, 1])).toEqual([-1, 0, 0]);
    expect(rotateVector(uPrime.axis, uPrime.angleRadians, [-1, 0, 0])).toEqual([0, 0, 1]);
    expect(rotateVector(f.axis, f.angleRadians, [0, 1, 0])).toEqual([1, 0, 0]);
    expect(rotateVector(fPrime.axis, fPrime.angleRadians, [1, 0, 0])).toEqual([0, 1, 0]);
  });
});
