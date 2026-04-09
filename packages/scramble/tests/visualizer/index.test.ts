import { describe, expect, it } from 'vitest';
import { generateScrambleImage } from '../../src/index';

describe('generateScrambleImage', () => {
  it('returns an SVG string for 3x3', async () => {
    const svg = await generateScrambleImage('333', "R U R' U'");
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('</svg>');
  });

  it('returns an SVG string for 2x2', async () => {
    const svg = await generateScrambleImage('222', "R U R' U'");
    expect(svg).toMatch(/^<svg/);
  });

  it('returns an SVG string for 4x4', async () => {
    const svg = await generateScrambleImage('444', "Rw U R' U'");
    expect(svg).toMatch(/^<svg/);
  });

  it('returns an SVG string for skewb', async () => {
    const svg = await generateScrambleImage('skewb', "R U L'");
    expect(svg).toMatch(/^<svg/);
  });

  it('returns an SVG string for pyram', async () => {
    const svg = await generateScrambleImage('pyram', "U R L'");
    expect(svg).toMatch(/^<svg/);
  });

  it('returns an SVG string for sq1', async () => {
    const svg = await generateScrambleImage('sq1', '(1,0) / (3,3)');
    expect(svg).toMatch(/^<svg/);
  });

  it('returns an SVG string for clock', async () => {
    const svg = await generateScrambleImage('clock', 'ULpin+ URpin+');
    expect(svg).toMatch(/^<svg/);
  });

  it('returns an SVG string for minx', async () => {
    const svg = await generateScrambleImage('minx', 'R++ D-- R++');
    expect(svg).toMatch(/^<svg/);
  });

  it('respects custom width/height options', async () => {
    const svg = await generateScrambleImage('333', 'R U', { width: 200, height: 150 });
    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="150"');
  });

  it('throws for 3d mode (not implemented)', async () => {
    await expect(generateScrambleImage('333', 'R', { mode: '3d' })).rejects.toThrow('3D');
  });
});
