import type { CubeFacelet, CubeState } from '@cubekit/scramble-puzzle';
import { DEFAULT_CUBE_COLORS, type HexColor } from '../color.js';
import { createSvgDocument } from '../svg/svg-document.js';
import { rect, type SvgNode } from '../svg/svg-elements.js';

const GAP = 2;
const STICKER = 10;

const FACE_ORDER = ['R', 'U', 'F', 'L', 'D', 'B'] as const;

type CubeFace = (typeof FACE_ORDER)[number];
type FaceOrigins = Record<CubeFace, readonly [number, number]>;

const createFaceOrigins = (unit: number): FaceOrigins => ({
  L: [GAP, 2 * GAP + unit],
  D: [2 * GAP + unit, 3 * GAP + 2 * unit],
  B: [4 * GAP + 3 * unit, 2 * GAP + unit],
  R: [3 * GAP + 2 * unit, 2 * GAP + unit],
  U: [2 * GAP + unit, GAP],
  F: [2 * GAP + unit, 2 * GAP + unit],
});

export type CubeColorScheme = Partial<Record<CubeFacelet, HexColor>>;

export const renderCubeNet = (state: CubeState, colorScheme: CubeColorScheme = {}): string => {
  const colors: Record<CubeFacelet, HexColor> = { ...DEFAULT_CUBE_COLORS, ...colorScheme };
  const unit = state.size * STICKER;
  const width = (unit + GAP) * 4 + GAP;
  const height = (unit + GAP) * 3 + GAP;
  const faceOrigins = createFaceOrigins(unit);
  const nodes: SvgNode[] = [];

  for (const [face, [originX, originY]] of Object.entries(faceOrigins) as [CubeFace, readonly [number, number]][]) {
    const faceIndex = FACE_ORDER.indexOf(face);
    const stickers = state.image[faceIndex];

    for (let row = 0; row < state.size; row += 1) {
      for (let col = 0; col < state.size; col += 1) {
        nodes.push(
          rect({
            x: originX + col * STICKER,
            y: originY + row * STICKER,
            width: STICKER,
            height: STICKER,
            fill: colors[stickers[row][col]],
            stroke: '#000000',
          }),
        );
      }
    }
  }

  return createSvgDocument(width, height, nodes);
};
