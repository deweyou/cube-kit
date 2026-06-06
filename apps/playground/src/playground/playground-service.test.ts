import { describe, expect, it } from 'vitest';
import type { ScrambleGenerator, ScrambleResult } from '@cubegin/scramble-core';
import { createPlaygroundService } from './playground-service';

describe('createPlaygroundService', () => {
  it('generates scrambles and renders the first SVG', async () => {
    const service = createPlaygroundService({
      generator: fakeGenerator([
        { eventId: '333', scramble: "R U R' U'" },
        { eventId: '333', scramble: 'F2 U2' },
      ]),
      now: fixedClock([10, 22, 25, 30]),
    });

    const result = await service.generate({
      eventId: '333',
      count: 2,
      multiBlindCubeCount: 3,
      imageView: 'net',
    });

    expect(result.scrambles).toHaveLength(2);
    expect(result.selectedScramble?.eventId).toBe('333');
    expect(result.svg).toContain('<svg');
    expect(result.generation.durationMs).toBe(12);
    expect(result.render.durationMs).toBe(5);
    expect(result.render.svgBytes).toBeGreaterThan(100);
  });

  it('splits 333mbld attempts into one displayed scramble per cube', async () => {
    const service = createPlaygroundService({
      generator: fakeGenerator([
        { eventId: '333mbld', scramble: 'R U\nF2 U2\nR2 U2' },
        { eventId: '333mbld', scramble: 'L U\nB2 U2\nD2 U2' },
      ]),
      now: fixedClock([10, 22, 25, 30]),
    });

    const result = await service.generate({
      eventId: '333mbld',
      count: 2,
      multiBlindCubeCount: 3,
      imageView: 'net',
    });

    expect(result.scrambles).toHaveLength(6);
    expect(result.generation.count).toBe(6);
    expect(result.selectedScramble?.id).toBe('333mbld-1-1');
    expect(result.scrambles.every((scramble) => !scramble.scramble.includes('\n'))).toBe(true);
    expect(result.render.scrambleLength).toBe(result.scrambles[0]?.scramble.length);
  });

  it('renders manual scramble text without generating a batch', () => {
    const service = createPlaygroundService({ seed: 42, now: fixedClock([1, 4]) });

    const result = service.renderManual({
      eventId: '333',
      scramble: "R U R' U'",
      imageView: 'net',
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
      imageView: 'net',
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

  it('renders generated and manual SVGs with the requested image view', async () => {
    const generator = fakeGenerator([{ eventId: '333', scramble: "R U R' U'" }]);
    const netService = createPlaygroundService({
      generator,
      now: fixedClock([10, 22, 25, 30]),
    });
    const isometricService = createPlaygroundService({
      generator,
      now: fixedClock([10, 22, 25, 30, 31, 34]),
    });

    const net = await netService.generate({
      eventId: '333',
      count: 1,
      multiBlindCubeCount: 3,
      imageView: 'net',
    });
    const isometric = await isometricService.generate({
      eventId: '333',
      count: 1,
      multiBlindCubeCount: 3,
      imageView: 'isometric',
    });
    const manualIsometric = isometricService.renderManual({
      eventId: '333',
      scramble: net.selectedScramble?.scramble ?? '',
      imageView: 'isometric',
    });

    expect(isometric.svg).not.toBe(net.svg);
    expect(isometric.svg).toContain('<path');
    expect(manualIsometric.svg).toContain('<path');
  });
});

const fixedClock = (values: number[]) => {
  let index = 0;

  return () => values[index++] ?? values.at(-1) ?? 0;
};

const fakeGenerator = (results: readonly ScrambleResult[]): ScrambleGenerator => ({
  async generate() {
    const [firstResult] = results;
    if (!firstResult) throw new Error('No fake scramble result configured');

    return firstResult;
  },
  async generateBatch() {
    return results;
  },
});
