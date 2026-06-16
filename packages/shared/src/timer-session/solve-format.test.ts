import { describe, expect, it } from 'vitest';
import {
  getDisplayedElapsedMs,
  getPrimarySolveScramble,
  getReverseSequenceNumber,
  getSolveDisplayText,
  getSolveScrambles,
} from './solve-format';

describe('solve formatting', () => {
  it('applies +2 only to displayed elapsed milliseconds', () => {
    expect(getDisplayedElapsedMs(12345, 'none')).toBe(12345);
    expect(getDisplayedElapsedMs(12345, '+2')).toBe(14345);
    expect(getDisplayedElapsedMs(12345, 'dnf')).toBeNull();
  });

  it('formats solve display text to milliseconds', () => {
    expect(getSolveDisplayText(12345, 'none')).toBe('12.345');
    expect(getSolveDisplayText(12345, '+2')).toBe('14.345+');
    expect(getSolveDisplayText(12345, 'dnf')).toBe('DNF');
  });

  it('calculates reverse sequence numbers for descending rows', () => {
    expect(getReverseSequenceNumber(10, 0)).toBe(10);
    expect(getReverseSequenceNumber(10, 4)).toBe(6);
  });

  it('normalizes single and multi-scramble solve records', () => {
    expect(getSolveScrambles({ scramble: "R U R' U'" })).toEqual(["R U R' U'"]);
    expect(getSolveScrambles({ scramble: ['R U', 'F R'] })).toEqual(['R U', 'F R']);
    expect(getPrimarySolveScramble({ scramble: "R U R' U'" })).toBe("R U R' U'");
    expect(getPrimarySolveScramble({ scramble: ['R U', 'F R'] })).toBe('R U');
  });
});
