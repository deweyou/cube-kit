import { describe, expect, it } from 'vitest';
import { createPuzzleRegistry } from './registry.js';

describe('createPuzzleRegistry', () => {
  it('throws a typed error for unknown events', () => {
    const registry = createPuzzleRegistry([]);
    expect(() => registry.getByEventId('333')).toThrow(
      "@cubekit/scramble-puzzle: event '333' is not registered",
    );
  });
});
