import { describe, expect, it } from 'vitest';
import { rect } from './svg-elements.js';
import { createSvgDocument } from './svg-document.js';

describe('SVG serialization', () => {
  it('serializes width, height, viewBox, and escaped attributes', () => {
    const svg = createSvgDocument(20, 10, [
      rect({ x: 0, y: 0, width: 10, height: 10, fill: '#fff', stroke: '#000' }),
    ]);

    expect(svg).toContain('<svg');
    expect(svg).toContain('width="20"');
    expect(svg).toContain('height="10"');
    expect(svg).toContain('viewBox="0 0 20 10"');
    expect(svg).toContain('<rect');
  });
});
