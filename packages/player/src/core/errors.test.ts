import { describe, expect, it } from 'vitest';
import { InvalidPlayerFormulaError, UnsupportedPlayerPuzzleError } from './errors.js';

describe('player errors', () => {
  it('describes unsupported first-release puzzle events', () => {
    const error = new UnsupportedPlayerPuzzleError('clock');

    expect(error).toMatchObject({
      name: 'UnsupportedPlayerPuzzleError',
      code: 'unsupported-puzzle',
      eventId: 'clock',
    });
    expect(error.message).toContain("@cubegin/player: event 'clock' is not supported");
  });

  it('wraps invalid formula parse failures with the original cause', () => {
    const cause = new Error('bad move');
    const error = new InvalidPlayerFormulaError('R4', cause);

    expect(error).toMatchObject({
      name: 'InvalidPlayerFormulaError',
      code: 'invalid-formula',
      formula: 'R4',
    });
    expect(error.message).toContain("@cubegin/player: formula 'R4' is invalid: bad move");
    expect(error.cause).toBe(cause);
  });
});
