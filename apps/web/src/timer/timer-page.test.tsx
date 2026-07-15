import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EVENT_IDS } from '@cubegin/shared/events';
import { DEFAULT_APP_PREFERENCES } from '@cubegin/shared/preferences';
import { getEventShortLabel } from '@cubegin/shared/timer-session';
import {
  Children,
  isValidElement,
  type CSSProperties,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppPreferencesProvider } from '../preferences/app-preferences';
import { createMemoryTimerSessionDb } from '../timer-session/timer-session-db';
import { TimerSessionStoreProvider } from '../timer-session/timer-session-store';
import { TimerPage } from './timer-page';

const scrambleImageMock = vi.hoisted(() => ({
  renderScrambleImage: vi.fn(
    (_eventId: string, scramble: string) =>
      `<svg data-rendered-scramble="true"><text>${scramble}</text></svg>`,
  ),
}));

const scrambleGeneratorMock = vi.hoisted(() => ({
  dispose: vi.fn(),
  generate: vi.fn(),
  preload: vi.fn(),
}));

const timerMock = vi.hoisted(() => ({
  elapsed: 0,
  reset: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(() => 1234),
}));

vi.mock('./hooks/use-timer', () => ({
  useTimer: () => ({
    elapsed: timerMock.elapsed,
    reset: timerMock.reset,
    start: timerMock.start,
    stop: timerMock.stop,
  }),
}));

vi.mock('@cubegin/scramble-image', () => ({
  renderScrambleImage: scrambleImageMock.renderScrambleImage,
}));

vi.mock('./scramble-worker-client', () => ({
  createTimerScrambleGenerator: vi.fn(() => scrambleGeneratorMock),
}));

const getAccessibleLabel = (label: ReactNode) => {
  if (typeof label === 'string') return label;
  if (label && typeof label === 'object' && 'props' in label) {
    const element = label as ReactElement<{ children?: ReactNode }>;
    return typeof element.props.children === 'string' ? element.props.children : undefined;
  }
  return undefined;
};

vi.mock('@deweyou-design/react/select', () => {
  const Trigger = () => null;
  const Content = ({ children }: { children: ReactNode }) => <>{children}</>;
  const Item = ({
    className,
    style,
    value,
    label,
  }: {
    className?: string;
    style?: CSSProperties;
    value: string;
    label: string;
  }) => (
    <option className={className} style={style} value={value}>
      {label}
    </option>
  );

  const Select = {
    Root: ({
      'aria-hidden': ariaHidden,
      children,
      className,
      'data-hidden': dataHidden,
      label,
      style,
      value,
      onValueChange,
    }: {
      'aria-hidden'?: 'true';
      children: ReactNode;
      className?: string;
      'data-hidden'?: 'true';
      label?: ReactNode;
      style?: CSSProperties;
      value?: string[];
      onValueChange?: (value: string[]) => void;
    }) => {
      const selectItems: ReactNode[] = [];
      const contentChrome: ReactNode[] = [];

      Children.forEach(children, (child) => {
        if (!isValidElement(child) || child.type !== Content) return;

        const contentElement = child as ReactElement<{ children?: ReactNode }>;
        Children.forEach(contentElement.props.children, (contentChild) => {
          if (isValidElement(contentChild) && contentChild.type === Item) {
            selectItems.push(contentChild);
            return;
          }

          contentChrome.push(contentChild);
        });
      });

      return (
        <div
          className={className}
          aria-hidden={ariaHidden}
          data-component-select-root="true"
          data-hidden={dataHidden}
          style={style}
        >
          <label>
            {label}
            <select
              aria-label={getAccessibleLabel(label)}
              data-component-select="true"
              value={value?.[0] ?? ''}
              onChange={(event) => onValueChange?.([event.target.value])}
            >
              {selectItems}
            </select>
          </label>
          {contentChrome}
        </div>
      );
    },
    Trigger,
    Content,
    Item,
  };
  return { Select };
});

const setNavigatorLanguages = (languages: string[]) => {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: languages[0] ?? '',
  });
};

const setStoredPreferences = (preferences: Partial<typeof DEFAULT_APP_PREFERENCES>) => {
  localStorage.setItem(
    'cubegin-app-preferences',
    JSON.stringify({ ...DEFAULT_APP_PREFERENCES, ...preferences }),
  );
};

const renderTimerPage = (props: ComponentProps<typeof TimerPage> = {}) =>
  render(
    <AppPreferencesProvider>
      <TimerSessionStoreProvider db={createMemoryTimerSessionDb()}>
        <MemoryRouter>
          <TimerPage {...props} />
        </MemoryRouter>
      </TimerSessionStoreProvider>
    </AppPreferencesProvider>,
  );

const finishOneSolve = async () => {
  fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
  fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

  await waitFor(() => expect(screen.getByRole('toolbar', { name: '成绩操作' })).toBeTruthy());
};

beforeEach(() => {
  localStorage.clear();
  setNavigatorLanguages(['zh-CN']);
  timerMock.elapsed = 0;
  timerMock.reset.mockClear();
  timerMock.start.mockClear();
  timerMock.stop.mockReset();
  timerMock.stop.mockReturnValue(1234);
  scrambleImageMock.renderScrambleImage.mockClear();
  scrambleGeneratorMock.dispose.mockClear();
  scrambleGeneratorMock.generate.mockReset();
  scrambleGeneratorMock.generate.mockImplementation((eventId: string) =>
    Promise.resolve({ eventId, scramble: `${eventId} generated scramble` }),
  );
  scrambleGeneratorMock.preload.mockReset();
  scrambleGeneratorMock.preload.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('TimerPage', () => {
  it('uses the resolved app theme instead of forcing the timer page to light', () => {
    localStorage.setItem(
      'cubegin-app-preferences',
      JSON.stringify({ ...DEFAULT_APP_PREFERENCES, theme: 'dark' }),
    );

    renderTimerPage();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('keeps the first redesign page minimal without a V2 label', () => {
    renderTimerPage();

    const logo = screen.getByRole('img', { name: 'Cubegin' });

    expect(logo.getAttribute('data-trigger')).toBe('manual');
    expect(screen.queryByText('V2')).toBeNull();
  });

  it('matches the previous hero behavior by animating the mark on hover', () => {
    renderTimerPage();

    const logo = screen.getByRole('img', { name: 'Cubegin' });
    const brand = logo.closest('strong');

    expect(brand).not.toBeNull();
    expect(logo.getAttribute('data-playing')).toBe('false');

    fireEvent.mouseEnter(brand!);

    expect(screen.getByRole('img', { name: 'Cubegin' }).getAttribute('data-playing')).toBe('true');

    fireEvent.mouseLeave(brand!);

    expect(screen.getByRole('img', { name: 'Cubegin' }).getAttribute('data-playing')).toBe('false');
  });

  it('shows a responsive icon-only primary navigation', () => {
    renderTimerPage();

    const navigation = screen.getByRole('navigation', { name: '主导航' });
    const navigationButtons = within(navigation).getAllByRole('button');

    expect(navigation.closest('header')).toBeNull();
    expect(navigationButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      '计时器',
      '成绩列表',
      '公式库',
      '设置',
    ]);
    expect(navigationButtons).toHaveLength(4);
    expect(navigationButtons[0]?.getAttribute('aria-current')).toBe('page');
    expect(navigationButtons[0]?.getAttribute('data-active')).toBe('true');
    expect(navigationButtons.slice(1).every((button) => !button.hasAttribute('aria-current'))).toBe(
      true,
    );
    expect(navigationButtons.slice(1).every((button) => !button.hasAttribute('data-active'))).toBe(
      true,
    );
    expect(navigationButtons.every((button) => button.textContent === '')).toBe(true);
    expect(navigationButtons.every((button) => button.querySelector('svg') !== null)).toBe(true);
    expect(timerCss).toMatch(/\.hero\s*\{[^}]*gap: 14px;/su);
    expect(timerCss).toMatch(/\.brandRow\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/su);
    expect(timerCss).toMatch(/\.brandRow\s*\{[^}]*min-height: 50px;/su);
    expect(timerCss).toMatch(/\.root\s*\{[^}]*position: relative;/su);
    expect(timerCss).toMatch(/\.primaryNav\s*\{[^}]*border-radius: 999px;/su);
    expect(timerCss).toMatch(
      /\.primaryNav\s*\{[^}]*backdrop-filter: blur\(22px\) saturate\(1\.55\);/su,
    );
    expect(timerCss).toMatch(
      /\.primaryNav\s*\{[^}]*background: color-mix\(in srgb, var\(--ui-color-surface-raised\) 52%, transparent\);/su,
    );
    expect(timerCss).toMatch(/\.primaryNav\s*\{[^}]*0 8px 18px color-mix/su);
    expect(timerCss).not.toMatch(/\.primaryNav\s*\{[^}]*var\(--ui-color-brand-text\)/su);
    expect(timerCss).toMatch(/\.primaryNav\s*\{[^}]*isolation: isolate;/su);
    expect(timerCss).toMatch(/\.primaryNav\s*\{[^}]*overflow: hidden;/su);
    expect(timerCss).toMatch(/\.primaryNav\s*\{[^}]*justify-self: center;/su);
    expect(timerCss).toMatch(
      /\.primaryNav\s*\{[^}]*inset-block-start: calc\(18px \+ env\(safe-area-inset-top\)\);/su,
    );
    expect(timerCss).toMatch(/\.primaryNav\s*\{[^}]*inset-inline-start: 50%;/su);
    expect(timerCss).toMatch(/\.primaryNav\s*\{[^}]*position: absolute;/su);
    expect(timerCss).toMatch(/\.primaryNav\s*\{[^}]*transform: translateX\(-50%\);/su);
    expect(timerCss).toMatch(/\.primaryNav\s*\{[^}]*z-index: 5;/su);
    expect(timerCss).toMatch(/\.primaryNav::before\s*\{[^}]*background: linear-gradient/su);
    expect(timerCss).toMatch(/\.primaryNav::after\s*\{[^}]*box-shadow: inset 0 -8px 14px/su);
    expect(timerCss).toMatch(/\.primaryNav\s*\{[^}]*gap: 4px;/su);
    expect(timerCss).toMatch(/\.primaryNav\s*\{[^}]*padding: 4px 8px;/su);
    expect(timerCss).toMatch(
      /\.root\[data-timer-running='true'\]\s+\.primaryNav,\s*\.root\[data-timer-running='true'\]\s+\.listControl\s*\{[^}]*opacity: 0;[^}]*pointer-events: none;[^}]*visibility: hidden;/su,
    );
    expect(timerCss).toMatch(/\.navButton\s*\{[^}]*height: 42px;/su);
    expect(timerCss).toMatch(/\.navButton\s*\{[^}]*width: 42px;/su);
    expect(timerCss).toMatch(
      /\.navButton\s*\{[^}]*color: color-mix\(in srgb, var\(--ui-color-text\) 52%, transparent\);/su,
    );
    expect(timerCss).toMatch(
      /\.navButton:hover\s*\{[^}]*color: color-mix\(in srgb, var\(--ui-color-text\) 76%, transparent\);/su,
    );
    expect(timerCss).toMatch(/\.navButton::before\s*\{[^}]*inset: 2px;/su);
    expect(timerCss).toMatch(/\.navButton::before\s*\{[^}]*opacity: 0;/su);
    expect(timerCss).toMatch(
      /\.navButton::before\s*\{[^}]*background: color-mix\(in srgb, var\(--ui-color-text\) 7%, transparent\);/su,
    );
    expect(timerCss).toMatch(
      /\.navButton:hover::before,\s*\.navButton:focus-visible::before\s*\{[^}]*opacity: 1;/su,
    );
    expect(timerCss).toMatch(/\.navButton\[data-active='true'\]\s*\{[^}]*color:/su);
    expect(timerCss).toMatch(
      /\.navButton\[data-active='true'\]::before\s*\{[^}]*background: color-mix\(in srgb, var\(--ui-color-text\) 10%, transparent\);/su,
    );
    expect(timerCss).toMatch(/\.navButton\[data-active='true'\]::before\s*\{[^}]*opacity: 1;/su);
    expect(timerCss).toMatch(
      /\.navButton\[data-active='true'\]:hover::before\s*\{[^}]*background: color-mix\(in srgb, var\(--ui-color-text\) 12%, transparent\);/su,
    );
    expect(timerCss).toMatch(
      /\.navButton:active\s*\{[^}]*transform: translateY\(1px\) scale\(0\.96\);/su,
    );
    expect(timerCss).toMatch(/\.navButton:active::before\s*\{[^}]*opacity: 1;/su);
    expect(timerNavigationSource).toMatch(/TimerNavIcon/su);
    expect(timerNavigationSource).toMatch(/ResultsListNavIcon/su);
    expect(timerNavigationSource).toMatch(/FormulaStudyNavIcon/su);
    expect(timerNavigationSource).toMatch(/SettingsGearNavIcon/su);
    expect(timerNavigationSource).not.toMatch(/SettingsSlidersNavIcon/su);
  });

  it('localizes timer chrome while preserving event and user-authored list names', () => {
    localStorage.setItem(
      'cubegin-app-preferences',
      JSON.stringify({ ...DEFAULT_APP_PREFERENCES, language: 'en' }),
    );

    renderTimerPage();

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    const navigationButtons = within(navigation).getAllByRole('button');

    expect(navigationButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Timer',
      'Results',
      'Formulas',
      'Settings',
    ]);
    expect(screen.getByRole('timer', { name: 'Press Space or Enter to start' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Switch list' })).toBeTruthy();

    const listToolbar = screen.getByRole('toolbar', { name: 'List actions' });
    fireEvent.click(within(listToolbar).getByRole('button', { name: 'New list' }));

    const dialog = screen.getByRole('dialog', { name: 'New list' });
    expect(within(dialog).getByRole('combobox', { name: 'Event' })).toBeTruthy();
    expect(within(dialog).getByRole('option', { name: '3x3x3' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('List name'), { target: { value: 'Four practice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByRole('option', { name: 'Four practice' })).toBeTruthy();
  });

  it('starts a WCA inspection before solving and lets Escape cancel it', () => {
    setStoredPreferences({ wcaInspection: true });
    vi.spyOn(performance, 'now').mockReturnValue(0);

    renderTimerPage();

    fireEvent.keyDown(document, { code: 'Space', key: ' ' });
    fireEvent.keyUp(document, { code: 'Space', key: ' ' });

    const inspectionTimer = screen.getByRole('timer', {
      name: '观察中，按 Space 或 Enter 开始计时，按 Esc 取消',
    });

    expect(timerMock.start).not.toHaveBeenCalled();
    expect(inspectionTimer.getAttribute('data-state')).toBe('inspection');
    expect(inspectionTimer.querySelector('[data-timer-text]')?.textContent).toBe('15');

    fireEvent.keyDown(document, { code: 'Escape', key: 'Escape' });

    expect(timerMock.start).not.toHaveBeenCalled();
    expect(
      screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' }).getAttribute('data-state'),
    ).toBe('idle');
  });

  it('does not claim timer shortcuts while inactive', () => {
    renderTimerPage({ isActive: false });

    fireEvent.keyDown(document, { code: 'Space', key: ' ' });

    expect(timerMock.reset).not.toHaveBeenCalled();
    expect(timerMock.start).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole('timer', { hidden: true, name: '按 Space 或 Enter 开始计时' })
        .getAttribute('data-state'),
    ).toBe('idle');
  });

  it('applies a +2 penalty when WCA inspection exceeds 15 seconds', () => {
    setStoredPreferences({ wcaInspection: true });
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);

    renderTimerPage();

    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
    nowSpy.mockReturnValue(15_001);
    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

    const summaryRegion = screen.getByRole('region', { name: '成绩概要' });

    expect(timerMock.start).toHaveBeenCalledTimes(1);
    expect(timerMock.stop).toHaveBeenCalledTimes(1);
    expect(within(summaryRegion).getByText('1/1')).toBeTruthy();
    expect(within(summaryRegion).getAllByText('3.234')).toHaveLength(2);
  });

  it('records DNF when WCA inspection exceeds 17 seconds', () => {
    setStoredPreferences({ wcaInspection: true });
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);

    renderTimerPage();

    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
    nowSpy.mockReturnValue(17_001);
    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

    const summaryRegion = screen.getByRole('region', { name: '成绩概要' });

    expect(within(summaryRegion).getByText('0/1')).toBeTruthy();
    expect(within(summaryRegion).getByText('DNF')).toBeTruthy();
  });

  it('keeps the Space ready state before WCA inspection and before timing', () => {
    setStoredPreferences({ wcaInspection: true });
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(0);

    renderTimerPage();

    fireEvent.keyDown(document, { code: 'Space', key: ' ' });

    const inspectionReadyTimer = screen.getByRole('timer', {
      name: '松开 Space 开始计时，按 Esc 取消',
    });
    expect(inspectionReadyTimer.getAttribute('data-state')).toBe('armed');
    expect(timerMock.start).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('timer', {
        name: '观察中，按 Space 或 Enter 开始计时，按 Esc 取消',
      }),
    ).toBeNull();

    fireEvent.keyUp(document, { code: 'Space', key: ' ' });

    expect(
      screen.getByRole('timer', {
        name: '观察中，按 Space 或 Enter 开始计时，按 Esc 取消',
      }),
    ).toBeTruthy();
    expect(timerMock.start).not.toHaveBeenCalled();

    nowSpy.mockReturnValue(12_000);
    fireEvent.keyDown(document, { code: 'Space', key: ' ' });

    const solveReadyTimer = screen.getByRole('timer', {
      name: '松开 Space 开始计时，按 Esc 取消',
    });
    expect(solveReadyTimer.getAttribute('data-state')).toBe('inspection-armed');
    expect(solveReadyTimer.textContent).toContain('3');
    expect(timerMock.start).not.toHaveBeenCalled();

    fireEvent.keyUp(document, { code: 'Space', key: ' ' });

    expect(timerMock.start).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('timer', { name: '计时中，按 Space 或 Enter 结束' })).toBeTruthy();
  });

  it('shows whole seconds only while a solve is running when seconds mode is selected', () => {
    setStoredPreferences({ timerDisplayMode: 'seconds' });
    timerMock.elapsed = 12_345;

    renderTimerPage();

    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

    expect(screen.getByRole('timer', { name: '计时中，按 Space 或 Enter 结束' }).textContent).toBe(
      '12',
    );

    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

    expect(screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' }).textContent).toContain(
      '1.234',
    );
  });

  it('shows inspection countdowns and a timing label in inspection-only mode', () => {
    setStoredPreferences({
      timerDisplayMode: 'inspection-only',
      wcaInspection: true,
    });
    vi.spyOn(performance, 'now').mockReturnValue(0);
    timerMock.elapsed = 12_345;

    renderTimerPage();

    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

    expect(
      screen
        .getByRole('timer', {
          name: '观察中，按 Space 或 Enter 开始计时，按 Esc 取消',
        })
        .querySelector('[data-timer-text]')?.textContent,
    ).toBe('15');

    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

    const timingTimer = screen.getByRole('timer', { name: '计时中，按 Space 或 Enter 结束' });

    expect(timingTimer.textContent).toBe('计时');
    expect(timingTimer.querySelector('[data-timer-label-text]')?.textContent).toBe('计时');
    expect(timingTimer.querySelectorAll('[data-timer-glyph]')).toHaveLength(0);
  });

  it('uses a compact list selector with toolbar actions and default lists for every event', () => {
    renderTimerPage();

    const listSelector = screen.getByRole('combobox', {
      name: '切换列表',
    }) as HTMLSelectElement;
    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    const defaultListLabels = EVENT_IDS.map((eventId) => getEventShortLabel(eventId));
    const defaultListValues = EVENT_IDS.map((eventId) => `main-${eventId}`);
    const listToolbar = screen.getByRole('toolbar', { name: '列表操作' });
    const createListButton = within(listToolbar).getByRole('button', { name: '新增列表' });
    const editListButton = within(listToolbar).getByRole('button', { name: '编辑列表' });

    expect(listSelector.value).toBe('main-333');
    expect(options.map((option) => option.textContent)).toEqual(defaultListLabels);
    expect(options.map((option) => option.value)).toEqual(defaultListValues);
    expect(screen.queryByRole('option', { name: '新增列表...' })).toBeNull();
    expect(within(listToolbar).getByText('列表')).toBeTruthy();
    expect(createListButton.textContent).toBe('');
    expect(editListButton.textContent).toBe('');
    expect(createListButton.querySelector('svg')).not.toBeNull();
    expect(editListButton.querySelector('svg')).not.toBeNull();
    expect(timerCss).toMatch(/\.listTrigger\s*\{[^}]*font-size: 0\.98rem;/su);
    expect(timerCss).toMatch(
      /\.listTrigger\s*\{[^}]*background:[^;]*var\(--ui-color-surface-raised\)/su,
    );
    expect(timerCss).toMatch(/\.listTrigger\s*\{[^}]*border: 1px solid/su);
    expect(timerCss).toMatch(/\.listTrigger\s*\{[^}]*border-radius: 999px;/su);
    expect(timerCss).toMatch(
      /\.listTrigger\s*\{[^}]*color:\s*color-mix\(in srgb,\s*var\(--ui-color-text\) 52%,\s*transparent\);/su,
    );
    expect(timerCss).toMatch(/\.listTrigger\s*\{[^}]*height: 36px;/su);
    expect(timerCss).toMatch(/\.listTrigger\s*\{[^}]*min-height: 36px;/su);
    expect(timerCss).toMatch(/\.listTrigger\s*\{[^}]*min-width: 76px;/su);
    expect(timerCss).toMatch(
      /\.listTrigger:hover\s*:global\(svg\)\s*\{[^}]*color:\s*color-mix\(in srgb,\s*var\(--ui-color-text\) 70%,\s*transparent\);/su,
    );
    expect(timerCss).toMatch(/\.listTrigger\s*:global\(svg\)\s*\{[^}]*height: 14px;/su);
    expect(timerCss).toMatch(/\.listToolbar\s*\{[^}]*display: flex;/su);
    expect(timerCss).toMatch(/\.listToolbar\s*\{[^}]*gap: 8px;/su);
    expect(timerCss).toMatch(/\.listToolbar\s*\{[^}]*justify-content: space-between;/su);
    expect(timerCss).toMatch(/\.listToolbar\s*\{[^}]*padding: 4px 6px 7px;/su);
    expect(timerCss).toMatch(/\.listToolbarLabel\s*\{[^}]*font-size: 0\.78rem;/su);
    expect(timerCss).toMatch(/\.listToolbarActions\s*\{[^}]*display: inline-flex;/su);
    expect(timerCss).toMatch(/\.listToolbarButton\s*\{[^}]*height: 28px;/su);
    expect(timerCss).toMatch(/\.listItem\s*\{[^}]*font-weight: 400;/su);
    expect(timerCss).toMatch(/\.listItem\[data-state='checked'\]\s*\{[^}]*font-weight: 620;/su);

    fireEvent.click(createListButton);

    const dialog = screen.getByRole('dialog', { name: '新增列表' });
    const scrambleSelector = within(dialog).getByRole('combobox', {
      name: '项目',
    }) as HTMLSelectElement;
    const scrambleOptions = within(dialog).getAllByRole('option') as HTMLOptionElement[];

    expect(scrambleSelector.getAttribute('data-component-select')).toBe('true');
    expect(within(dialog).queryByRole('combobox', { name: '打乱' })).toBeNull();
    expect(dialog.querySelectorAll('[data-component-select-root]')).toHaveLength(1);
    expect(scrambleOptions.map((option) => option.value)).toEqual([...EVENT_IDS]);
    expect(scrambleOptions.map((option) => option.textContent)).toEqual(
      EVENT_IDS.map((eventId) => getEventShortLabel(eventId)),
    );
    expect(within(dialog).queryByRole('option', { name: '3x3 / OLL' })).toBeNull();

    fireEvent.change(screen.getByLabelText('列表名称'), { target: { value: '四阶练习' } });
    fireEvent.change(scrambleSelector, { target: { value: '444' } });
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    expect(screen.queryByRole('dialog', { name: '新增列表' })).toBeNull();
    expect(screen.getByRole('option', { name: '四阶练习' })).toBeTruthy();
    expect(listSelector.value).toBe(`custom:${EVENT_IDS.length + 1}`);
  });

  it('edits the active list from the list selector toolbar without adding an option row', () => {
    renderTimerPage();

    const listSelector = screen.getByRole('combobox', {
      name: '切换列表',
    }) as HTMLSelectElement;
    const listToolbar = screen.getByRole('toolbar', { name: '列表操作' });

    fireEvent.click(within(listToolbar).getByRole('button', { name: '编辑列表' }));

    const dialog = screen.getByRole('dialog', { name: '编辑列表' });
    const nameInput = within(dialog).getByLabelText('列表名称') as HTMLInputElement;
    const scrambleSelector = within(dialog).getByRole('combobox', {
      name: '项目',
    }) as HTMLSelectElement;

    expect(nameInput.value).toBe('3x3x3');
    expect(scrambleSelector.value).toBe('333');

    fireEvent.change(nameInput, { target: { value: '三阶主练习' } });
    fireEvent.change(scrambleSelector, { target: { value: '444' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '保存' }));

    expect(screen.queryByRole('dialog', { name: '编辑列表' })).toBeNull();
    expect(screen.getByRole('option', { name: '三阶主练习' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: '3x3x3' })).toBeNull();
    expect(listSelector.value).toBe('main-333');
  });

  it('lays out the scramble, session summary, and scramble image around the timer', async () => {
    const { container } = renderTimerPage();

    const scrambleRegion = screen.getByRole('region', { name: '当前打乱' });
    const summaryRegion = screen.getByRole('region', { name: '成绩概要' });
    const scramblePreview = screen.getByLabelText('打乱图');

    const scrambleText = await within(scrambleRegion).findByText('333 generated scramble');

    expect(scrambleText.getAttribute('data-density')).toBe('regular');
    expect(scrambleRegion.getAttribute('data-scramble-event-id')).toBe('333');
    expect(scrambleGeneratorMock.generate).toHaveBeenCalledWith('333', {
      multiBlindCubeCount: undefined,
    });
    await waitFor(() => {
      expect(scrambleImageMock.renderScrambleImage).toHaveBeenCalledWith(
        '333',
        '333 generated scramble',
      );
    });
    expect(scramblePreview.querySelector('[data-scramble-image]')).not.toBeNull();
    expect(container.querySelector('svg[data-rendered-scramble="true"]')).not.toBeNull();
    expect(within(summaryRegion).queryByText('有效成绩次数 / 总次数')).toBeNull();
    expect(within(summaryRegion).getByText('0/0')).toBeTruthy();
    expect(within(summaryRegion).getByText('平均')).toBeTruthy();
    expect(within(summaryRegion).getByText('最佳')).toBeTruthy();
    expect(within(summaryRegion).getByText('mo3')).toBeTruthy();
    expect(within(summaryRegion).getByText('ao5')).toBeTruthy();
    expect(within(summaryRegion).queryByText('ao12')).toBeNull();
    expect(within(summaryRegion).queryByText('ao50')).toBeNull();
    expect(within(summaryRegion).queryByText('ao100')).toBeNull();
    expect(within(summaryRegion).getAllByText('--')).toHaveLength(4);
    expect(container.querySelector('[data-scramble-toolbar-placeholder]')).not.toBeNull();
    expect(container.querySelectorAll('[data-scramble-toolbar-placeholder] span')).toHaveLength(3);

    expect(timerCss).toMatch(/--timer-top-zone-height: clamp\(292px, 28vh, 392px\);/u);
    expect(timerCss).toMatch(/--timer-page-inline-padding: 16px;/u);
    expect(timerCss).toMatch(/--timer-scramble-line-height: 1\.26;/u);
    expect(timerCss).toMatch(/--timer-scramble-toolbar-height: 36px;/u);
    expect(timerCss).toMatch(/--timer-stage-center-offset: calc\(/u);
    expect(timerCss).toMatch(/--timer-bottom-zone-height: clamp\(190px, 22vh, 236px\);/u);
    expect(timerCss).toMatch(/--timer-nav-zone-height: 0px;/u);
    expect(timerCss).not.toMatch(/radial-gradient/u);
    expect(timerCss).toMatch(
      /grid-template-rows:\s*var\(--timer-top-zone-height\)\s*minmax\(0, 1fr\)\s*var\(--timer-bottom-zone-height\);/u,
    );
    expect(timerCss).toMatch(/\.hero\s*\{[^}]*grid-template-rows: auto minmax\(0, 1fr\);/su);
    expect(timerCss).toMatch(
      /\.hero\s*\{[^}]*padding: calc\(18px \+ env\(safe-area-inset-top\)\) var\(--timer-page-inline-padding\) 14px;/su,
    );
    expect(timerCss).toMatch(/\.scrambleStrip\s*\{[^}]*align-self: stretch;/su);
    expect(timerCss).toMatch(/\.scrambleStrip\s*\{[^}]*display: grid;/su);
    expect(timerCss).toMatch(
      /\.scrambleStrip\s*\{[^}]*grid-template-rows: minmax\(0, 1fr\) var\(--timer-scramble-toolbar-height\);/su,
    );
    expect(timerCss).toMatch(/\.scrambleStrip\s*\{[^}]*align-content: stretch;/su);
    expect(timerCss).toMatch(/\.scrambleStrip\s*\{[^}]*align-items: stretch;/su);
    expect(timerCss).toMatch(/\.scrambleStrip\s*\{[^}]*max-height: 100%;/su);
    expect(timerCss).toMatch(/\.scrambleStrip\s*\{[^}]*min-height: 0;/su);
    expect(timerCss).toMatch(
      /\.scrambleStrip\s*\{[^}]*width: min\(\s*1280px,\s*calc\(\s*100vw - var\(--timer-page-inline-padding\) - var\(--timer-page-inline-padding\)\s*\)\s*\);/su,
    );
    expect(timerCss).not.toMatch(/\.scrambleStrip\s*\{[^}]*font-size:/su);
    expect(timerCss).toMatch(
      /\.scrambleText\s*:global\(\[data-density\]\)\s*\{[^}]*max-width: min\(1280px, 100%\);/su,
    );
    expect(timerCss).toMatch(
      /\.scrambleText\s*:global\(\[data-density='regular'\]\)\s*\{[^}]*--scramble-text-size: clamp\(1\.6rem, 2\.25vw \+ 0\.34rem, 2\.9rem\);/su,
    );
    expect(timerCss).toMatch(
      /\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*--scramble-text-size: clamp\(1\.08rem, 0\.72vw \+ 0\.55rem, 1\.38rem\);/su,
    );
    expect(timerCss).toMatch(/\.scrambleText\s*\{[^}]*align-items: center;/su);
    expect(timerCss).toMatch(/\.scrambleText\s*\{[^}]*align-self: stretch;/su);
    expect(timerCss).toMatch(/\.scrambleText\s*\{[^}]*height: 100%;/su);
    expect(timerCss).toMatch(/\.scrambleText\s*\{[^}]*max-height: 100%;/su);
    expect(timerCss).toMatch(/\.scrambleText\s*\{[^}]*min-height: 0;/su);
    expect(timerCss).toMatch(/\.scrambleText\s*\{[^}]*overflow: auto;/su);
    expect(timerCss).toMatch(/\.scrambleText\s*\{[^}]*scrollbar-width: none;/su);
    expect(timerCss).toMatch(
      /\.scrambleToolbarSlot\s*\{[^}]*min-height: var\(--timer-scramble-toolbar-height\);/su,
    );
    expect(timerCss).toMatch(/\.scrambleToolbarPlaceholder\s*\{[^}]*display: inline-flex;/su);
    expect(timerCss).toMatch(/\.scrambleToolbarPlaceholderItem\s*\{[^}]*border-radius: 999px;/su);
    expect(timerCss).not.toMatch(/@media \(max-width: 980px\) and \(min-height: 1200px\)/u);
    expect(timerCss).toMatch(
      /@media \(max-height: 900px\)\s*\{[^}]*\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*--scramble-text-size: clamp\(1\.02rem, 0\.52vw \+ 0\.62rem, 1\.14rem\);/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-height: 900px\)\s*\{[^}]*\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*line-height: 1\.22;/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 1180px\)\s*\{\s*\.root\s*\{[^}]*--timer-nav-zone-height: calc\(68px \+ env\(safe-area-inset-bottom\)\);/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 1180px\)\s*\{\s*\.root\s*\{[^}]*--timer-top-zone-height: clamp\(256px, 30vh, 340px\);/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 1180px\)\s*\{\s*\.root\s*\{[^}]*grid-template-areas:\s*'hero'\s*'stage'\s*'bottom'\s*'nav';/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 1180px\)\s*\{\s*\.root\s*\{[^}]*grid-template-rows:\s*var\(--timer-top-zone-height\)\s*minmax\(0, 1fr\)\s*var\(--timer-bottom-zone-height\)\s*var\(--timer-nav-zone-height\);/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 1180px\)\s*\{[\s\S]*?\.primaryNav\s*\{[^}]*grid-area: nav;[^}]*position: relative;[^}]*transform: none;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 1180px\)\s*\{[\s\S]*?\.bottomDock\s*\{[^}]*padding-bottom: 0;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[^}]*--timer-top-zone-height: clamp\(286px, 43dvh, 328px\);/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[^}]*--timer-page-inline-padding: 16px;/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[^}]*--timer-bottom-zone-height: 126px;/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[^}]*--timer-nav-zone-height: calc\(58px \+ env\(safe-area-inset-bottom\)\);/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[^}]*--timer-scramble-toolbar-height: 30px;/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*--scramble-text-size: clamp\(0\.8rem, 1\.35vw \+ 0\.3rem, 0\.94rem\);/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*inline-size: fit-content;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*line-height: 1\.1;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*max-inline-size: 100%;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*text-align: center;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.scrambleStrip\[data-scramble-event-id='minx'\]\s+\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*--scramble-text-size: clamp\(0\.82rem, 1vw \+ 0\.44rem, 0\.94rem\);/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.scrambleStrip\[data-scramble-event-id='minx'\]\s+\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*line-height: 1\.12;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.scrambleStrip\[data-scramble-event-id='minx'\]\s+\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*text-align: left;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.scrambleStrip\[data-scramble-event-id='minx'\]\s+\.scrambleText\s*:global\(\[data-density='dense'\]\)\s*\{[^}]*white-space: pre-line;/u,
    );
    expect(timerCss).not.toMatch(/-webkit-line-clamp:/u);
    expect(timerCss).not.toMatch(/display: -webkit-box;/u);
    expect(timerCss).toMatch(
      /\.bottomDock\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 3fr\);/su,
    );
    expect(timerCss).toMatch(
      /\.bottomDock\s*\{[^}]*padding: 0 var\(--timer-page-inline-padding\) calc\(16px \+ env\(safe-area-inset-bottom\)\);/su,
    );
    expect(timerCss).toMatch(/\.bottomDock\s*\{[^}]*height: 100%;/su);
    expect(timerCss).toMatch(/\.bottomDock\s*\{[^}]*min-height: 0;/su);
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.bottomDock\s*\{[^}]*align-items: flex-end;[^}]*display: flex;[^}]*gap: 14px;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.sessionSummary\s*\{[^}]*align-self: flex-end;[^}]*flex: 0 1 max-content;[^}]*inline-size: max-content;[^}]*max-inline-size: min\(42vw, 152px\);[^}]*min-inline-size: min\(36vw, 128px\);[^}]*min-height: 0;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.scramblePreview\s*\{[^}]*align-self: flex-end;[^}]*block-size: min\(100%, 126px\);[^}]*flex: 1 1 auto;[^}]*inline-size: auto;[^}]*min-height: 0;/u,
    );
    expect(timerCss).toMatch(
      /\.timerSurface\s*\{[^}]*transform: translateY\(var\(--timer-stage-center-offset\)\);/su,
    );
    expect(timerCss).toMatch(
      /\.timeFace\s*\{[^}]*--timer-time-wide-size: clamp\(4\.6rem, 15vw, 10\.4rem\);/su,
    );
    expect(timerCss).toMatch(
      /\.timeFace\s*\{[^}]*--timer-time-max-size: clamp\(4\.2rem, 16vw, 9\.4rem\);/su,
    );
    expect(timerCss).toMatch(
      /\.timeFace\s*\{[^}]*--timer-time-label-size: clamp\(3\.4rem, 9vw, 6\.6rem\);/su,
    );
    expect(timerCss).not.toMatch(/--timer-time-size:/u);
    expect(timerCss).toMatch(/\.timeFace\s*\{[^}]*font-size: var\(--timer-time-wide-size\);/su);
    expect(timerCss).not.toMatch(/\.timeFace\[data-time-width='wide'\]/u);
    expect(timerCss).toMatch(
      /\.timeFace\[data-time-width='max'\]\s*\{[^}]*font-size: var\(--timer-time-max-size\);/su,
    );
    expect(timerCss).toMatch(
      /\.timeFace\[data-timer-display='label'\]\s*\{[^}]*font-size: var\(--timer-time-label-size\);/su,
    );
    expect(timerCss).toMatch(/\.timeFace\s*\{[^}]*font-feature-settings: 'tnum' 1;/su);
    expect(timerCss).toMatch(/\.timeFace\s*\{[^}]*font-variant-numeric: tabular-nums;/su);
    expect(timerCss).toMatch(
      /\.timerText\s*\{[^}]*align-items: baseline;[^}]*display: inline-flex;[^}]*font-feature-settings: inherit;[^}]*font-size: inherit;[^}]*font-variant-numeric: inherit;/su,
    );
    expect(timerCss).toMatch(/\.timerFraction\s*\{[^}]*font-size: inherit;/su);
    expect(timerCss).toMatch(/\.timerFraction\s*\{[^}]*font-variant-numeric: inherit;/su);
    expect(timerCss).toMatch(/\.timerFraction\s*\{[^}]*font-weight: inherit;/su);
    expect(timerCss).not.toMatch(/\.timerFraction\s*\{[^}]*font-weight: 380;/su);
    expect(timerCss).not.toMatch(/\.timerFraction\s*\{[^}]*font-size: 0\.8em;/su);
    expect(timerCss).toMatch(/\.timerFraction\s*\{[^}]*margin-inline-start: 0;/su);
    expect(timerCss).toMatch(
      /\.timerLabelText\s*\{[^}]*letter-spacing: 0;[^}]*white-space: nowrap;/su,
    );
    expect(timerCss).toMatch(/\.timerGlyph\s*\{[^}]*--timer-glyph-width: 0\.58em;/su);
    expect(timerCss).toMatch(/\.timerGlyph\s*\{[^}]*flex: 0 0 var\(--timer-glyph-width\);/su);
    expect(timerCss).toMatch(
      /\.timerGlyph\[data-timer-glyph='separator'\]\s*\{[^}]*--timer-glyph-width: 0\.32em;/su,
    );
    expect(timerCss).toMatch(
      /\.summaryMetric\s*\{[^}]*display: flex;[^}]*justify-content: flex-start;/su,
    );
    expect(timerCss).not.toMatch(/\.summaryMetric\s*\{[^}]*grid-template-columns:/su);
    expect(timerCss).toMatch(/\.summaryLabel\s*\{[^}]*font-size: 0\.86rem;/su);
    expect(timerCss).toMatch(/\.summaryValue\s*\{[^}]*font-size: 0\.86rem;/su);
    expect(timerCss).toMatch(/\.scramblePreview\s*\{[^}]*align-self: stretch;/su);
    expect(timerCss).toMatch(
      /\.scramblePreview\s*:global\(\[data-scramble-image\]\)\s*\{[^}]*height: 100%;[^}]*max-width: 100%;[^}]*width: auto;/su,
    );
    expect(timerCss).toMatch(
      /\.scramblePreview\s*:global\(\[data-scramble-image\] svg\)\s*\{[^}]*height: 100%;[^}]*max-width: 100%;[^}]*width: auto;/su,
    );
    expect(timerCss).toMatch(/\.stage\s*\{[^}]*position: relative;/su);
    expect(timerCss).toMatch(/\.recentRail\s*\{[^}]*display: none;/su);
    expect(timerCss).toMatch(
      /\.recentRail\s*\{[^}]*inset-inline-end: var\(--timer-page-inline-padding\);/su,
    );
    expect(timerCss).toMatch(/\.recentRail\s*\{[^}]*max-height: min\(360px, 44vh\);/su);
    expect(timerCss).toMatch(
      /@media \(min-width: 1180px\) and \(min-height: 720px\)\s*\{[^}]*\.recentRail\s*\{[^}]*display: grid;/su,
    );
    expect(timerCss).toMatch(/\.root\[data-focus-mode='true'\] \.recentRail/su);
    expect(timerCss).toMatch(
      /@media \(max-height: 520px\) and \(orientation: landscape\)\s*\{[^}]*--timer-bottom-zone-height: 0px;/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-height: 520px\) and \(orientation: landscape\)\s*\{[^}]*--timer-nav-zone-height: calc\(52px \+ env\(safe-area-inset-bottom\)\);/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-height: 520px\) and \(orientation: landscape\)\s*\{[^}]*--timer-top-zone-height: clamp\(180px, 48vh, 204px\);/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-height: 520px\) and \(orientation: landscape\)\s*\{[^}]*--timer-stage-center-offset: 0px;/su,
    );
    expect(timerCss).toMatch(
      /@media \(max-height: 520px\) and \(orientation: landscape\)\s*\{[\s\S]*?\.bottomDock\s*\{[^}]*display: none;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-height: 520px\) and \(orientation: landscape\)\s*\{[\s\S]*?\.timerSurface\s*\{[^}]*--timer-feedback-height: 32px;/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-height: 520px\) and \(orientation: landscape\)\s*\{[\s\S]*?\.timerSurface\s*\{[^}]*--timer-feedback-offset: clamp\(2\.35rem, 9\.8vh, 2\.55rem\);/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-height: 520px\) and \(orientation: landscape\)\s*\{[\s\S]*?\.timeFace\s*\{[^}]*--timer-time-wide-size: clamp\(3rem, 17vh, 4\.4rem\);/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-height: 520px\) and \(orientation: landscape\)\s*\{[\s\S]*?\.timeFace\s*\{[^}]*--timer-time-max-size: clamp\(2\.8rem, 16vh, 4\.1rem\);/u,
    );
    expect(timerCss).toMatch(
      /@media \(max-height: 520px\) and \(orientation: landscape\)\s*\{[\s\S]*?\.resultButton\s*\{[^}]*min-width: 44px;/u,
    );
  });

  it('loads a generated scramble when switching to another default event list', async () => {
    renderTimerPage();

    const scrambleRegion = screen.getByRole('region', { name: '当前打乱' });

    expect(await within(scrambleRegion).findByText('333 generated scramble')).toBeTruthy();

    const listSelector = screen.getByRole('combobox', {
      name: '切换列表',
    }) as HTMLSelectElement;

    fireEvent.change(listSelector, { target: { value: 'main-444' } });

    expect(await within(scrambleRegion).findByText('444 generated scramble')).toBeTruthy();
    expect(scrambleGeneratorMock.generate.mock.calls.map(([eventId]) => eventId)).toEqual([
      '333',
      '444',
    ]);
    await waitFor(() => {
      expect(scrambleImageMock.renderScrambleImage).toHaveBeenCalledWith(
        '444',
        '444 generated scramble',
      );
    });
    expect(scrambleImageMock.renderScrambleImage).not.toHaveBeenCalledWith(
      '444',
      '333 generated scramble',
    );
  });

  it('starts after Space is released and stops with Enter', () => {
    const { container } = renderTimerPage();
    const getFeedbackSlot = () => container.querySelector('[data-feedback-slot]');
    const pageRoot = container.querySelector('[aria-label="计时器"]');
    const primaryNav = screen.getByRole('navigation', { name: '主导航' });
    const listSelector = screen.getByRole('combobox', { name: '切换列表' });
    const listControl = listSelector.closest('[data-component-select-root="true"]');

    expect(screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' }).textContent).toBe(
      '0.000',
    );
    expect(screen.queryByText('按住 Space 准备')).toBeNull();
    expect(getFeedbackSlot()?.getAttribute('data-state')).toBe('idle');
    expect(screen.queryByRole('toolbar', { name: '成绩操作' })).toBeNull();
    expect(pageRoot?.getAttribute('data-timer-running')).toBe('false');
    expect(primaryNav.getAttribute('aria-hidden')).toBeNull();
    expect(listControl?.getAttribute('aria-hidden')).toBeNull();

    fireEvent.keyDown(document, { code: 'Space', key: ' ' });

    expect(timerMock.reset).toHaveBeenCalledTimes(1);
    expect(timerMock.start).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole('timer', { name: '松开 Space 开始计时，按 Esc 取消' })
        .getAttribute('data-state'),
    ).toBe('armed');
    expect(screen.getByText('Esc 取消')).toBeTruthy();
    expect(screen.queryByText('松开开始 · Esc 取消')).toBeNull();
    expect(getFeedbackSlot()?.getAttribute('data-state')).toBe('armed');
    expect(pageRoot?.getAttribute('data-timer-running')).toBe('false');
    expect(primaryNav.getAttribute('aria-hidden')).toBeNull();
    expect(listControl?.getAttribute('aria-hidden')).toBeNull();

    fireEvent.keyUp(document, { code: 'Space', key: ' ' });

    expect(timerMock.start).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getByRole('timer', { name: '计时中，按 Space 或 Enter 结束' })
        .getAttribute('data-state'),
    ).toBe('timing');
    expect(screen.queryByText('Space / Enter 结束')).toBeNull();
    expect(screen.queryByText('Esc 取消')).toBeNull();
    expect(screen.queryByRole('toolbar', { name: '成绩操作' })).toBeNull();
    expect(getFeedbackSlot()?.getAttribute('data-state')).toBe('timing');
    expect(pageRoot?.getAttribute('data-timer-running')).toBe('true');
    expect(primaryNav.getAttribute('aria-hidden')).toBe('true');
    expect(listControl?.getAttribute('aria-hidden')).toBe('true');

    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

    expect(timerMock.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' }).textContent).toContain(
      '1.234',
    );
    expect(screen.queryByText('本次成绩')).toBeNull();
    expect(screen.queryByText('Space / Enter 结束')).toBeNull();
    expect(getFeedbackSlot()?.getAttribute('data-state')).toBe('stopped');
    expect(pageRoot?.getAttribute('data-timer-running')).toBe('false');
    expect(primaryNav.getAttribute('aria-hidden')).toBeNull();
    expect(listControl?.getAttribute('aria-hidden')).toBeNull();
    expect(screen.getByRole('toolbar', { name: '成绩操作' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '+2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'DNF' })).toBeTruthy();
    const deleteButton = screen.getByRole('button', { name: '删除' });

    expect(deleteButton).toBeTruthy();
    expect(deleteButton.textContent).toBe('');
    expect(deleteButton.querySelector('svg')).not.toBeNull();
    expect(screen.queryByText('删除')).toBeNull();
    const summaryRegion = screen.getByRole('region', { name: '成绩概要' });

    expect(within(summaryRegion).queryByText('有效成绩次数 / 总次数')).toBeNull();
    expect(within(summaryRegion).getByText('1/1')).toBeTruthy();
    expect(within(summaryRegion).getAllByText('1.234')).toHaveLength(2);
  });

  it('edits the stopped solve penalty from the result toolbar', async () => {
    renderTimerPage();

    await finishOneSolve();

    fireEvent.click(screen.getByRole('button', { name: '+2' }));

    await waitFor(() =>
      expect(screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' }).textContent).toContain(
        '3.234+',
      ),
    );

    const summaryRegion = screen.getByRole('region', { name: '成绩概要' });

    expect(within(summaryRegion).getByText('1/1')).toBeTruthy();
    expect(within(summaryRegion).getAllByText('3.234')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'DNF' }));

    await waitFor(() =>
      expect(screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' }).textContent).toContain(
        'DNF',
      ),
    );
    expect(within(summaryRegion).getByText('0/1')).toBeTruthy();
    expect(within(summaryRegion).getByText('DNF')).toBeTruthy();
  });

  it('confirms deleting the stopped solve from the delete dialog', async () => {
    renderTimerPage();

    await finishOneSolve();

    fireEvent.click(screen.getByRole('button', { name: '删除' }));

    const dialog = await screen.findByRole('dialog', { name: '删除本次成绩' });
    const confirmButton = within(dialog).getByRole('button', { name: '删除' });

    expect(within(dialog).getByText('删除后不可恢复。')).toBeTruthy();
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    expect((confirmButton as HTMLButtonElement).disabled).toBe(false);
    expect(timerCss).toMatch(/\.modalBackdrop\s*\{[^}]*place-items: center;/su);
    expect(timerCss).toMatch(/\.deleteResultTitle\s*\{[^}]*font-size: 1\.16rem;/su);

    fireEvent.click(confirmButton);

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '删除本次成绩' })).toBeNull());
    expect(screen.queryByRole('toolbar', { name: '成绩操作' })).toBeNull();
    expect(screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' }).textContent).toContain(
      '0.000',
    );
    expect(within(screen.getByRole('region', { name: '成绩概要' })).getByText('0/0')).toBeTruthy();
  });

  it('claims Space before the focused list selector can consume it', () => {
    renderTimerPage();

    const listSelector = screen.getByRole('combobox', { name: '切换列表' });
    const selectorKeyDown = vi.fn();
    const selectorKeyUp = vi.fn();
    const selectorClick = vi.fn();
    listSelector.addEventListener('keydown', selectorKeyDown);
    listSelector.addEventListener('keyup', selectorKeyUp);
    listSelector.addEventListener('click', selectorClick);
    listSelector.focus();

    const spaceDownEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'Space',
      key: ' ',
    });

    expect(fireEvent(listSelector, spaceDownEvent)).toBe(false);
    expect(spaceDownEvent.defaultPrevented).toBe(true);
    expect(selectorKeyDown).not.toHaveBeenCalled();
    expect(timerMock.reset).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getByRole('timer', { name: '松开 Space 开始计时，按 Esc 取消' })
        .getAttribute('data-state'),
    ).toBe('armed');

    const spaceUpEvent = new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true,
      code: 'Space',
      key: ' ',
    });

    expect(fireEvent(listSelector, spaceUpEvent)).toBe(false);
    expect(spaceUpEvent.defaultPrevented).toBe(true);
    expect(selectorKeyUp).not.toHaveBeenCalled();
    expect(timerMock.start).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getByRole('timer', { name: '计时中，按 Space 或 Enter 结束' })
        .getAttribute('data-state'),
    ).toBe('timing');

    const keyboardClickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail: 0,
    });

    expect(fireEvent(listSelector, keyboardClickEvent)).toBe(false);
    expect(keyboardClickEvent.defaultPrevented).toBe(true);
    expect(selectorClick).not.toHaveBeenCalled();
  });

  it('shows the newest solve at the bottom in the wide-screen recent solve rail', () => {
    renderTimerPage();

    [1000, 1100, 1200].forEach((elapsedMs) => {
      timerMock.stop.mockReturnValueOnce(elapsedMs);
      fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
      fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
    });

    const recentRegion = screen.getByRole('region', { name: '最近成绩' });
    const recentItems = within(recentRegion).getAllByRole('listitem');

    expect(recentItems).toHaveLength(3);
    expect(recentItems.map((recentItem) => recentItem.textContent)).toEqual([
      '1.000',
      '1.100',
      '1.200',
    ]);
    expect(within(recentRegion).queryByText('1')).toBeNull();
    expect(timerCss).not.toMatch(/\.recentRailIndex/u);
    expect(timerCss).toMatch(/\.recentRailItem:last-child \.recentRailTime\s*\{[^}]*opacity: 1;/su);
    expect(timerCss).toMatch(
      /\.recentRailItem:not\(:last-child\) \.recentRailTime\s*\{[^}]*opacity: 0\.46;/su,
    );
  });

  it('hides the side recent solve rail until there is more than one solve', () => {
    renderTimerPage();

    timerMock.stop.mockReturnValueOnce(1000);
    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

    expect(screen.queryByRole('region', { name: '最近成绩' })).toBeNull();

    timerMock.stop.mockReturnValueOnce(1100);
    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

    const recentRegion = screen.getByRole('region', { name: '最近成绩' });

    expect(within(recentRegion).getAllByRole('listitem')).toHaveLength(2);
  });

  it('calculates compact session statistics from completed solves', () => {
    renderTimerPage();

    [1000, 1100, 1200, 1300, 1400].forEach((elapsedMs) => {
      timerMock.stop.mockReturnValueOnce(elapsedMs);
      fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
      fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
    });

    const summaryRegion = screen.getByRole('region', { name: '成绩概要' });

    expect(within(summaryRegion).getByText('5/5')).toBeTruthy();
    expect(within(summaryRegion).getAllByText('1.200')).toHaveLength(2);
    expect(within(summaryRegion).getByText('1.000')).toBeTruthy();
    expect(within(summaryRegion).getByText('1.300')).toBeTruthy();
    expect(within(summaryRegion).queryByText('ao12')).toBeNull();
    expect(within(summaryRegion).queryByText('ao50')).toBeNull();
    expect(within(summaryRegion).queryByText('ao100')).toBeNull();
  });

  it('reveals extended rolling averages when the session reaches their solve counts', () => {
    renderTimerPage();

    Array.from({ length: 12 }, (_, index) => 1000 + index * 100).forEach((elapsedMs) => {
      timerMock.stop.mockReturnValueOnce(elapsedMs);
      fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
      fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
    });

    const summaryRegion = screen.getByRole('region', { name: '成绩概要' });

    expect(within(summaryRegion).getByText('12/12')).toBeTruthy();
    expect(within(summaryRegion).getByText('ao12')).toBeTruthy();
    expect(within(summaryRegion).queryByText('ao50')).toBeNull();
    expect(within(summaryRegion).queryByText('ao100')).toBeNull();
  });

  it('uses the wide timer width bucket by default', () => {
    renderTimerPage();

    const timer = screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' });

    expect(timer.textContent).toContain('0.000');
    expect(timer.querySelector('[data-time-width]')?.getAttribute('data-time-width')).toBe('wide');
  });

  it('formats solve times at 60 seconds as minutes', () => {
    timerMock.stop.mockReturnValue(60_123);

    renderTimerPage();

    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });
    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

    const timerText = screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' }).textContent;
    const timer = screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' });

    expect(timerText).toContain('1:00.123');
    expect(timerText).not.toContain('60.123');
    expect(timer.querySelector('[data-time-width]')?.getAttribute('data-time-width')).toBe('wide');
    expect(timer.querySelector('[data-timer-part="whole"]')?.textContent).toBe('1:00');
    expect(timer.querySelector('[data-timer-part="fraction"]')?.textContent).toBe('.123');
    expect(
      Array.from(timer.querySelectorAll('[data-timer-glyph]')).map((glyph) => glyph.textContent),
    ).toEqual(['1', ':', '0', '0', '.', '1', '2', '3']);
  });

  it('uses the max timer width bucket for long clock values', () => {
    timerMock.elapsed = 610_429;

    renderTimerPage();

    const timer = screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' });

    expect(timer.textContent).toContain('10:10.429');
    expect(timer.querySelector('[data-time-width]')?.getAttribute('data-time-width')).toBe('max');
    expect(timer.querySelector('[data-timer-part="whole"]')?.textContent).toBe('10:10');
    expect(timer.querySelector('[data-timer-part="fraction"]')?.textContent).toBe('.429');
    expect(timerPageSource).toMatch(/formatTimerDisplay/su);
    expect(timerPageSource).toMatch(/splitTimerElapsedText/su);
  });

  it('cancels Space ready with Escape before release', () => {
    renderTimerPage();

    fireEvent.keyDown(document, { code: 'Space', key: ' ' });
    fireEvent.keyDown(document, { code: 'Escape', key: 'Escape' });
    fireEvent.keyUp(document, { code: 'Space', key: ' ' });

    expect(timerMock.start).not.toHaveBeenCalled();
    expect(
      screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' }).getAttribute('data-state'),
    ).toBe('idle');
    expect(screen.queryByText('Esc 取消')).toBeNull();
    expect(screen.queryByText('按住 Space 准备')).toBeNull();
  });

  it('does not start from clicking the timer surface', () => {
    renderTimerPage();

    fireEvent.click(screen.getByRole('timer', { name: '按 Space 或 Enter 开始计时' }));

    expect(timerMock.start).not.toHaveBeenCalled();
  });

  it('prevents selecting timer and result action text', () => {
    expect(timerCss).toMatch(/\.timeFace\s*\{[^}]*user-select: none;/su);
    expect(timerCss).toMatch(/\.resultToolbar\s*\{[^}]*user-select: none;/su);
    expect(timerCss).toMatch(/\.resultButton\s*\{[^}]*user-select: none;/su);
  });

  it('keeps result action spacing and hover feedback visually consistent', () => {
    expect(timerCss).toMatch(/\.resultToolbar\s*\{[^}]*gap: 8px;/su);
    expect(timerCss).toMatch(/\.resultButton\s*\{[^}]*min-width: 52px;/su);
    expect(timerCss).toMatch(/\.resultButton\s*\{[^}]*opacity: 0\.62;/su);
    expect(timerCss).toMatch(/\.resultButton:hover\s*\{[^}]*opacity: 1;/su);
    expect(timerCss).not.toMatch(/\.resultButton:hover\s*\{[^}]*text-decoration: underline;/su);
  });
});

declare const process: {
  cwd: () => string;
};

// @ts-ignore Vitest runs this test in Node, while focused app checks may omit Node types.
const { readFileSync } = await import('node:fs');
const timerCss = readFileSync(`${process.cwd()}/src/timer/timer-page.module.css`, 'utf8') as string;
const timerPageSource = readFileSync(`${process.cwd()}/src/timer/timer-page.tsx`, 'utf8') as string;
const timerNavigationSource = readFileSync(
  `${process.cwd()}/src/timer/timer-navigation.tsx`,
  'utf8',
) as string;
