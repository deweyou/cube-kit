export type CubeFace = 'R' | 'U' | 'F' | 'L' | 'D' | 'B';
export type CubeSlice = 'M' | 'E' | 'S';

export interface CubeLayerMove {
  face: CubeFace;
  amount: 1 | 2 | 3;
  width: number;
  isRotation: false;
  slice?: undefined;
}

export interface CubeRotationMove {
  face: CubeFace;
  amount: 1 | 2 | 3;
  width: number;
  isRotation: true;
  slice?: undefined;
}

export interface CubeSliceMove {
  face: 'L' | 'D' | 'F';
  amount: 1 | 2 | 3;
  width: 1;
  isRotation: false;
  slice: CubeSlice;
}

export type CubeMove = CubeLayerMove | CubeRotationMove | CubeSliceMove;
