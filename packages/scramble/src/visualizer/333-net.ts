import type { CubeState } from '../types';
import { renderNxNNet, nxnViewBox } from './nxn-net';

export const render333Net = (state: CubeState): string => renderNxNNet(state);

export const viewBox333 = nxnViewBox(3);
