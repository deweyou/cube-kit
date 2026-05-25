export type CubeFace = 'R' | 'U' | 'F' | 'L' | 'D' | 'B';

export interface CubeLayerMove {
  face: CubeFace;
  amount: 1 | 2 | 3;
  width: number;
  isRotation: false;
}

export interface CubeRotationMove {
  face: CubeFace;
  amount: 1 | 2 | 3;
  width: number;
  isRotation: true;
}

export type CubeMove = CubeLayerMove | CubeRotationMove;
