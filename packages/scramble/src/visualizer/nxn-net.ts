import type { CubeState } from '../types';
import { svgRect } from './svg';

const CELL = 10;
const GAP = 1;

/** Render one NxN face as a grid of colored rects, at offset (ox, oy). */
const renderFace = (face: string[], n: number, ox: number, oy: number): string => {
  let out = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = ox + c * (CELL + GAP);
      const y = oy + r * (CELL + GAP);
      out += svgRect(x, y, CELL, CELL, face[r * n + c]);
    }
  }
  return out;
};

/**
 * Render an NxN cube state as an SVG cross net fragment (no outer <svg>).
 * Layout:
 *         [U]
 *  [L] [F] [R] [B]
 *         [D]
 * Face order: 0=U, 1=D, 2=F, 3=B, 4=L, 5=R
 */
export const renderNxNNet = (state: CubeState): string => {
  const n = Math.round(Math.sqrt(state[0].length));
  const faceSize = n * (CELL + GAP) - GAP;
  const padFace = faceSize + GAP; // offset between faces

  const faces = [
    { idx: 0, ox: padFace, oy: 0 }, // U
    { idx: 4, ox: 0, oy: padFace }, // L
    { idx: 2, ox: padFace, oy: padFace }, // F
    { idx: 5, ox: 2 * padFace, oy: padFace }, // R
    { idx: 3, ox: 3 * padFace, oy: padFace }, // B
    { idx: 1, ox: padFace, oy: 2 * padFace }, // D
  ];

  return faces.map(({ idx, ox, oy }) => renderFace(state[idx], n, ox, oy)).join('');
};

/** ViewBox string for an NxN cube net. */
export const nxnViewBox = (n: number): string => {
  const padFace = n * (CELL + GAP);
  const w = 4 * padFace - GAP;
  const h = 3 * padFace - GAP;
  return `0 0 ${w} ${h}`;
};
