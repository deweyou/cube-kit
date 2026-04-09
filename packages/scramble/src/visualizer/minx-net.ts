import { svgRect } from './svg';
import { DEFAULT_COLOR_SCHEME } from '../types';

/**
 * Megaminx has 12 pentagonal faces, each with 11 stickers (1 center + 10 edge/corner stickers).
 * For simplicity we render a 5×2 grid of simplified faces (using rect approximations).
 * Each face is shown as a 3×4 grid of rects (approximating the pentagon's sticker layout).
 *
 * Faces: U=0, BL=1, BR=2, R=3, DR=4, DL=5, L=6, DBL=7, B=8, DBR=9, F=10, D=11
 * (cstimer Megaminx face ordering)
 */

const CELL = 8;
const GAP = 1;

const renderFaceGrid = (
  colors: string[],
  cols: number,
  rows: number,
  ox: number,
  oy: number,
): string => {
  let out = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= colors.length) break;
      const x = ox + c * (CELL + GAP);
      const y = oy + r * (CELL + GAP);
      out += svgRect(x, y, CELL, CELL, colors[idx]);
    }
  }
  return out;
};

/**
 * Render a solved Megaminx state or a placeholder.
 * 12 faces in a 4×3 grid, each face shown as 11 colored squares.
 */
export const renderMinxNet = (faceColors: string[] = []): string => {
  const cs = DEFAULT_COLOR_SCHEME;
  // 12 face colors for solved Megaminx (approximation)
  const megaminxColors = [
    cs.U, // face 0 = U (white)
    '#ff8800', // face 1 (orange)
    '#ffff00', // face 2 (yellow) - actually D color
    cs.R, // face 3
    '#00ccff', // face 4 (light blue)
    '#cc00cc', // face 5 (purple)
    cs.L, // face 6
    '#00cc00', // face 7
    cs.B, // face 8
    '#ff66cc', // face 9 (pink)
    cs.F, // face 10
    cs.D, // face 11 = D
  ];

  const faceCols = 3;
  const faceRows = 3; // 3+3+3+2 stickers per face approximation
  const faceW = faceCols * (CELL + GAP) - GAP;
  const faceH = faceRows * (CELL + GAP) - GAP;
  const facePad = 2;

  let out = '';
  const gridCols = 4;
  for (let i = 0; i < 12; i++) {
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const ox = col * (faceW + facePad + GAP);
    const oy = row * (faceH + facePad + GAP);
    const color = faceColors[i] ?? megaminxColors[i];
    const stickers = Array(faceCols * faceRows).fill(color);
    out += renderFaceGrid(stickers, faceCols, faceRows, ox, oy);
  }
  return out;
};

export const viewBoxMinx = `0 0 ${4 * (3 * (CELL + GAP) + GAP + 1)} ${3 * (3 * (CELL + GAP) + GAP + 1)}`;
