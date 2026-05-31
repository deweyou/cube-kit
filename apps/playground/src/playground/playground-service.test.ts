import { describe, expect, it } from 'vitest';
import { createPlaygroundService } from './playground-service';

describe('createPlaygroundService', () => {
  it('generates scrambles and renders the first SVG', async () => {
    const service = createPlaygroundService({ seed: 42, now: fixedClock([10, 22, 25, 30]) });

    const result = await service.generate({ eventId: '333', count: 2, multiBlindCubeCount: 3 });

    expect(result.scrambles).toHaveLength(2);
    expect(result.selectedScramble?.eventId).toBe('333');
    expect(result.svg).toContain('<svg');
    expect(result.generation.durationMs).toBe(12);
    expect(result.render.durationMs).toBe(5);
    expect(result.render.svgBytes).toBeGreaterThan(100);
  });

  it('splits 333mbld attempts into one displayed scramble per cube', async () => {
    const service = createPlaygroundService({ seed: 42, now: fixedClock([10, 22, 25, 30]) });

    const result = await service.generate({ eventId: '333mbld', count: 1, multiBlindCubeCount: 2 });

    expect(result.scrambles).toHaveLength(2);
    expect(result.generation.count).toBe(2);
    expect(result.selectedScramble?.id).toBe('333mbld-1-1');
    expect(result.scrambles.every((scramble) => !scramble.scramble.includes('\n'))).toBe(true);
    expect(result.render.scrambleLength).toBe(result.scrambles[0]?.scramble.length);
  });

  it('renders manual scramble text without generating a batch', () => {
    const service = createPlaygroundService({ seed: 42, now: fixedClock([1, 4]) });

    const result = service.renderManual({
      eventId: '333',
      scramble: "R U R' U'",
    });

    expect(result.svg).toContain('<svg');
    expect(result.render.durationMs).toBe(3);
    expect(result.render.scrambleLength).toBe(9);
  });

  it('returns render errors as data for invalid manual text', () => {
    const service = createPlaygroundService({ seed: 42, now: fixedClock([1, 2]) });

    const result = service.renderManual({
      eventId: '333',
      scramble: 'not-a-move',
    });

    expect(result.svg).toBe('');
    expect(result.error).toContain('not-a-move');
  });

  it('generates solver scrambles for the requested helper event', async () => {
    const service = createPlaygroundService({ seed: 42 });

    const result = await service.generateSolverScramble('222');

    expect(result.eventId).toBe('222');
    expect(result.scramble.length).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  it('solves non-3x3 helper methods through the playground service', () => {
    const service = createPlaygroundService({ seed: 42, now: fixedClock([1, 5]) });

    const result = service.solvePuzzleAssist({
      eventId: 'pyram',
      scramble: 'U R',
      methods: ['pyraminx-v'],
      targets: ['D'],
    });

    expect(result.results[0]?.method).toBe('pyraminx-v');
    expect(result.diagnostics.resultCount).toBe(1);
    expect(result.error).toBeUndefined();
  });
});

const fixedClock = (values: number[]) => {
  let index = 0;

  return () => values[index++] ?? values.at(-1) ?? 0;
};
