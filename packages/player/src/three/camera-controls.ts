const DEFAULT_ORBIT_SENSITIVITY = 0.008;
const MIN_PITCH = -1.2;
const MAX_PITCH = 1.2;

export interface OrbitState {
  readonly distance: number;
  readonly pitch: number;
  readonly yaw: number;
}

export interface PointerDelta {
  readonly deltaX: number;
  readonly deltaY: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const updateOrbitStateFromPointerDelta = (
  state: OrbitState,
  delta: PointerDelta,
): OrbitState => ({
  distance: state.distance,
  pitch: clamp(state.pitch + delta.deltaY * DEFAULT_ORBIT_SENSITIVITY, MIN_PITCH, MAX_PITCH),
  yaw: state.yaw + delta.deltaX * DEFAULT_ORBIT_SENSITIVITY,
});
