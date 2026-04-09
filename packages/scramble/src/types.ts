export type WcaEvent =
  | '333'
  | '222'
  | '444'
  | '555'
  | '666'
  | '777'
  | '333bf'
  | '333fm'
  | '333oh'
  | '444bf'
  | '555bf'
  | 'minx'
  | 'pyram'
  | 'sq1'
  | 'skewb'
  | 'clock';

export type VisualizerMode = '2d' | '3d';

export interface ImageOptions {
  /** Width of the output SVG in px. Default: 200 */
  width?: number;
  /** Height of the output SVG in px. Default: 150 */
  height?: number;
  /** Color scheme for sticker faces. Default: WCA standard */
  colorScheme?: ColorScheme;
  /** Visualization mode. Only '2d' is implemented; '3d' throws. Default: '2d' */
  mode?: VisualizerMode;
}

export interface ColorScheme {
  U: string;
  D: string;
  F: string;
  B: string;
  L: string;
  R: string;
}

export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  U: '#ffffff',
  D: '#ffff00',
  F: '#00aa00',
  B: '#0000cc',
  L: '#ff6600',
  R: '#cc0000',
};

/**
 * CubeState represents the sticker colors of a puzzle.
 * For NxN cubes: array of 6 faces, each face is N*N stickers in reading order.
 * Face index: 0=U, 1=D, 2=F, 3=B, 4=L, 5=R
 */
export type CubeState = string[][];
