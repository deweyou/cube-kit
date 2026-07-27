import { describe, expect, it } from 'vitest';
import { selectScrambleCase } from './case-selection.js';
import type { RandomSource } from './random-source.js';

const cases = [
  { id: 'case-a', naturalWeight: 1 },
  { id: 'case-b', naturalWeight: 3 },
] as const;

const randomAt = (index: number): RandomSource => ({
  nextInt(maxExclusive) {
    expect(index).toBeLessThan(maxExclusive);
    return index;
  },
});

describe('selectScrambleCase', () => {
  it('uses a uniform distribution by default', () => {
    expect(selectScrambleCase(cases, {}, randomAt(1))).toEqual(cases[1]);
  });

  it('uses natural weights when requested', () => {
    expect(selectScrambleCase(cases, { mode: 'natural' }, randomAt(0))).toEqual(cases[0]);
    expect(selectScrambleCase(cases, { mode: 'natural' }, randomAt(3))).toEqual(cases[1]);
  });

  it('restricts selection to enabled stable ids', () => {
    expect(selectScrambleCase(cases, { enabledCaseIds: ['case-b'] }, randomAt(0))).toEqual(
      cases[1],
    );
  });

  it('rejects an empty filter', () => {
    expect(() => selectScrambleCase(cases, { enabledCaseIds: [] }, randomAt(0))).toThrow(
      '@cubegin/scramble-core: enabledCaseIds must contain at least one case id',
    );
  });

  it('rejects unknown and duplicate ids', () => {
    expect(() => selectScrambleCase(cases, { enabledCaseIds: ['case-c'] }, randomAt(0))).toThrow(
      "@cubegin/scramble-core: unknown case id 'case-c'",
    );
    expect(() =>
      selectScrambleCase(cases, { enabledCaseIds: ['case-a', 'case-a'] }, randomAt(0)),
    ).toThrow("@cubegin/scramble-core: duplicate enabled case id 'case-a'");
  });

  it('rejects invalid natural weights', () => {
    expect(() =>
      selectScrambleCase([{ id: 'invalid', naturalWeight: 0 }], { mode: 'natural' }, randomAt(0)),
    ).toThrow("@cubegin/scramble-core: case 'invalid' has an invalid natural weight");
  });
});
