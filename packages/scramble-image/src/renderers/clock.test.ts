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
    expect(svg.match(/<path/g)?.length).toBe(20);
  });

  it('draws Clock bodies without stroked overlap seams', () => {
    const svg = renderClockState(createSolvedClockState());
    const bodyOutlines =
      svg.match(
        /<path\b(?=[^>]*fill="#(?:113366|ccddee)")(?=[^>]*stroke="#000000")(?=[^>]*stroke-width="2")/g,
      ) ?? [];

    expect(bodyOutlines).toHaveLength(2);
    expect(svg).not.toMatch(/<circle\b(?=[^>]*r="(?:21|70)")(?=[^>]*stroke="#000000")/);
  });

  it('keeps the original rounded Clock silhouette while hiding overlap seams', () => {
    const svg = renderClockState(createSolvedClockState());
    const bodyPath = svg.match(/<path d="([^"]+)" fill="#113366"/)?.[1] ?? '';

    expect(bodyPath.match(/A 21 21 0 0 1/g)).toHaveLength(4);
    expect(bodyPath.match(/A 70 70 0 0 1/g)).toHaveLength(4);
    expect(bodyPath).not.toContain(' L ');
  });

  it('renders moved hand rotations', () => {
    const moved = applyClockMove(createSolvedClockState(), parseClockAlgorithm('UR3+')[0]);
    const svg = renderClockState(moved);

    expect(svg).toContain('rotate(90 ');
  });

  it('renders z rotations around each Clock face center', () => {
    const moved = applyClockMove(createSolvedClockState(), parseClockAlgorithm('z')[0]);
    const svg = renderClockState(moved);

    expect(svg).toContain('rotate(90 75 75)');
    expect(svg).toContain('rotate(270 225 75)');
  });
});
