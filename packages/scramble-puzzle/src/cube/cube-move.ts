export type CubeFace = 'R' | 'U' | 'F' | 'L' | 'D' | 'B';

export interface CubeMove {
  face: CubeFace;
  amount: 1 | 2 | 3;
  width: number;
  isRotation: boolean;
}
