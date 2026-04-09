import type { CubeState } from '../types';
import { renderNxNNet, nxnViewBox } from './nxn-net';

export const render555Net = (state: CubeState): string => renderNxNNet(state);

export const viewBox555 = nxnViewBox(5);
