import { describe, expect, it } from 'vitest';
import { updateOrbitStateFromPointerDelta } from './camera-controls.js';

describe('updateOrbitStateFromPointerDelta', () => {
  it('converts pointer deltas into yaw and pitch changes', () => {
    expect(
      updateOrbitStateFromPointerDelta(
        { distance: 8, pitch: 0, yaw: 0 },
        { deltaX: 100, deltaY: -50 },
      ),
    ).toMatchObject({
      distance: 8,
      pitch: -0.4,
      yaw: 0.8,
    });
  });

  it('clamps pitch to keep the cube framed', () => {
    expect(
      updateOrbitStateFromPointerDelta(
        { distance: 8, pitch: 1.1, yaw: 0 },
        { deltaX: 0, deltaY: 100 },
      ).pitch,
    ).toBeLessThan(1.25);
  });
});
