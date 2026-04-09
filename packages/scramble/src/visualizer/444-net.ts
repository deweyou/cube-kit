import type { CubeState } from '../types';
import { renderNxNNet, nxnViewBox } from './nxn-net';

export const render444Net = (state: CubeState): string => renderNxNNet(state);

export const viewBox444 = nxnViewBox(4);
