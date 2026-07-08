# Web Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first real web `/settings` page for theme, language, WCA inspection, and timer display preferences.

**Architecture:** `packages/shared` owns platform-agnostic preference types, defaults, normalization, WCA inspection rules, and timer display formatting. `apps/web` owns storage, React context, theme application, browser language resolution, localized copy, settings UI, and timer consumption.

**Tech Stack:** TypeScript, React 19, React Router, Vitest, Testing Library, vite-plus, `@deweyou-design/react`, CSS Modules, `@cubegin/shared`.

---

## File Structure

- Create `packages/shared/src/preferences/preferences.ts` for app preference types, defaults, normalization, timer-display formatting, and WCA inspection helpers.
- Create `packages/shared/src/preferences/preferences.test.ts` for defaults, invalid input recovery, display modes, and inspection penalty thresholds.
- Create `packages/shared/src/preferences/index.ts` as the package subpath barrel.
- Modify `packages/shared/vite.config.ts` and `packages/shared/package.json` to export `@cubegin/shared/preferences`.
- Create `apps/web/src/preferences/app-copy.ts` for Chinese/English copy and browser-language resolution.
- Create `apps/web/src/preferences/app-preferences.tsx` for localStorage persistence, React context, resolved theme, and document theme application.
- Create `apps/web/src/preferences/app-preferences.test.tsx` for storage, bad JSON recovery, language resolution, and theme behavior.
- Modify `apps/web/src/app.tsx` to wrap the app with `AppPreferencesProvider`.
- Modify `apps/web/src/timer/timer-navigation.tsx` to read localized nav labels.
- Create `apps/web/src/settings/settings-page.tsx`, `settings-page.module.css`, and `settings-page.test.tsx` for the compact grouped settings surface.
- Modify `apps/web/src/app-router.tsx` and `apps/web/src/app-router.test.tsx` to route `/settings` to `SettingsPage`.
- Modify `apps/web/src/timer/timer-page.tsx` and `timer-page.test.tsx` to consume preferences, translate app copy, remove forced light theme, support WCA inspection, and apply timer display modes.
- Modify `docs/project-structure.md` and `docs/timer-workflow.md` after implementation to document the new settings/preferences boundary.

## Task 1: Shared Preference Semantics

**Files:**

- Create: `packages/shared/src/preferences/preferences.ts`
- Create: `packages/shared/src/preferences/preferences.test.ts`
- Create: `packages/shared/src/preferences/index.ts`
- Modify: `packages/shared/vite.config.ts`
- Modify: `packages/shared/package.json`

- [ ] **Step 1: Write failing shared preference tests**

```ts
// packages/shared/src/preferences/preferences.test.ts
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
```

- [ ] **Step 2: Run shared tests and confirm RED**

Run: `corepack pnpm --filter @cubegin/shared test src/preferences/preferences.test.ts`

Expected: FAIL because `src/preferences/preferences.test.ts` imports a missing module.

- [ ] **Step 3: Implement shared preferences**

```ts
// packages/shared/src/preferences/preferences.ts
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
```

Also add:

```ts
// packages/shared/src/preferences/index.ts
export * from './preferences';
```

Update `packages/shared/vite.config.ts`:

```ts
entry: {
  'events/index': 'src/events/index.ts',
  'preferences/index': 'src/preferences/index.ts',
  'timer/index': 'src/timer/index.ts',
  'timer-session/index': 'src/timer-session/index.ts',
},
```

Update `packages/shared/package.json` exports:

```json
"./preferences": "./dist/preferences/index.mjs"
```

- [ ] **Step 4: Run shared tests and confirm GREEN**

Run: `corepack pnpm --filter @cubegin/shared test src/preferences/preferences.test.ts`

Expected: PASS.

## Task 2: Web Preferences Provider, Theme, and Copy

**Files:**

- Create: `apps/web/src/preferences/app-copy.ts`
- Create: `apps/web/src/preferences/app-preferences.tsx`
- Create: `apps/web/src/preferences/app-preferences.test.tsx`
- Modify: `apps/web/src/app.tsx`

- [ ] **Step 1: Write failing provider tests**

```tsx
// apps/web/src/preferences/app-preferences.test.tsx
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppPreferencesProvider, useAppPreferences } from './app-preferences';
import { getAppCopy, resolveAppLanguage } from './app-copy';

const Harness = () => {
  const { copy, preferences, setPreferences } = useAppPreferences();

  return (
    <button
      type="button"
      onClick={() => setPreferences({ ...preferences, theme: 'dark', language: 'en' })}
    >
      {copy.settings.title}
    </button>
  );
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.unstubAllGlobals();
});

describe('app preferences provider', () => {
  it('recovers malformed storage to defaults and writes normalized preferences', () => {
    localStorage.setItem('cubegin-app-preferences', '{bad json');

    render(
      <AppPreferencesProvider>
        <Harness />
      </AppPreferencesProvider>,
    );

    expect(screen.getByRole('button', { name: '设置' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('cubegin-app-preferences')!)).toEqual({
      theme: 'system',
      language: 'browser',
      wcaInspection: false,
      timerDisplayMode: 'realtime',
    });
  });

  it('persists updates and applies document theme', () => {
    render(
      <AppPreferencesProvider>
        <Harness />
      </AppPreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '设置' }));

    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(JSON.parse(localStorage.getItem('cubegin-app-preferences')!).theme).toBe('dark');
  });

  it('resolves browser language and system theme fallbacks', () => {
    expect(resolveAppLanguage('browser', ['en-US'])).toBe('en');
    expect(resolveAppLanguage('browser', ['zh-CN'])).toBe('zh-CN');
    expect(getAppCopy('en').settings.title).toBe('Settings');

    render(
      <AppPreferencesProvider>
        <Harness />
      </AppPreferencesProvider>,
    );

    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
```

- [ ] **Step 2: Run provider tests and confirm RED**

Run: `corepack pnpm --filter web test src/preferences/app-preferences.test.tsx`

Expected: FAIL because the provider and copy modules do not exist.

- [ ] **Step 3: Implement copy and provider**

Implement `app-copy.ts` with `ResolvedAppLanguage = 'zh-CN' | 'en'`, `resolveAppLanguage`, `APP_COPY`, and `getAppCopy`. Include keys for navigation, timer labels, list modal, result actions, settings labels/help, placeholders, and summary aria labels.

Implement `app-preferences.tsx` with:

```tsx
export const APP_PREFERENCES_STORAGE_KEY = 'cubegin-app-preferences';
export const AppPreferencesProvider = ({ children }: { children: ReactNode }) => {
  /* read, normalize, persist, apply theme */
};
export const useAppPreferences = () => {
  /* context hook */
};
```

The provider must:

- Read `localStorage`, parse JSON safely, and normalize through `normalizeAppPreferences`.
- Persist normalized preferences on every change.
- Resolve language with `navigator.languages` or `navigator.language`.
- Resolve `theme: 'system'` with `window.matchMedia('(prefers-color-scheme: dark)')`, defaulting to light when unavailable.
- Apply `document.documentElement.dataset.theme = 'light' | 'dark'`.
- Expose `{ copy, language, preferences, resolvedTheme, setPreferences }`.

Update `apps/web/src/app.tsx`:

```tsx
const App = () => (
  <AppPreferencesProvider>
    <AppShell>
      <AppRouter />
    </AppShell>
  </AppPreferencesProvider>
);
```

- [ ] **Step 4: Run provider tests and confirm GREEN**

Run: `corepack pnpm --filter web test src/preferences/app-preferences.test.tsx`

Expected: PASS.

## Task 3: Settings Route and Compact Grouped Page

**Files:**

- Create: `apps/web/src/settings/settings-page.tsx`
- Create: `apps/web/src/settings/settings-page.module.css`
- Create: `apps/web/src/settings/settings-page.test.tsx`
- Modify: `apps/web/src/app-router.tsx`
- Modify: `apps/web/src/app-router.test.tsx`

- [ ] **Step 1: Write failing settings page and route tests**

Test expectations:

- `/settings` lazy-loads `SettingsPage`, not `AppPlaceholderPage`.
- Page has heading `设置` by default and `Settings` after choosing English.
- The compact grouped page has `General`/`Timer` groups in English and `常规`/`计时器` in Chinese.
- Theme options are `跟随系统 / 浅色 / 深色`.
- Language options are `跟随浏览器 / 简体中文 / English`.
- Timer display options are `实时 / 到秒 / 仅观察`.
- WCA inspection switch starts unchecked.
- Changing controls writes `cubegin-app-preferences`.
- There is no save button.

- [ ] **Step 2: Run settings tests and confirm RED**

Run: `corepack pnpm --filter web test src/settings/settings-page.test.tsx src/app-router.test.tsx`

Expected: FAIL because the settings page does not exist and `/settings` still renders the placeholder.

- [ ] **Step 3: Implement route and settings page**

Use `RadioGroup` for segmented controls and `Switch` for WCA inspection. Use local CSS Modules for compact grouped layout with token colors, visible labels, 44px mobile targets, no nested cards, no hero treatment, and bottom padding that accounts for mobile navigation.

Route change:

```tsx
const SettingsPage = lazy(() =>
  import('./settings/settings-page').then(({ SettingsPage }) => ({ default: SettingsPage })),
);

<Route path={APP_ROUTE_PATHS.settings} element={<SettingsPage />} />;
```

Settings page structure:

```tsx
export const SettingsPage = () => {
  const { copy, preferences, setPreferences } = useAppPreferences();

  return (
    <section className={styles.root} aria-labelledby="settings-page-title">
      <TimerTopNavigation isHidden={false} />
      <main className={styles.content}>
        <h1 id="settings-page-title">{copy.settings.title}</h1>
        <section className={styles.group} aria-labelledby="settings-general-title">
          ...
        </section>
        <section className={styles.group} aria-labelledby="settings-timer-title">
          ...
        </section>
      </main>
    </section>
  );
};
```

- [ ] **Step 4: Run settings tests and confirm GREEN**

Run: `corepack pnpm --filter web test src/settings/settings-page.test.tsx src/app-router.test.tsx`

Expected: PASS.

## Task 4: Localize Navigation, Placeholder Copy, and Timer Static Copy

**Files:**

- Modify: `apps/web/src/timer/timer-navigation.tsx`
- Modify: `apps/web/src/app-placeholder-page.tsx`
- Modify: `apps/web/src/app-router.test.tsx`
- Modify: `apps/web/src/timer/timer-page.tsx`
- Modify: `apps/web/src/timer/timer-page.test.tsx`

- [ ] **Step 1: Write failing localization tests**

Add tests that:

- Navigation labels switch from `计时器 / 成绩列表 / 公式库 / 设置` to `Timer / Results / Formulas / Settings`.
- Placeholder pages use localized titles for results/formulas.
- Timer page static copy switches to English while list names remain user-authored and event short labels remain unchanged.

- [ ] **Step 2: Run localization tests and confirm RED**

Run: `corepack pnpm --filter web test src/app-router.test.tsx src/timer/timer-page.test.tsx`

Expected: FAIL because visible copy is still hard-coded Chinese.

- [ ] **Step 3: Replace hard-coded app copy with `copy` values**

Keep event short labels from `getEventShortLabel`. Keep user-created list names exactly as entered. Replace only app-owned labels, aria labels, button labels, placeholders, and help text.

- [ ] **Step 4: Run localization tests and confirm GREEN**

Run: `corepack pnpm --filter web test src/app-router.test.tsx src/timer/timer-page.test.tsx`

Expected: PASS.

## Task 5: Timer Preferences, WCA Inspection, and Display Modes

**Files:**

- Modify: `apps/web/src/timer/timer-page.tsx`
- Modify: `apps/web/src/timer/timer-page.test.tsx`

- [ ] **Step 1: Write failing timer preference tests**

Add tests that:

- With `wcaInspection: false`, Space/Enter still start solves with current behavior.
- With `wcaInspection: true`, Enter from idle enters inspection and a second Enter starts timing.
- With `wcaInspection: true`, Escape during inspection cancels back to idle.
- Stopping after inspection elapsed `15_001ms` records `+2` and statistics show the penalty-adjusted result.
- Stopping after inspection elapsed `17_001ms` records `DNF` and valid count excludes that solve.
- `timerDisplayMode: 'seconds'` shows whole seconds only while timing but final result keeps milliseconds.
- `timerDisplayMode: 'inspection-only'` shows localized `计时`/`timing` while solving but still shows inspection countdown.

- [ ] **Step 2: Run timer preference tests and confirm RED**

Run: `corepack pnpm --filter web test src/timer/timer-page.test.tsx`

Expected: FAIL because inspection and display preferences are not wired.

- [ ] **Step 3: Implement timer preference behavior**

Extend the page state with an `inspection` state and store `inspectionStartedAt`, `inspectionElapsed`, and `pendingInspectionPenalty`.

Use shared helpers:

```ts
const inspectionPenalty = resolveWcaInspectionPenalty(performance.now() - inspectionStartedAt);
const displayElapsedText = formatTimerDisplay({
  elapsedMs: displayElapsed,
  mode: preferences.timerDisplayMode,
  phase: timerState === 'inspection' ? 'inspection' : timerState === 'stopped' ? 'final' : 'solve',
  timingText: copy.timer.timingDisplayText,
});
```

When WCA inspection is enabled:

- `Space` or `Enter` from idle calls `startInspection`.
- `Space` or `Enter` during inspection calls `startTimerFromInspection`.
- `Escape` during inspection cancels.
- `stopTimer` writes `pendingInspectionPenalty` into the new solve record.

When WCA inspection is disabled:

- Keep existing Space armed behavior and Enter direct-start behavior.

For recent solves, switch from `formatMilliseconds(solveRecord.elapsedMs)` to `getSolveDisplayText(solveRecord.elapsedMs, solveRecord.penalty)`.

- [ ] **Step 4: Run timer preference tests and confirm GREEN**

Run: `corepack pnpm --filter web test src/timer/timer-page.test.tsx`

Expected: PASS.

## Task 6: Documentation and Full Verification

**Files:**

- Modify: `docs/project-structure.md`
- Modify: `docs/timer-workflow.md`

- [ ] **Step 1: Update docs after behavior is implemented**

Document:

- `@cubegin/shared/preferences` as the platform-agnostic preference boundary.
- `apps/web/src/preferences/app-preferences.tsx` as the browser storage/theme/i18n owner.
- `/settings` no longer points to a placeholder.
- WCA inspection adds an inspection state before timing when enabled.

- [ ] **Step 2: Run targeted verification**

Run:

```bash
corepack pnpm --filter @cubegin/shared test
corepack pnpm --filter web typecheck
corepack pnpm --filter web test
corepack pnpm --filter web build
```

Expected: all commands exit 0. Existing Vite deprecation warnings are acceptable only if there are no test/build failures.

- [ ] **Step 3: Rendered verification**

Start web:

```bash
corepack pnpm --filter web dev -- --host 127.0.0.1
```

Verify in browser:

- Desktop `/settings`: compact grouped layout, no placeholder, no horizontal overflow.
- Mobile `/settings`: bottom navigation does not cover the final setting row.
- Theme: system/light/dark change document theme.
- Language: browser/Chinese/English change visible app copy.
- Timer: WCA inspection starts/cancels/applies `+2` and `DNF`; display modes affect only in-progress display.

## Self-Review

- Spec coverage: The plan covers settings UI, persistence, shared semantics, web-only storage/theme/i18n, full app copy, WCA inspection behavior, timer display modes, and rendered verification.
- Placeholder scan: No `TBD`, `TODO`, or `implement later` placeholders remain.
- Type consistency: Preference type names match across shared package, provider, settings page, and timer consumption.
