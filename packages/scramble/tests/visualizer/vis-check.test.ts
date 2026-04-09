import { describe, it } from 'vitest';
import { generateImage } from '../../src/visualizer/index';

describe('non-nxn output check', () => {
  for (const event of ['skewb', 'pyram', 'sq1', 'clock', 'minx'] as const) {
    it(event, () => {
      const svg = generateImage(event, '');
      const rects = (svg.match(/<rect/g) ?? []).length;
      const vb = svg.match(/viewBox="([^"]+)"/)?.[1];
      console.log(event, '| rects:', rects, '| viewBox:', vb);
    });
  }
});
