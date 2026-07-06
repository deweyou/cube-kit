import { describe, expect, it } from 'vitest';
import type { EventId } from '@cubegin/scramble-puzzle';
import { getPlayerPuzzleAdapter } from './puzzle-registry.js';

const PLAYER_REFERENCE_FORMULAS = [
  { eventId: '222', formula: 'R U F' },
  { eventId: '333', formula: "R U R' U'" },
  { eventId: '444', formula: 'Rw U F2' },
  { eventId: '555', formula: 'Rw U F2' },
  { eventId: '666', formula: 'Rw U F2' },
  { eventId: '777', formula: 'Rw U F2' },
  {
    eventId: 'clock',
    formula: 'UR3+ DR2- DL0+ UL5- U1+ R2+ D3- L4+ ALL5+ y2 U1- R2- D3+ L4- ALL5-',
  },
  { eventId: 'pyram', formula: "U L R B u' l' r' b'" },
  { eventId: 'skewb', formula: "R U L B R' U'" },
  { eventId: 'fto', formula: "U D F B L R BL BR U' BR'" },
  { eventId: 'minx', formula: "R++ D-- R-- D++ R++ D++ R-- D-- R++ D-- U'" },
] as const satisfies readonly { readonly eventId: EventId; readonly formula: string }[];

describe('getPlayerPuzzleAdapter', () => {
  it('returns adapters for cube and non-cube player events', () => {
    expect(getPlayerPuzzleAdapter('333')?.type).toBe('cube');
    expect(getPlayerPuzzleAdapter('clock')?.type).toBe('clock');
    expect(getPlayerPuzzleAdapter('pyram')?.type).toBe('pyraminx');
    expect(getPlayerPuzzleAdapter('sq1')?.type).toBe('square1');
    expect(getPlayerPuzzleAdapter('skewb')?.type).toBe('skewb');
    expect(getPlayerPuzzleAdapter('fto')?.type).toBe('fto');
    expect(getPlayerPuzzleAdapter('minx')?.type).toBe('megaminx');
  });

  it('does not return adapters for unsupported player events', () => {
    expect(getPlayerPuzzleAdapter('333ft' as EventId)).toBeUndefined();
  });

  it('parses and applies non-Square-1 reference formulas through player adapters', () => {
    for (const { eventId, formula } of PLAYER_REFERENCE_FORMULAS) {
      const adapter = getPlayerPuzzleAdapter(eventId);

      if (adapter === undefined) {
        throw new Error(`missing player adapter for ${eventId}`);
      }

      let state = adapter.createInitialState();
      const moves = adapter.parseFormula(formula);

      expect(moves.length).toBeGreaterThan(0);

      for (const move of moves) {
        const animation = adapter.describeMove(move, state);

        expect(animation.affectedPieceIds.length).toBeGreaterThan(0);
        state = adapter.applyMove(state, move);
      }

      expect(adapter.createRenderableModel(state).pieces.length).toBeGreaterThan(0);
    }
  });
});
