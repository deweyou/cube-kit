import { describe, expect, it } from 'vitest';
import {
  createPlayerTimeline,
  getTimelinePosition,
  getTimelineProgressForCompletedStepCount,
} from './timeline.js';

describe('createPlayerTimeline', () => {
  it('creates one timeline step per parsed move', () => {
    const timeline = createPlayerTimeline([
      { face: 'R', amount: 1, width: 1, isRotation: false },
      { face: 'U', amount: 2, width: 1, isRotation: false },
      { face: 'F', amount: 3, width: 1, isRotation: false },
    ]);

    expect(timeline.steps).toHaveLength(3);
    expect(timeline.steps.map((step) => step.quarterTurns)).toEqual([1, 2, 3]);
    expect(timeline.steps.map((step) => step.durationMs)).toEqual([520, 754, 520]);
    expect(timeline.totalDurationMs).toBe(1794);
  });

  it('maps normalized progress to deterministic step positions', () => {
    const timeline = createPlayerTimeline([
      { face: 'R', amount: 1, width: 1, isRotation: false },
      { face: 'U', amount: 1, width: 1, isRotation: false },
    ]);

    expect(getTimelinePosition(timeline, 0)).toEqual({
      completedStepCount: 0,
      activeStepIndex: 0,
      activeStepProgress: 0,
    });
    expect(getTimelinePosition(timeline, 1)).toEqual({
      completedStepCount: 2,
      activeStepIndex: undefined,
      activeStepProgress: 1,
    });
  });

  it('maps completed move steps back to normalized progress', () => {
    const timeline = createPlayerTimeline([
      { face: 'R', amount: 1, width: 1, isRotation: false },
      { face: 'U', amount: 1, width: 1, isRotation: false },
      { face: 'F', amount: 1, width: 1, isRotation: false },
    ]);

    expect(getTimelineProgressForCompletedStepCount(timeline, 0)).toBe(0);
    expect(getTimelineProgressForCompletedStepCount(timeline, 1)).toBeCloseTo(1 / 3);
    expect(getTimelineProgressForCompletedStepCount(timeline, 3)).toBe(1);
  });

  it('uses explicit duration multipliers for adapter-specific moves', () => {
    const timeline = createPlayerTimeline([
      { move: { name: 'R++' }, durationMultiplier: 2 },
    ]);

    expect(timeline.steps[0]?.durationMs).toBe(1040);
    expect(timeline.totalDurationMs).toBe(1040);
  });
});
