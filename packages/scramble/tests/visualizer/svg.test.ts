import { describe, expect, it } from 'vitest';
import { svgRect, svgGroup, svgWrap } from '../../src/visualizer/svg';

describe('svgRect', () => {
  it('returns a string containing rect element', () => {
    const r = svgRect(0, 0, 10, 10, '#ff0000');
    expect(r).toContain('<rect');
    expect(r).toContain('fill="#ff0000"');
    expect(r).toContain('width="10"');
    expect(r).toContain('height="10"');
  });
});

describe('svgGroup', () => {
  it('wraps content in <g> tag', () => {
    const g = svgGroup('<rect/>');
    expect(g).toContain('<g>');
    expect(g).toContain('</g>');
    expect(g).toContain('<rect/>');
  });

  it('includes transform if provided', () => {
    const g = svgGroup('', 'translate(10,20)');
    expect(g).toContain('transform="translate(10,20)"');
  });
});

describe('svgWrap', () => {
  it('starts with <svg and ends with </svg>', () => {
    const s = svgWrap('<rect/>', '0 0 100 100');
    expect(s.trimStart()).toMatch(/^<svg/);
    expect(s.trimEnd()).toMatch(/<\/svg>$/);
  });

  it('contains the viewBox attribute', () => {
    const s = svgWrap('', '0 0 200 150');
    expect(s).toContain('viewBox="0 0 200 150"');
  });

  it('includes width and height when provided', () => {
    const s = svgWrap('', '0 0 100 100', 200, 150);
    expect(s).toContain('width="200"');
    expect(s).toContain('height="150"');
  });
});
