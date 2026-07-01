import { describe, expect, it } from 'vitest';
import { mapCubeMoveToAnimation } from './cube-move-map.js';

describe('mapCubeMoveToAnimation', () => {
  it('maps face turns to axes, layers, and signed radians', () => {
    expect(mapCubeMoveToAnimation({ face: 'R', amount: 1, width: 1, isRotation: false }, 3))
      .toMatchObject({ axis: 'x', layers: [2], angleRadians: -Math.PI / 2 });
    expect(mapCubeMoveToAnimation({ face: 'R', amount: 3, width: 1, isRotation: false }, 3))
      .toMatchObject({ axis: 'x', layers: [2], angleRadians: Math.PI / 2 });
    expect(mapCubeMoveToAnimation({ face: 'U', amount: 2, width: 1, isRotation: false }, 3))
      .toMatchObject({ axis: 'y', layers: [2], angleRadians: Math.PI });
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
