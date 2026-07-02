import { describe, expect, it } from 'vitest';
import {
  applySquareOneMove,
  createSolvedSquareOneState,
  parseSquareOneAlgorithm,
  type SquareOneState,
} from '@cubegin/scramble-puzzle';
import { renderScrambleImage } from '../render.js';
import { renderSquareOneState } from './square1.js';

const applySquareOneAlgorithm = (state: SquareOneState, algorithm: string): SquareOneState =>
  parseSquareOneAlgorithm(algorithm).reduce(
    (currentState, move) => applySquareOneMove(currentState, move),
    state,
  );

const countPathElements = (svg: string): number => svg.match(/<path\b/g)?.length ?? 0;
const countRectElements = (svg: string): number => svg.match(/<rect\b/g)?.length ?? 0;
const countFill = (svg: string, color: string): number =>
  svg.match(new RegExp(`fill="${color}"`, 'g'))?.length ?? 0;

interface TransformCenter {
  readonly x: number;
  readonly y: number;
}

const transformCenters = (svg: string): readonly TransformCenter[] =>
  Array.from(svg.matchAll(/transform="rotate\([^"]* (?<x>[-\d.]+) (?<y>[-\d.]+)\)"/g)).map(
    (match) => ({
      x: Number(match.groups?.x),
      y: Number(match.groups?.y),
    }),
  );

const countTransformCenter = (
  centers: readonly TransformCenter[],
  centerX: number,
  centerY: number,
): number =>
  centers.filter(
    (center) => Math.abs(center.x - centerX) < 0.000001 && Math.abs(center.y - centerY) < 0.000001,
  ).length;

describe('renderSquareOneState', () => {
  it('renders solved Square-1 state SVG', () => {
    expect(renderSquareOneState(createSolvedSquareOneState())).toContain('<svg');
  });

  it('uses a split-layer Square-1 viewbox and default colors', () => {
    const svg = renderSquareOneState(createSolvedSquareOneState());

    expect(svg).toContain('width="244"');
    expect(svg).toContain('height="244"');
    expect(svg).toContain('viewBox="0 0 244 244"');
    expect(svg).toContain('#ff8000');
    expect(svg).toContain('#ffffff');
    expect(svg).toContain('#ff0000');
    expect(svg).toContain('#0000ff');
    expect(svg).toContain('#00ff00');
    expect(svg).toContain('#ffff00');
  });

  it('renders top layer with one middle slice and bottom layer with a copied middle slice', () => {
    const svg = renderSquareOneState(createSolvedSquareOneState());
    const centers = transformCenters(svg);

    expect(countRectElements(svg)).toBe(8);
    expect(countTransformCenter(centers, 61, 118.8)).toBeGreaterThan(0);
    expect(countTransformCenter(centers, 183, 125.2)).toBeGreaterThan(0);
    expect(countTransformCenter(centers, 61, 61)).toBe(0);
    expect(countTransformCenter(centers, 183, 183)).toBe(0);
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
    expect(renderScrambleImage('sq1', '(3,0) /')).toContain('viewBox="0 0 244 244"');
  });

  it('coalesces Square-1 corners split across the face boundary', () => {
    const solved = renderScrambleImage('sq1', '');
    const wrapCorner = renderScrambleImage('sq1', '(-1,0)');

    expect(countPathElements(solved)).toBe(40);
    expect(countPathElements(wrapCorner)).toBe(countPathElements(solved));
    expect(wrapCorner).not.toBe(solved);
  });

  it('uses the L color when a piece references an unknown Square-1 side', () => {
    const pieces = Array.from({ length: 24 }, () => 3);
    pieces[0] = 16;
    const svg = renderSquareOneState({ sliceSolved: true, pieces } as SquareOneState, {
      L: '#123456',
      B: '#654321',
      D: '#abcdef',
      U: '#fedcba',
    });

    expect(countFill(svg, '#123456')).toBe(1);
  });

  it('skips missing Square-1 piece positions without emitting unsafe fills', () => {
    const completePieces = Array.from({ length: 24 }, (_, index) => (index % 2 === 0 ? 1 : 3));
    const sparsePieces = [...completePieces] as (number | undefined)[];
    sparsePieces[0] = undefined;

    const complete = renderSquareOneState({ sliceSolved: true, pieces: completePieces });
    const sparse = renderSquareOneState({
      sliceSolved: true,
      pieces: sparsePieces as readonly number[],
    });

    expect(countPathElements(sparse)).toBe(countPathElements(complete) - 2);
    expect(sparse).not.toContain('fill="undefined"');
  });
});
