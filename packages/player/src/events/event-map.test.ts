import { describe, expect, it } from 'vitest';
import { getPlayerPuzzleSupport } from './event-map.js';

describe('getPlayerPuzzleSupport', () => {
  it('maps cube-family events to cube sizes', () => {
    expect(getPlayerPuzzleSupport('222')).toEqual({ type: 'cube', size: 2 });
    expect(getPlayerPuzzleSupport('333')).toEqual({ type: 'cube', size: 3 });
    expect(getPlayerPuzzleSupport('333oh')).toEqual({ type: 'cube', size: 3 });
    expect(getPlayerPuzzleSupport('333fm')).toEqual({ type: 'cube', size: 3 });
    expect(getPlayerPuzzleSupport('333bld')).toEqual({ type: 'cube', size: 3 });
    expect(getPlayerPuzzleSupport('333mbld')).toEqual({ type: 'cube', size: 3 });
    expect(getPlayerPuzzleSupport('444')).toEqual({ type: 'cube', size: 4 });
    expect(getPlayerPuzzleSupport('444bld')).toEqual({ type: 'cube', size: 4 });
    expect(getPlayerPuzzleSupport('555')).toEqual({ type: 'cube', size: 5 });
    expect(getPlayerPuzzleSupport('555bld')).toEqual({ type: 'cube', size: 5 });
    expect(getPlayerPuzzleSupport('666')).toEqual({ type: 'cube', size: 6 });
    expect(getPlayerPuzzleSupport('777')).toEqual({ type: 'cube', size: 7 });
  });

  it('maps non-cube player events to puzzle adapters', () => {
    expect(getPlayerPuzzleSupport('clock')).toEqual({ type: 'clock' });
    expect(getPlayerPuzzleSupport('minx')).toEqual({ type: 'megaminx' });
    expect(getPlayerPuzzleSupport('pyram')).toEqual({ type: 'pyraminx' });
    expect(getPlayerPuzzleSupport('skewb')).toEqual({ type: 'skewb' });
    expect(getPlayerPuzzleSupport('fto')).toEqual({ type: 'fto' });
  });

  it('reports events outside the player release as unsupported', () => {
    expect(getPlayerPuzzleSupport('sq1')).toEqual({ type: 'unsupported' });
  });
});
