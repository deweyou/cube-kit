import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_PREFERENCES,
  formatTimerDisplay,
  getWcaInspectionRemainingMs,
  normalizeAppPreferences,
  resolveWcaInspectionPenalty,
} from './preferences';

describe('app preferences', () => {
  it('provides first-version defaults', () => {
    expect(DEFAULT_APP_PREFERENCES).toEqual({
      theme: 'system',
      language: 'browser',
      wcaInspection: false,
      timerDisplayMode: 'realtime',
    });
  });

  it('normalizes unknown persisted values and falls back per field', () => {
    expect(
      normalizeAppPreferences({
        theme: 'dark',
        language: 'fr',
        wcaInspection: true,
        timerDisplayMode: 'seconds',
      }),
    ).toEqual({
      theme: 'dark',
      language: 'browser',
      wcaInspection: true,
      timerDisplayMode: 'seconds',
    });

    expect(normalizeAppPreferences(null)).toEqual(DEFAULT_APP_PREFERENCES);
  });

  it('formats solve display modes without changing final precision', () => {
    expect(formatTimerDisplay({ mode: 'realtime', phase: 'solve', elapsedMs: 12_345 })).toBe(
      '12.34',
    );
    expect(formatTimerDisplay({ mode: 'seconds', phase: 'solve', elapsedMs: 12_345 })).toBe('12');
    expect(
      formatTimerDisplay({
        mode: 'inspection-only',
        phase: 'solve',
        elapsedMs: 12_345,
        timingText: '计时',
      }),
    ).toBe('计时');
    expect(formatTimerDisplay({ mode: 'seconds', phase: 'final', elapsedMs: 12_345 })).toBe(
      '12.345',
    );
  });

  it('resolves WCA inspection countdown and penalties', () => {
    expect(getWcaInspectionRemainingMs(0)).toBe(15_000);
    expect(getWcaInspectionRemainingMs(14_001)).toBe(999);
    expect(getWcaInspectionRemainingMs(16_000)).toBe(0);
    expect(resolveWcaInspectionPenalty(15_000)).toBe('none');
    expect(resolveWcaInspectionPenalty(15_001)).toBe('+2');
    expect(resolveWcaInspectionPenalty(17_000)).toBe('+2');
    expect(resolveWcaInspectionPenalty(17_001)).toBe('dnf');
  });
});
