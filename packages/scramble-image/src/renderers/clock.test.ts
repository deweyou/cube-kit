import { describe, expect, it } from 'vitest';
import {
  applyClockMove,
  createSolvedClockState,
  parseClockAlgorithm,
} from '@cubegin/scramble-puzzle';
import { renderClockState } from './clock.js';

describe('renderClockState', () => {
  it('renders solved Clock state SVG', () => {
    expect(renderClockState(createSolvedClockState())).toContain('<svg');
  });

  it('uses the TNoodle preferred Clock viewbox', () => {
    const svg = renderClockState(createSolvedClockState());

    expect(svg).toContain('viewBox="0 0 300 150"');
  });

  it('renders both sides, clocks, hands, and pins', () => {
    const svg = renderClockState(createSolvedClockState());

    expect(svg.match(/<circle/g)?.length).toBeGreaterThanOrEqual(250);
    expect(svg.match(/<path/g)?.length).toBe(18);
  });

  it('renders moved hand rotations', () => {
    const moved = applyClockMove(createSolvedClockState(), parseClockAlgorithm('UR3+')[0]);
    const svg = renderClockState(moved);

    expect(svg).toContain('rotate(90 ');
  });
});
