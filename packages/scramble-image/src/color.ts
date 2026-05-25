export type HexColor = `#${string}`;

export const DEFAULT_CUBE_COLORS = Object.freeze({
  R: '#ff0000',
  U: '#ffffff',
  F: '#00ff00',
  L: '#ff8000',
  D: '#ffff00',
  B: '#0000ff',
} satisfies Record<string, HexColor>);
