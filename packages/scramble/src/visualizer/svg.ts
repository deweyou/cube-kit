/** Returns a `<rect>` SVG element string. */
export const svgRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke = '#333333',
  strokeWidth = 0.5,
): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;

/** Returns a `<polygon>` SVG element string. */
export const svgPolygon = (
  points: [number, number][],
  fill: string,
  stroke = '#333333',
  strokeWidth = 0.5,
): string => {
  const pts = points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
};

/** Returns a `<circle>` SVG element string. */
export const svgCircle = (
  cx: number,
  cy: number,
  r: number,
  fill: string,
  stroke = '#333333',
  strokeWidth = 0.5,
): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;

/** Returns a `<line>` SVG element string. */
export const svgLine = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke = '#ffffff',
  strokeWidth = 1.5,
): string =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;

/** Wraps content in a `<g>` group, optionally with a transform. */
export const svgGroup = (content: string, transform?: string): string => {
  const attr = transform ? ` transform="${transform}"` : '';
  return `<g${attr}>${content}</g>`;
};

/** Wraps content in a complete `<svg>` element. */
export const svgWrap = (
  content: string,
  viewBox: string,
  width?: number,
  height?: number,
): string => {
  const wAttr = width != null ? ` width="${width}"` : '';
  const hAttr = height != null ? ` height="${height}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${wAttr}${hAttr}>${content}</svg>`;
};
