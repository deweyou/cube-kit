import { describe, expect, it } from 'vitest';
import {
  applySquareOneMove,
  createSolvedSquareOneState,
  parseSquareOneAlgorithm,
  type SquareOneState,
} from '@cubekit/scramble-puzzle';
import { renderScrambleImage } from '../render.js';
import { renderSquareOneState } from './square1.js';

const applySquareOneAlgorithm = (
  state: SquareOneState,
  algorithm: string,
): SquareOneState =>
  parseSquareOneAlgorithm(algorithm).reduce(
    (currentState, move) => applySquareOneMove(currentState, move),
    state,
  );

describe('renderSquareOneState', () => {
  it('renders solved Square-1 state SVG', () => {
    expect(renderSquareOneState(createSolvedSquareOneState())).toContain('<svg');
  });

  it('uses the TNoodle preferred Square-1 viewbox and default colors', () => {
    const svg = renderSquareOneState(createSolvedSquareOneState());

    expect(svg).toContain('width="122"');
    expect(svg).toContain('height="244"');
    expect(svg).toContain('viewBox="0 0 122 244"');
    expect(svg).toContain('#ff8000');
    expect(svg).toContain('#ffffff');
    expect(svg).toContain('#ff0000');
    expect(svg).toContain('#0000ff');
    expect(svg).toContain('#00ff00');
    expect(svg).toContain('#ffff00');
  });

  it('renders moved pieces and the unsolved middle slice back color', () => {
    const solved = renderSquareOneState(createSolvedSquareOneState());
    const moved = renderSquareOneState(
      applySquareOneAlgorithm(createSolvedSquareOneState(), '(3,0) /'),
    );

    expect(moved).not.toBe(solved);
    expect(solved).not.toMatch(/<rect[^>]+fill="#ff8000"/);
    expect(moved).toMatch(/<rect[^>]+fill="#ff8000"/);
  });

  it('applies custom face colors', () => {
    const svg = renderSquareOneState(createSolvedSquareOneState(), {
      U: '#123456',
      F: '#654321',
      B: '#abcdef',
    });

    expect(svg).toContain('#123456');
    expect(svg).toContain('#654321');
    expect(svg).toContain('#abcdef');
  });

  it('renders Square-1 scrambles through the public image renderer', () => {
    expect(renderScrambleImage('sq1', '(3,0) /')).toContain(
      'viewBox="0 0 122 244"',
    );
  });
});
