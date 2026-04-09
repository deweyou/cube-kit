import type { WcaEvent, ImageOptions } from '../types';
import { applyScramble } from './apply-moves';
import { svgWrap } from './svg';
import { renderNxNNet, nxnViewBox } from './nxn-net';
import { renderSkewbNet, skewbSolvedState, viewBoxSkewb } from './skewb-net';
import { renderPyramNet, pyramSolvedState, viewBoxPyram } from './pyram-net';
import { renderSq1Net, viewBoxSq1 } from './sq1-net';
import { renderClockNet, viewBoxClock } from './clock-net';
import { renderMinxNet, viewBoxMinx } from './minx-net';

const puzzleSize = (event: WcaEvent): number => {
  switch (event) {
    case '222':
      return 2;
    case '333':
    case '333bf':
    case '333fm':
    case '333oh':
      return 3;
    case '444':
    case '444bf':
      return 4;
    case '555':
    case '555bf':
      return 5;
    case '666':
      return 6;
    case '777':
      return 7;
    default:
      return 0;
  }
};

export const generateImage = (
  event: WcaEvent,
  scramble: string,
  options?: ImageOptions,
): string => {
  if (options?.mode === '3d') throw new Error('3D mode is not yet implemented');

  const n = puzzleSize(event);
  let content: string;
  let viewBox: string;

  if (n >= 2) {
    // NxN cube
    const state = applyScramble(scramble, event);
    content = renderNxNNet(state);
    viewBox = nxnViewBox(n);
  } else if (event === 'skewb') {
    const state = skewbSolvedState();
    content = renderSkewbNet(state);
    viewBox = viewBoxSkewb;
  } else if (event === 'pyram') {
    const state = pyramSolvedState();
    content = renderPyramNet(state);
    viewBox = viewBoxPyram;
  } else if (event === 'sq1') {
    content = renderSq1Net(scramble);
    viewBox = viewBoxSq1;
  } else if (event === 'clock') {
    content = renderClockNet(scramble);
    viewBox = viewBoxClock;
  } else if (event === 'minx') {
    content = renderMinxNet();
    viewBox = viewBoxMinx;
  } else {
    // Fallback: treat as 3x3
    const state = applyScramble(scramble, event);
    content = renderNxNNet(state);
    viewBox = nxnViewBox(3);
  }

  return svgWrap(content, viewBox, options?.width, options?.height);
};
