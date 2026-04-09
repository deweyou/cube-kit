import { svgPolygon } from './svg';
import type { CubeState } from '../types';
import { DEFAULT_COLOR_SCHEME } from '../types';

/**
 * Skewb: 6 square faces, each divided by two diagonals (X-cut) into
 * 4 corner triangles + 1 center diamond = 5 stickers per face.
 * Face order: 0=U, 1=D, 2=F, 3=B, 4=L, 5=R
 * Sticker order: [center, top, right, bottom, left]
 */

const CELL = 18;
const GAP = 2;

/**
 * Render one skewb face using X-cut polygons.
 * stickers: [center, top-triangle, right-triangle, bottom-triangle, left-triangle]
 */
const renderSkewbFace = (stickers: string[], ox: number, oy: number): string => {
  const cx = ox + CELL / 2;
  const cy = oy + CELL / 2;
  const r = CELL / 5; // center diamond radius

  // 4 corner triangles (X-cut, meeting at center)
  const top = svgPolygon(
    [
      [ox, oy],
      [ox + CELL, oy],
      [cx, cy],
    ],
    stickers[1] ?? stickers[0],
  );
  const right = svgPolygon(
    [
      [ox + CELL, oy],
      [ox + CELL, oy + CELL],
      [cx, cy],
    ],
    stickers[2] ?? stickers[0],
  );
  const bottom = svgPolygon(
    [
      [ox + CELL, oy + CELL],
      [ox, oy + CELL],
      [cx, cy],
    ],
    stickers[3] ?? stickers[0],
  );
  const left = svgPolygon(
    [
      [ox, oy + CELL],
      [ox, oy],
      [cx, cy],
    ],
    stickers[4] ?? stickers[0],
  );

  // Center diamond on top
  const center = svgPolygon(
    [
      [cx, cy - r],
      [cx + r, cy],
      [cx, cy + r],
      [cx - r, cy],
    ],
    stickers[0],
  );

  return top + right + bottom + left + center;
};

const FACE_SIZE = CELL + GAP;

/**
 * Render skewb state as cross net (same layout as NxN but with X-cut polygon faces).
 * Layout: U top, L/F/R/B middle row, D bottom.
 */
export const renderSkewbNet = (state: CubeState): string => {
  const faces = [
    { idx: 0, ox: FACE_SIZE, oy: 0 }, // U
    { idx: 4, ox: 0, oy: FACE_SIZE }, // L
    { idx: 2, ox: FACE_SIZE, oy: FACE_SIZE }, // F
    { idx: 5, ox: 2 * FACE_SIZE, oy: FACE_SIZE }, // R
    { idx: 3, ox: 3 * FACE_SIZE, oy: FACE_SIZE }, // B
    { idx: 1, ox: FACE_SIZE, oy: 2 * FACE_SIZE }, // D
  ];
  return faces.map(({ idx, ox, oy }) => renderSkewbFace(state[idx], ox, oy)).join('');
};

export const skewbSolvedState = (): CubeState => {
  const cs = DEFAULT_COLOR_SCHEME;
  return [cs.U, cs.D, cs.F, cs.B, cs.L, cs.R].map((c) => Array(5).fill(c));
};

export const viewBoxSkewb = `0 0 ${4 * FACE_SIZE - GAP} ${3 * FACE_SIZE - GAP}`;
