import { formatElapsedClock } from '../timer';
import type { SolvePenalty } from '../timer-session';

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'browser' | 'zh-CN' | 'en';
export type TimerDisplayMode = 'realtime' | 'seconds' | 'inspection-only';
export type TimerDisplayPhase = 'inspection' | 'solve' | 'final';

export interface AppPreferences {
  theme: ThemePreference;
  language: LanguagePreference;
  wcaInspection: boolean;
  solverAssistEnabled: boolean;
  timerDisplayMode: TimerDisplayMode;
}

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export const LANGUAGE_PREFERENCES = ['browser', 'zh-CN', 'en'] as const;
export const TIMER_DISPLAY_MODES = ['realtime', 'seconds', 'inspection-only'] as const;

export const WCA_INSPECTION_DURATION_MS = 15_000;
export const WCA_INSPECTION_DNF_MS = 17_000;

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  theme: 'system',
  language: 'browser',
  wcaInspection: false,
  solverAssistEnabled: false,
  timerDisplayMode: 'realtime',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const includesValue = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && values.includes(value as T);

export const normalizeAppPreferences = (value: unknown): AppPreferences => {
  if (!isRecord(value)) return DEFAULT_APP_PREFERENCES;

  return {
    theme: includesValue(THEME_PREFERENCES, value.theme)
      ? value.theme
      : DEFAULT_APP_PREFERENCES.theme,
    language: includesValue(LANGUAGE_PREFERENCES, value.language)
      ? value.language
      : DEFAULT_APP_PREFERENCES.language,
    wcaInspection:
      typeof value.wcaInspection === 'boolean'
        ? value.wcaInspection
        : DEFAULT_APP_PREFERENCES.wcaInspection,
    solverAssistEnabled:
      typeof value.solverAssistEnabled === 'boolean'
        ? value.solverAssistEnabled
        : DEFAULT_APP_PREFERENCES.solverAssistEnabled,
    timerDisplayMode: includesValue(TIMER_DISPLAY_MODES, value.timerDisplayMode)
      ? value.timerDisplayMode
      : DEFAULT_APP_PREFERENCES.timerDisplayMode,
  };
};

export const getWcaInspectionRemainingMs = (inspectionElapsedMs: number): number =>
  Math.max(0, WCA_INSPECTION_DURATION_MS - inspectionElapsedMs);

export const resolveWcaInspectionPenalty = (inspectionElapsedMs: number): SolvePenalty => {
  if (inspectionElapsedMs > WCA_INSPECTION_DNF_MS) return 'dnf';
  if (inspectionElapsedMs > WCA_INSPECTION_DURATION_MS) return '+2';
  return 'none';
};

export const formatTimerDisplay = ({
  elapsedMs,
  mode,
  phase,
  timingText = 'timing',
}: {
  elapsedMs: number;
  mode: TimerDisplayMode;
  phase: TimerDisplayPhase;
  timingText?: string;
}): string => {
  if (phase === 'inspection') {
    return formatElapsedClock(getWcaInspectionRemainingMs(elapsedMs), 0);
  }

  if (phase === 'final') {
    return formatElapsedClock(elapsedMs, 3);
  }

  if (mode === 'inspection-only') return timingText;
  if (mode === 'seconds') return formatElapsedClock(elapsedMs, 0);
  return formatElapsedClock(elapsedMs, 2);
};
