import { svgCircle, svgLine } from './svg';

/**
 * Rubik's Clock: 2 panels (front and back), each with 9 clock dials in 3×3.
 * Each dial has an hour-hand at a position 0-11 (like a clock face).
 * State: front panel dials [0..8], back panel dials [9..17] — all 0 (solved).
 */

const DIAL_R = 7; // dial radius
const GAP = 3;
const STEP = DIAL_R * 2 + GAP; // center-to-center spacing

/**
 * Render one clock dial at center (cx, cy) with hand at hour position (0-11).
 */
const renderDial = (cx: number, cy: number, hour: number): string => {
  const angle = (hour / 12) * Math.PI * 2 - Math.PI / 2;
  const handLen = DIAL_R * 0.7;
  const hx = cx + Math.cos(angle) * handLen;
  const hy = cy + Math.sin(angle) * handLen;
  return (
    svgCircle(cx, cy, DIAL_R, '#1a1a1a', '#555555', 0.5) +
    svgLine(cx, cy, hx, hy, '#ffffff', 1.5) +
    svgCircle(cx, cy, 1.2, '#ffffff', 'none', 0)
  );
};

/**
 * Render one 3×3 panel of clock dials.
 * values: 9 integers (0-11 each, 0 = 12 o'clock).
 */
const renderPanel = (values: number[], ox: number, oy: number): string => {
  let out = '';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cx = ox + DIAL_R + c * STEP;
      const cy = oy + DIAL_R + r * STEP;
      out += renderDial(cx, cy, values[r * 3 + c] ?? 0);
    }
  }
  return out;
};

const PANEL_W = 3 * STEP - GAP + 2; // ~slight padding

/**
 * Render clock state as two side-by-side panels (front | gap | back).
 * For solved state, all dials point to 12 (hour=0).
 */
export const renderClockNet = (_scramble?: string): string => {
  const solved = Array<number>(9).fill(0);
  const panelGap = GAP * 3;
  return renderPanel(solved, 0, 0) + renderPanel(solved, PANEL_W + panelGap, 0);
};

export const viewBoxClock = `0 0 ${2 * PANEL_W + GAP * 3} ${3 * STEP - GAP}`;
