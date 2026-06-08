import { describe, it, expect } from 'vitest';
import { formatElapsed } from './format';

describe('formatElapsed', () => {
  it('0ms with decimals=3 → "0.000"', () => {
    expect(formatElapsed(0, 3)).toBe('0.000');
  });

  it('1500ms with decimals=3 → "1.500"', () => {
    expect(formatElapsed(1500, 3)).toBe('1.500');
  });

  it('12347ms with decimals=3 → "12.347"', () => {
    expect(formatElapsed(12347, 3)).toBe('12.347');
  });

  it('12347ms with decimals=2 → "12.34" (truncate, not round)', () => {
    expect(formatElapsed(12347, 2)).toBe('12.34');
  });

  it('12347ms with decimals=1 → "12.3"', () => {
    expect(formatElapsed(12347, 1)).toBe('12.3');
  });

  it('12347ms with decimals=0 → "12"', () => {
    expect(formatElapsed(12347, 0)).toBe('12');
  });

  it('3600000ms with decimals=3 → "3600.000"', () => {
    expect(formatElapsed(3600000, 3)).toBe('3600.000');
  });

  it('999ms with decimals=3 → "0.999"', () => {
    expect(formatElapsed(999, 3)).toBe('0.999');
  });

  it('defaults to decimals=3', () => {
    expect(formatElapsed(5123)).toBe('5.123');
  });
});
