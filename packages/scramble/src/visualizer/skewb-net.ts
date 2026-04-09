import { svgPolygon } from './svg';
import type { CubeState } from '../types';

/**
 * Skewb: 6 square faces, each divided by two diagonals (X-cut) into
 * 4 corner triangles + 1 center diamond = 5 stickers per face.
 * Face order: 0=U, 1=D, 2=F, 3=B, 4=L, 5=R  (CubeState convention)
 * Sticker order within face: [center, TL, TR, BL, BR]
 * (Matches cstimer: position 0=center, 1=TL, 2=TR, 3=BL, 4=BR)
 */

const CELL = 18;
const GAP = 2;

/**
 * Render one skewb face using X-cut polygons.
 * stickers: [center, TL-corner, TR-corner, BL-corner, BR-corner]
 */
const renderSkewbFace = (stickers: string[], ox: number, oy: number): string => {
  const cx = ox + CELL / 2;
  const cy = oy + CELL / 2;

  // 4 corner right-triangles (positions 1=TL, 2=TR, 3=BL, 4=BR)
  const tl = svgPolygon([[ox, oy], [cx, oy], [ox, cy]], stickers[1] ?? stickers[0]);
  const tr = svgPolygon([[cx, oy], [ox + CELL, oy], [ox + CELL, cy]], stickers[2] ?? stickers[0]);
  const bl = svgPolygon([[ox, cy], [cx, oy + CELL], [ox, oy + CELL]], stickers[3] ?? stickers[0]);
  const br = svgPolygon([[ox + CELL, cy], [ox + CELL, oy + CELL], [cx, oy + CELL]], stickers[4] ?? stickers[0]);

  // Center diamond: vertices at edge midpoints
  const center = svgPolygon(
    [[cx, oy], [ox + CELL, cy], [cx, oy + CELL], [ox, cy]],
    stickers[0],
  );

  return tl + tr + bl + br + center;
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

export { skewbSolvedState } from './skewb-state';

export const viewBoxSkewb = `0 0 ${4 * FACE_SIZE - GAP} ${3 * FACE_SIZE - GAP}`;
