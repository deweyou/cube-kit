import type { CubeState } from '../types';
import { renderNxNNet, nxnViewBox } from './nxn-net';

export const render777Net = (state: CubeState): string => renderNxNNet(state);

export const viewBox777 = nxnViewBox(7);
