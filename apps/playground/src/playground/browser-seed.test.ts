import { describe, expect, it } from 'vitest';
import { parseSeedFromSearch } from './browser-seed';

describe('parseSeedFromSearch', () => {
  it('parses a safe integer seed from URL search params', () => {
    expect(parseSeedFromSearch('?seed=123')).toBe(123);
  });

  it('ignores missing or invalid seeds', () => {
    expect(parseSeedFromSearch('')).toBeUndefined();
    expect(parseSeedFromSearch('?seed=abc')).toBeUndefined();
  });
});
