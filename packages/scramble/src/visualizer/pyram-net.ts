import { svgPolygon } from './svg';
import type { CubeState } from '../types';
import { DEFAULT_COLOR_SCHEME } from '../types';

/**
 * Pyraminx net: 4 equilateral triangular faces.
 * Net layout (standard T-shape):
 *       [U↑]
 *  [L↓][F↑][R↓]
 *
 * Each face is subdivided into 9 small triangles (3-row grid):
 *   row 0 (top): 1 up-triangle
 *   row 1 (mid): 2 up-triangles + 1 down-triangle
 *   row 2 (bot): 3 up-triangles + 2 down-triangles  (total 5+4=9)
 *
 * Sticker index mapping (reading order, up-triangles first per row):
 *   0=tip(top), 1=mid-left-up, 2=mid-right-up, 3=mid-center-down,
 *   4=bot-left-up, 5=bot-center-up, 6=bot-right-up, 7=bot-left-down, 8=bot-right-down
 */

const BASE = 44; // base width of full triangular face
const H = Math.round(BASE * Math.sqrt(3)) / 2; // height of equilateral triangle
const S = Math.round(BASE / 3); // small triangle base
const SH = Math.round(S * Math.sqrt(3)) / 2; // small triangle height
const GAP = 3;

/**
 * Render one small upward-pointing triangle at row `r`, col `c` within a face.
 * Row 0 has its left edge at x = fx + (N-1-r)*S/2 = fx + (2-r)*S/2.
 * This ensures the apex of row 0 is centered (at fx + BASE/2).
 */
const upTri = (fx: number, fy: number, r: number, c: number, color: string): string => {
  const left = fx + (2 - r) * (S / 2) + c * S;
  const top = fy + r * SH;
  return svgPolygon(
    [
      [left + S / 2, top],
      [left + S, top + SH],
      [left, top + SH],
    ],
    color,
  );
};

/**
 * Render one small downward-pointing triangle at row `r`, col `c` within a face.
 * Down triangles have their base at `top` (two top corners) and apex at `top + SH`.
 */
const downTri = (fx: number, fy: number, r: number, c: number, color: string): string => {
  const left = fx + (2 - r) * (S / 2) + c * S;
  const top = fy + r * SH;
  return svgPolygon(
    [
      [left + S / 2, top],
      [left + (3 * S) / 2, top],
      [left + S, top + SH],
    ],
    color,
  );
};

/**
 * Render an upward-pointing face (U, F).
 * Sticker order: tip=0, mid-L=1, mid-R=2, mid-down=3, bot-L=4, bot-C=5, bot-R=6, bot-dL=7, bot-dR=8
 */
const renderFaceUp = (stickers: string[], fx: number, fy: number): string => {
  const s = (i: number) => stickers[i] ?? stickers[0];
  return [
    upTri(fx, fy, 0, 0, s(0)),
    upTri(fx, fy, 1, 0, s(1)),
    upTri(fx, fy, 1, 1, s(2)),
    downTri(fx, fy, 1, 0, s(3)),
    upTri(fx, fy, 2, 0, s(4)),
    upTri(fx, fy, 2, 1, s(5)),
    upTri(fx, fy, 2, 2, s(6)),
    downTri(fx, fy, 2, 0, s(7)),
    downTri(fx, fy, 2, 1, s(8)),
  ].join('');
};

/**
 * Render a downward-pointing face using SVG transform (flip vertically).
 */
const renderFaceDownTransform = (stickers: string[], fx: number, fy: number): string => {
  // Render as up-face at origin, then flip and translate
  const inner = renderFaceUp(stickers, 0, 0);
  // Mirror: y → H - y, then translate to (fx, fy)
  const scaleY = -1;
  const translateX = fx;
  const translateY = fy + H;
  return `<g transform="translate(${translateX},${translateY}) scale(1,${scaleY})">${inner}</g>`;
};

export const renderPyramNet = (state: CubeState): string => {
  // Layout:
  //       U (up)    at (BASE+GAP, 0)
  //  L(down) F(up)  R(down) at row H+GAP
  const row2Y = H + GAP;
  return [
    renderFaceUp(state[0], BASE + GAP, 0), // U
    renderFaceDownTransform(state[1], 0, row2Y), // L
    renderFaceUp(state[2], BASE + GAP, row2Y), // F
    renderFaceDownTransform(state[3], 2 * (BASE + GAP), row2Y), // R
  ].join('');
};

export const pyramSolvedState = (): CubeState => {
  const cs = DEFAULT_COLOR_SCHEME;
  return [cs.D, cs.L, cs.R, cs.F].map((c) => Array(9).fill(c));
};

export const viewBoxPyram = `0 0 ${3 * (BASE + GAP) - GAP} ${2 * H + GAP}`;
