import { describe, expect, it } from 'vitest';
import { WCA_EVENT_IDS, type WcaEventId } from '@cubegin/scramble-puzzle';
import { renderScrambleImage } from './render.js';

interface SvgRootContract {
  readonly width: number;
  readonly height: number;
  readonly rects: number;
  readonly paths: number;
  readonly circles: number;
  readonly texts: number;
}

const SAMPLE_SCRAMBLES = {
  '333': 'R U',
  '222': 'R U',
  '444': 'Rw U',
  '555': 'Rw U',
  '666': 'Rw U',
  '777': 'Rw U',
  '333bld': 'R U x',
  '333fm': "R' U' F R U F'",
  '333oh': 'R U',
  clock: 'UR3+ DR2- DL0+ UL5- U1+ R2+ D3- L4+ ALL5+ y2 U1- R2- D3+ L4- ALL5-',
  minx: "R++ D-- R-- D++ R++ D++ R-- D-- R++ D-- U'",
  pyram: "U L R B u' l' r' b'",
  skewb: "R U L B R' U'",
  sq1: '(3,0) / (0,3) /',
  '444bld': 'Rw U x',
  '555bld': 'Rw U x',
  '333mbld': 'R U',
} as const satisfies Record<WcaEventId, string>;

const cubeRootContract = (size: number): SvgRootContract => {
  const unit = size * 10;

  return {
    width: (unit + 2) * 4 + 2,
    height: (unit + 2) * 3 + 2,
    rects: 6 * size * size,
    paths: 0,
    circles: 0,
    texts: 0,
  };
};

const SVG_ROOT_CONTRACTS = {
  '222': cubeRootContract(2),
  '333': cubeRootContract(3),
  '333bld': cubeRootContract(3),
  '333fm': cubeRootContract(3),
  '333oh': cubeRootContract(3),
  '333mbld': cubeRootContract(3),
  '444': cubeRootContract(4),
  '444bld': cubeRootContract(4),
  '555': cubeRootContract(5),
  '555bld': cubeRootContract(5),
  '666': cubeRootContract(6),
  '777': cubeRootContract(7),
  clock: { width: 300, height: 150, rects: 0, paths: 18, circles: 270, texts: 0 },
  minx: { width: 304, height: 146, rects: 0, paths: 132, circles: 0, texts: 2 },
  pyram: { width: 200, height: 170, rects: 0, paths: 36, circles: 0, texts: 0 },
  skewb: { width: 217, height: 187, rects: 0, paths: 30, circles: 0, texts: 0 },
  sq1: { width: 122, height: 244, rects: 4, paths: 40, circles: 0, texts: 0 },
} as const satisfies Record<WcaEventId, SvgRootContract>;

const countElements = (svg: string, elementName: string): number =>
  svg.match(new RegExp(`<${elementName}\\b`, 'g'))?.length ?? 0;

const isometricPathCountFor = (eventId: WcaEventId): number | undefined => {
  switch (eventId) {
    case '222':
      return 25;
    case '333':
    case '333bld':
    case '333fm':
    case '333oh':
    case '333mbld':
      return 55;
    case '444':
    case '444bld':
      return 97;
    case '555':
    case '555bld':
      return 151;
    case '666':
      return 217;
    case '777':
      return 295;
    case 'minx':
      return 133;
    case 'pyram':
      return 37;
    case 'skewb':
      return 31;
    case 'clock':
    case 'sq1':
      return undefined;
  }
};

describe('renderScrambleImage', () => {
  it('renders every WCA event with its renderer root SVG shape', () => {
    for (const eventId of WCA_EVENT_IDS) {
      const svg = renderScrambleImage(eventId, SAMPLE_SCRAMBLES[eventId]);
      const root = SVG_ROOT_CONTRACTS[eventId];

      expect(svg).toMatch(
        new RegExp(
          `^<svg width="${root.width}" height="${root.height}" viewBox="0 0 ${root.width} ${root.height}"`,
        ),
      );
      expect(countElements(svg, 'rect')).toBe(root.rects);
      expect(countElements(svg, 'path')).toBe(root.paths);
      expect(countElements(svg, 'circle')).toBe(root.circles);
      expect(countElements(svg, 'text')).toBe(root.texts);
    }
  });

  it('renders optional isometric SVGs and falls back for Clock and Square-1', () => {
    for (const eventId of WCA_EVENT_IDS) {
      const net = renderScrambleImage(eventId, SAMPLE_SCRAMBLES[eventId]);
      const isometric = renderScrambleImage(eventId, SAMPLE_SCRAMBLES[eventId], {
        view: 'isometric',
      });
      const isometricPaths = isometricPathCountFor(eventId);

      if (isometricPaths === undefined) {
        expect(isometric).toBe(net);
        continue;
      }

      expect(isometric).not.toBe(net);
      expect(countElements(isometric, 'path')).toBe(isometricPaths);
      expect(countElements(isometric, 'rect')).toBe(0);
    }
  });
});
