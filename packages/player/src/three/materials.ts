import { MeshStandardMaterial } from 'three';

export type StickerFace = 'R' | 'L' | 'U' | 'D' | 'F' | 'B';

const CUBIE_BODY_COLOR = 0x111827;

const STICKER_COLORS = {
  R: 0xd9342b,
  L: 0xf97316,
  U: 0xf8fafc,
  D: 0xfacc15,
  F: 0x22c55e,
  B: 0x2563eb,
} satisfies Record<StickerFace, number>;

const createMaterial = (color: number): MeshStandardMaterial =>
  new MeshStandardMaterial({
    color,
    metalness: 0,
    roughness: 0.72,
  });

export const createCubieBodyMaterial = (): MeshStandardMaterial =>
  createMaterial(CUBIE_BODY_COLOR);

export const createStickerMaterial = (face: StickerFace): MeshStandardMaterial =>
  createMaterial(STICKER_COLORS[face]);
