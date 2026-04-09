import type { CubeState } from '../types';
import { renderNxNNet, nxnViewBox } from './nxn-net';

export const render222Net = (state: CubeState): string => renderNxNNet(state);

export const viewBox222 = nxnViewBox(2);
