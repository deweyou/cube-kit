import { describe, expect, it } from 'vitest';
import { createSvgDocument } from './svg-document.js';
import { circle, group, path, rect, text, type SvgNode } from './svg-elements.js';
import { serializeSvgNode } from './svg-serialize.js';

describe('SVG serialization', () => {
  it('serializes width, height, viewBox, and children', () => {
    const svg = createSvgDocument(20, 10, [
      rect({ x: 0, y: 0, width: 10, height: 10, fill: '#fff', stroke: '#000' }),
    ]);

    expect(svg).toBe(
      '<svg width="20" height="10" viewBox="0 0 20 10" version="1.1" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="10" height="10" fill="#fff" stroke="#000"></rect></svg>',
    );
  });

  it('escapes attribute values', () => {
    expect(serializeSvgNode(path({ d: 'M0&"<>', stroke: 'a&b"c<d>e' }))).toBe(
      '<path d="M0&amp;&quot;&lt;&gt;" stroke="a&amp;b&quot;c&lt;d&gt;e"></path>',
    );
  });

  it('escapes text content', () => {
    expect(text({ x: 1, y: 2 }, 'A&B"C<D>E')).toEqual({
      name: 'text',
      attrs: { x: 1, y: 2 },
      text: 'A&B"C<D>E',
    });
    expect(serializeSvgNode(text({ x: 1, y: 2 }, 'A&B"C<D>E'))).toBe(
      '<text x="1" y="2">A&amp;B&quot;C&lt;D&gt;E</text>',
    );
  });

  it('serializes nested group children in order', () => {
    expect(
      serializeSvgNode(
        group({ id: 'layer-1' }, [
          rect({ x: 0, y: 0, width: 1, height: 2 }),
          circle({ cx: 3, cy: 4, r: 5 }),
        ]),
      ),
    ).toBe(
      '<g id="layer-1"><rect x="0" y="0" width="1" height="2"></rect><circle cx="3" cy="4" r="5"></circle></g>',
    );
  });

  it('preserves real data-text attributes separately from text content', () => {
    expect(serializeSvgNode(text({ 'data-text': 'label&attr', x: 1 }, 'body&text'))).toBe(
      '<text data-text="label&amp;attr" x="1">body&amp;text</text>',
    );
  });

  it('rejects unsupported node names', () => {
    const node = { name: 'script', attrs: {} } as unknown as SvgNode;

    expect(() => serializeSvgNode(node)).toThrow(
      "@cubegin/scramble-image: invalid SVG element name 'script'",
    );
  });

  it('rejects unsafe attribute names', () => {
    expect(() => serializeSvgNode(rect({ 'stroke width': 1 }))).toThrow(
      "@cubegin/scramble-image: invalid SVG attribute name 'stroke width'",
    );
    expect(() => serializeSvgNode(rect({ 'fill"': '#fff' }))).toThrow(
      "@cubegin/scramble-image: invalid SVG attribute name 'fill\"'",
    );
  });
});
