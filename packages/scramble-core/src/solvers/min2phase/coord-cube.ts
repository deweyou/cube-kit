let isInitialized = false;

export const initCoordCube = (): void => {
  isInitialized = true;
};

export const isCoordCubeInitialized = (): boolean => isInitialized;
