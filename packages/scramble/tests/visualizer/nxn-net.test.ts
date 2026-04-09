import { describe, expect, it } from 'vitest';
import { solvedState, applyScramble } from '../../src/visualizer/apply-moves';
import { renderNxNNet, nxnViewBox } from '../../src/visualizer/nxn-net';

describe('renderNxNNet — 2x2', () => {
  it('solved state: all rects for each face use the correct color', () => {
    const state = solvedState('222');
    const svg = renderNxNNet(state);
    expect(svg).toContain('fill="#ffffff"'); // U
    expect(svg).toContain('fill="#ffff00"'); // D
    expect(svg).toContain('fill="#00aa00"'); // F
    expect(svg).toContain('fill="#0000cc"'); // B
    expect(svg).toContain('fill="#ff6600"'); // L
    expect(svg).toContain('fill="#cc0000"'); // R
  });

  it('contains exactly 24 rect elements (6 faces × 4 stickers)', () => {
    const svg = renderNxNNet(solvedState('222'));
    expect((svg.match(/<rect/g) ?? []).length).toBe(24);
  });
});

describe('renderNxNNet — 3x3', () => {
  it('solved state contains all 6 face colors', () => {
    const svg = renderNxNNet(solvedState('333'));
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('fill="#ffff00"');
    expect(svg).toContain('fill="#00aa00"');
    expect(svg).toContain('fill="#0000cc"');
    expect(svg).toContain('fill="#ff6600"');
    expect(svg).toContain('fill="#cc0000"');
  });

  it('contains exactly 54 rect elements (6×9)', () => {
    const svg = renderNxNNet(solvedState('333'));
    expect((svg.match(/<rect/g) ?? []).length).toBe(54);
  });

  it('after R move: top face has non-uniform colors', () => {
    const state = applyScramble('R', '333');
    const svg = renderNxNNet(state);
    // After R, U face should have both white and green stickers
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('fill="#00aa00"');
  });
});

describe('renderNxNNet — 4x4', () => {
  it('contains exactly 96 rect elements (6×16)', () => {
    const svg = renderNxNNet(solvedState('444'));
    expect((svg.match(/<rect/g) ?? []).length).toBe(96);
  });
});

describe('nxnViewBox', () => {
  it('2x2 viewBox has correct dimensions', () => {
    const vb = nxnViewBox(2);
    expect(vb).toMatch(/^0 0 \d+ \d+$/);
    const [, , w, h] = vb.split(' ').map(Number);
    // 4 faces wide × (2 cells + gaps), 3 faces tall
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);
    expect(w / h).toBeCloseTo(4 / 3, 0);
  });
});
