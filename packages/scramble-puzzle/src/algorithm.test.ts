import { describe, expect, it } from 'vitest';
import { applyAlgorithm, splitAlgorithm } from './algorithm.js';
import { InvalidScrambleError } from './errors.js';
import type { PuzzleDefinition } from './puzzle-definition.js';

interface CounterState {
  readonly value: number;
}

interface CounterMove {
  readonly delta: number;
}

describe('applyAlgorithm', () => {
  it('splits algorithms on all whitespace without producing empty move tokens', () => {
    expect(splitAlgorithm("  R\tU2\nR'  F  ")).toEqual(['R', 'U2', "R'", 'F']);
  });

  it('wraps parse failures while preserving the original cause', () => {
    const parseError = new Error('bad token');
    const definition: Pick<
      PuzzleDefinition<CounterState, CounterMove>,
      'applyMove' | 'parseAlgorithm'
    > = {
      applyMove: (state, move) => ({ value: state.value + move.delta }),
      parseAlgorithm: () => {
        throw parseError;
      },
    };

    expect(() => applyAlgorithm(definition, { value: 0 }, 'bad')).toThrow(InvalidScrambleError);

    try {
      applyAlgorithm(definition, { value: 0 }, 'bad');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidScrambleError);
      expect(error).toHaveProperty(
        'message',
        "@cubekit/scramble-puzzle: scramble 'bad' is invalid: bad token",
      );
      expect(error).toHaveProperty('cause', parseError);
    }
  });

  it('wraps non-Error parser failures with a diagnostic message', () => {
    const definition: Pick<
      PuzzleDefinition<CounterState, CounterMove>,
      'applyMove' | 'parseAlgorithm'
    > = {
      applyMove: (state, move) => ({ value: state.value + move.delta }),
      parseAlgorithm: () => {
        throw 'bad token';
      },
    };

    expect(() => applyAlgorithm(definition, { value: 0 }, 'bad')).toThrow(
      "@cubekit/scramble-puzzle: scramble 'bad' is invalid: bad token",
    );
  });
});
