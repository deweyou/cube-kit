import { initialize } from './engine.js';

let isInitialized = false;

export const initCoordCube = (): void => {
  if (isInitialized) return;

  initialize();
  isInitialized = true;
};

export const isCoordCubeInitialized = (): boolean => isInitialized;
