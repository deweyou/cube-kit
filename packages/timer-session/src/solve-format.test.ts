import { describe, expect, it } from 'vitest';
import { getDisplayedElapsedMs, getReverseSequenceNumber, getSolveDisplayText } from './solve-format';

describe('solve formatting', () => {
  it('applies +2 only to displayed elapsed milliseconds', () => {
    expect(getDisplayedElapsedMs(12345, 'none')).toBe(12345);
    expect(getDisplayedElapsedMs(12345, '+2')).toBe(14345);
    expect(getDisplayedElapsedMs(12345, 'dnf')).toBeNull();
  });

  it('formats solve display text to milliseconds', () => {
    expect(getSolveDisplayText(12345, 'none')).toBe('12.345');
    expect(getSolveDisplayText(12345, '+2')).toBe('14.345');
    expect(getSolveDisplayText(12345, 'dnf')).toBe('DNF');
  });

  it('calculates reverse sequence numbers for descending rows', () => {
    expect(getReverseSequenceNumber(10, 0)).toBe(10);
    expect(getReverseSequenceNumber(10, 4)).toBe(6);
  });
});
