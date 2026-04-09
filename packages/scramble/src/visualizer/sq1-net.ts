import { svgPolygon, svgCircle } from './svg';
import { DEFAULT_COLOR_SCHEME } from '../types';

/**
 * Square-1 top-down layer view.
 * Each layer shows 8 pieces: 4 corners (30° each) and 4 edges (60° each),
 * alternating corner-edge-corner-edge around the ring.
 *
 * We render solved state since sq1 move application is not yet implemented.
 */

const R = 16; // disc radius
const GAP = 6; // gap between two layers
const TOTAL_W = R * 2 * 2 + GAP + 2;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Render a single sector as a polygon from center, approximating the arc
 * with intermediate points for smoother edges on wide sectors.
 */
const renderSector = (
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  color: string,
): string => {
  const spanDeg = endDeg - startDeg;
  // Use 2 intermediate points for 60° sectors, 1 for 30°
  const steps = spanDeg > 30 ? 2 : 1;
  const outerPts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const deg = startDeg + (spanDeg * i) / steps;
    outerPts.push([cx + r * Math.cos(toRad(deg)), cy + r * Math.sin(toRad(deg))]);
  }
  return svgPolygon([[cx, cy], ...outerPts], color);
};

/**
 * Render a Square-1 layer as a disc with 8 sectors.
 * Sector layout (clockwise from top=-90°):
 *   corner(30°), edge(60°), corner(30°), edge(60°) × 4
 */
const renderLayer = (cx: number, cy: number, cornerColor: string, edgeColor: string): string => {
  let out = svgCircle(cx, cy, R + 0.5, '#2a2a2a', '#555', 0.5);
  let angle = -90;
  for (let i = 0; i < 8; i++) {
    const isCorner = i % 2 === 0;
    const span = isCorner ? 30 : 60;
    out += renderSector(cx, cy, R, angle, angle + span, isCorner ? cornerColor : edgeColor);
    angle += span;
  }
  // Center hub
  out += svgCircle(cx, cy, 2, '#555', 'none', 0);
  return out;
};

export const renderSq1Net = (_scramble?: string): string => {
  const cs = DEFAULT_COLOR_SCHEME;
  const cx1 = R + 1;
  const cx2 = R + 1 + R * 2 + GAP;
  const cy = R + 1;
  // Top layer: U face (white corners, slightly warm edges)
  const topLayer = renderLayer(cx1, cy, cs.U, cs.F);
  // Bottom layer: D face (yellow corners, slightly cool edges)
  const bottomLayer = renderLayer(cx2, cy, cs.D, cs.B);
  return topLayer + bottomLayer;
};

export const viewBoxSq1 = `0 0 ${TOTAL_W} ${R * 2 + 2}`;
