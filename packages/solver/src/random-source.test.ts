import { describe, expect, it } from 'vitest';

import { validateRandomIndex } from './random-source.js';

describe('validateRandomIndex', () => {
  it('accepts safe indexes inside the requested range', () => {
    expect(validateRandomIndex(0, 3)).toBe(0);
    expect(validateRandomIndex(2, 3)).toBe(2);
  });

  it('rejects invalid max bounds before trusting a random source', () => {
    expect(() => validateRandomIndex(0, 0)).toThrow(
      '@cubegin/solver: random maxExclusive must be a positive safe integer',
    );
    expect(() => validateRandomIndex(0, Number.MAX_SAFE_INTEGER + 1)).toThrow(
      '@cubegin/solver: random maxExclusive must be a positive safe integer',
    );
  });

  it('rejects random values outside the requested range', () => {
    expect(() => validateRandomIndex(-1, 3)).toThrow(
      '@cubegin/solver: random source returned -1 for max 3',
    );
    expect(() => validateRandomIndex(3, 3)).toThrow(
      '@cubegin/solver: random source returned 3 for max 3',
    );
    expect(() => validateRandomIndex(1.5, 3)).toThrow(
      '@cubegin/solver: random source returned 1.5 for max 3',
    );
  });
});
