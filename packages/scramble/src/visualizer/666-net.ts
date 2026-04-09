import type { CubeState } from '../types';
import { renderNxNNet, nxnViewBox } from './nxn-net';

export const render666Net = (state: CubeState): string => renderNxNNet(state);

export const viewBox666 = nxnViewBox(6);
