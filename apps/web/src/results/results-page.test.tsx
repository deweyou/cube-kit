import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { DEFAULT_APP_PREFERENCES } from '@cubegin/shared/preferences';
import type { SolveRecord } from '@cubegin/shared/timer-session';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppPreferencesProvider } from '../preferences/app-preferences';
import { createMemoryTimerSessionDb } from '../timer-session/timer-session-db';
import {
  TimerSessionStoreProvider,
  useTimerSessionStore,
} from '../timer-session/timer-session-store';
import {
  ResultsPage,
  buildDistributionChartData,
  buildTrendChartData,
  buildTrendYAxisDomain,
  formatSolveCreatedAt,
} from './results-page';

const resultsPageStyles = readFileSync(join(cwd(), 'src/results/results-page.module.css'), 'utf8');
const resultsPageSource = readFileSync(join(cwd(), 'src/results/results-page.tsx'), 'utf8');

describe('results numeric input ownership', () => {
  it('uses the design-system NumberInput instead of native number inputs', () => {
    expect(resultsPageSource).toContain('@deweyou-design/react/number-input');
    expect(resultsPageSource).not.toMatch(/<input\b[^>]*\btype="number"/su);
  });

  it('uses the design-system Checkbox for the multi-blind whole-DNF control', () => {
    expect(resultsPageSource).toContain('@deweyou-design/react/checkbox');
    expect(resultsPageSource).not.toMatch(/<input\b[^>]*\btype="checkbox"/su);
  });
});

const scrambleImageMock = vi.hoisted(() => ({
  renderScrambleImage: vi.fn(
    (_eventId: string, scramble: string) =>
      `<svg data-rendered-scramble="true"><text>${scramble}</text></svg>`,
  ),
}));

vi.mock('@cubegin/scramble-image', () => ({
  renderScrambleImage: scrambleImageMock.renderScrambleImage,
}));

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

const setNarrowViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query === '(max-width: 860px)',
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
};

const createDistributionSolve = (
  elapsedMs: number,
  id: string,
  penalty: SolveRecord['penalty'] = 'none',
): SolveRecord => ({
  createdAt: 0,
  elapsedMs,
  eventId: '333',
  id,
  penalty,
  scramble: "R U R' U'",
  sessionId: 'distribution-test',
});

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
      children,
      className,
      label,
      style,
      value,
      onValueChange,
    }: {
      children: ReactNode;
      className?: string;
      label?: ReactNode;
      style?: CSSProperties;
      value?: string[];
      onValueChange?: (value: string[]) => void;
    }) => {
      const selectItems: ReactNode[] = [];

      Children.forEach(children, (child) => {
        if (!isValidElement(child) || child.type !== Content) return;

        const contentElement = child as ReactElement<{ children?: ReactNode }>;
        Children.forEach(contentElement.props.children, (contentChild) => {
          if (isValidElement(contentChild) && contentChild.type === Item) {
            selectItems.push(contentChild);
          }
        });
      });

      return (
        <div className={className} data-component-select-root="true" style={style}>
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
        </div>
      );
    },
    Trigger,
    Content,
    Item,
  };

  return { Select };
});

vi.mock('@deweyou-design/react/number-input', () => ({
  NumberInput: ({
    autoFocus,
    className,
    decrementLabel,
    disabled,
    error,
    incrementLabel,
    label,
    max,
    min,
    required,
    step = 1,
    value,
    onValueChange,
  }: {
    autoFocus?: boolean;
    className?: string;
    decrementLabel?: string;
    disabled?: boolean;
    error?: ReactNode;
    incrementLabel?: string;
    label?: ReactNode;
    max?: number;
    min?: number;
    required?: boolean;
    step?: number;
    value?: string;
    onValueChange?: (details: { value: string; valueAsNumber: number }) => void;
  }) => {
    const updateValue = (nextValue: string) =>
      onValueChange?.({ value: nextValue, valueAsNumber: Number(nextValue) });
    const stepValue = (direction: -1 | 1) => {
      const current = Number(value);
      updateValue(String((Number.isFinite(current) ? current : 0) + direction * step));
    };

    return (
      <div className={className} data-component-number-input="true">
        <label>
          {label}
          <button
            aria-label={decrementLabel}
            disabled={disabled}
            type="button"
            onClick={() => stepValue(-1)}
          >
            −
          </button>
          <input
            aria-label={typeof label === 'string' ? label : undefined}
            aria-invalid={Boolean(error)}
            autoFocus={autoFocus}
            disabled={disabled}
            max={max}
            min={min}
            required={required}
            step={step}
            type="number"
            value={value}
            onChange={(event) => updateValue(event.currentTarget.value)}
          />
          <button
            aria-label={incrementLabel}
            disabled={disabled}
            type="button"
            onClick={() => stepValue(1)}
          >
            +
          </button>
        </label>
        {error ? <p>{error}</p> : null}
      </div>
    );
  },
}));

vi.mock('@deweyou-design/react/checkbox', () => ({
  Checkbox: ({
    checked,
    children,
    className,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    children?: ReactNode;
    className?: string;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <label className={className} data-component-checkbox="true">
      <input
        checked={checked}
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
      />
      <span>{children}</span>
    </label>
  ),
}));

vi.mock('@deweyou-design/react/virtual-list', () => ({
  VirtualList: ({
    className,
    count,
    getItemKey,
    itemClassName,
    itemRole,
    renderItem,
    role,
  }: {
    className?: string;
    count: number;
    getItemKey?: (index: number) => string | number;
    itemClassName?: string;
    itemRole?: string | null;
    renderItem: (details: { index: number }) => ReactNode;
    role?: string;
  }) => (
    <div className={className} data-component-virtual-list="true" role={role}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={getItemKey?.(index) ?? index}
          className={itemClassName}
          role={itemRole ?? undefined}
        >
          {renderItem({ index })}
        </div>
      ))}
    </div>
  ),
}));

const SeedSolves = () => {
  const { activeList, addSolve, isLoading } = useTimerSessionStore();
  const didSeed = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (didSeed.current) return;
    didSeed.current = true;

    const elapsedTimes = [12003, 10521, 11037, 9884, 10301, 8423];

    void (async () => {
      for (const elapsedMs of elapsedTimes) {
        await addSolve({
          elapsedMs,
          eventId: activeList.scrambleTypeId,
          listId: activeList.id,
          penalty: 'none',
          scramble: "R U R' U'",
        });
      }
    })();
  }, [activeList.id, activeList.scrambleTypeId, addSolve, isLoading]);

  return null;
};

const SeedMultiBlindSolves = () => {
  const { activeList, addSolve, isLoading, setActiveListId } = useTimerSessionStore();
  const didSeed = useRef(false);

  useEffect(() => {
    if (isLoading || didSeed.current) return;
    if (activeList.scrambleTypeId !== '333mbld') {
      void setActiveListId('main-333mbld');
      return;
    }

    didSeed.current = true;
    void (async () => {
      await addSolve({
        elapsedMs: 2_430_999,
        eventId: '333mbld',
        listId: activeList.id,
        multiBlind: { attemptedCount: 5, solvedCount: 3, timePenaltyCount: 1 },
        penalty: 'none',
        scramble: ['1', '2', '3', '4', '5'],
      });
      await addSolve({
        elapsedMs: 1_800_999,
        eventId: '333mbld',
        listId: activeList.id,
        multiBlind: { attemptedCount: 7, solvedCount: 4, timePenaltyCount: 0 },
        penalty: 'none',
        scramble: ['1', '2', '3', '4', '5', '6', '7'],
      });
    })();
  }, [activeList.id, activeList.scrambleTypeId, addSolve, isLoading, setActiveListId]);

  return null;
};

const SeedFewestMovesSolves = () => {
  const { activeList, addSolve, isLoading, setActiveListId } = useTimerSessionStore();
  const didSeed = useRef(false);

  useEffect(() => {
    if (isLoading || didSeed.current) return;
    if (activeList.scrambleTypeId !== '333fm') {
      void setActiveListId('main-333fm');
      return;
    }

    didSeed.current = true;
    void (async () => {
      for (const [index, moveCount] of [27, 29, 31].entries()) {
        await addSolve({
          elapsedMs: 1_800_000 + index * 60_000,
          eventId: '333fm',
          fewestMoves: {
            attemptDurationMs: 1_800_000 + index * 60_000,
            executionMoveCount: moveCount,
            inverseScrambleReview: 'not-suspected',
            moveCount,
            normalizedSolution: "R U R'",
            rawSolution: "R U R'",
            rulesVersion: 'wca-2026-04-01',
            validationReason: null,
            validationStatus: 'valid',
          },
          listId: activeList.id,
          penalty: 'none',
          scramble: "R U R'",
        });
      }
    })();
  }, [activeList.id, activeList.scrambleTypeId, addSolve, isLoading, setActiveListId]);

  return null;
};

const renderResultsPage = ({
  fewestMoves = false,
  multiBlind = false,
  withSolves = true,
}: {
  fewestMoves?: boolean;
  multiBlind?: boolean;
  withSolves?: boolean;
} = {}) =>
  render(
    <AppPreferencesProvider>
      <TimerSessionStoreProvider db={createMemoryTimerSessionDb()}>
        <MemoryRouter initialEntries={['/results']}>
          {withSolves ? (
            fewestMoves ? (
              <SeedFewestMovesSolves />
            ) : multiBlind ? (
              <SeedMultiBlindSolves />
            ) : (
              <SeedSolves />
            )
          ) : null}
          <ResultsPage />
        </MemoryRouter>
      </TimerSessionStoreProvider>
    </AppPreferencesProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  setNavigatorLanguages(['zh-CN']);
  scrambleImageMock.renderScrambleImage.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  delete (window as { matchMedia?: Window['matchMedia'] }).matchMedia;
  delete document.documentElement.dataset.theme;
});

describe('ResultsPage', () => {
  it('includes every solve and aligned rolling averages in the trend chart', () => {
    const trendData = buildTrendChartData([
      ...Array.from({ length: 14 }, (_, index) =>
        createDistributionSolve(8_000 + index * 1_000, `trend-${index}`),
      ),
      createDistributionSolve(0, 'trend-dnf', 'dnf'),
    ]);

    expect(trendData).toHaveLength(15);
    expect(trendData[0]).toMatchObject({ sequenceLabel: '#1', singleMs: null });
    expect(trendData[1]).toMatchObject({ sequenceLabel: '#2', singleMs: 21_000 });
    expect(trendData.at(-1)).toMatchObject({ sequenceLabel: '#15', singleMs: 8_000 });

    const longTrendData = buildTrendChartData(
      Array.from({ length: 100 }, (_, index) =>
        createDistributionSolve(8_000 + index * 1_000, `long-trend-${index}`),
      ),
    );

    expect(longTrendData[3]).toMatchObject({ ao5Ms: null, ao12Ms: null, ao100Ms: null });
    expect(longTrendData[4]).toMatchObject({ ao5Ms: 105_000, ao12Ms: null, ao100Ms: null });
    expect(longTrendData[11]).toMatchObject({ ao5Ms: 98_000, ao12Ms: 101_500, ao100Ms: null });
    expect(longTrendData.at(-1)).toMatchObject({ ao5Ms: 10_000, ao12Ms: 13_500, ao100Ms: 57_500 });
  });

  it('uses the visible trend series to trim unused vertical chart space', () => {
    const data = [
      { sequenceLabel: '#1', singleMs: 8_005, ao5Ms: 10_000, ao12Ms: null, ao100Ms: null },
      { sequenceLabel: '#2', singleMs: 28_903, ao5Ms: 12_000, ao12Ms: null, ao100Ms: null },
    ];

    expect(buildTrendYAxisDomain(data, ['singleMs'])).toEqual([6_700, 30_300]);
    expect(buildTrendYAxisDomain(data, ['ao5Ms'])).toEqual([9_700, 12_300]);
  });

  it('uses nice time buckets and omits buckets without solves', () => {
    const oneSecondBuckets = buildDistributionChartData([
      createDistributionSolve(8_005, 'short-1'),
      createDistributionSolve(8_724, 'short-2'),
      createDistributionSolve(28_903, 'short-3'),
    ]);

    expect(oneSecondBuckets).toHaveLength(2);
    expect(oneSecondBuckets[0]).toMatchObject({ count: 2, rangeLabel: '8s - 9s', tickLabel: '8' });
    expect(oneSecondBuckets.at(-1)).toMatchObject({ count: 1, tickLabel: '28' });

    const widerBuckets = buildDistributionChartData([
      createDistributionSolve(75_001, 'wide-1'),
      createDistributionSolve(170_001, 'wide-2'),
    ]);

    expect(widerBuckets).toHaveLength(2);
    expect(widerBuckets[0]).toMatchObject({ tickLabel: '1:15' });
    expect(widerBuckets.at(-1)).toMatchObject({ tickLabel: '2:50' });

    const cappedBuckets = buildDistributionChartData([
      createDistributionSolve(0, 'capped-1'),
      createDistributionSolve(600_001, 'capped-2'),
    ]);

    expect(cappedBuckets).toHaveLength(2);
    expect(cappedBuckets.at(-1)).toMatchObject({ count: 1, tickLabel: '10:00' });
  });

  it('formats previous solve dates with compact slashed dates', () => {
    expect(
      formatSolveCreatedAt(
        new Date(2026, 6, 9, 22, 22).getTime(),
        new Date(2026, 6, 10, 9, 30).getTime(),
      ),
    ).toBe('07/09 22:22');
    expect(
      formatSolveCreatedAt(
        new Date(2025, 6, 9, 22, 22).getTime(),
        new Date(2026, 6, 10, 9, 30).getTime(),
      ),
    ).toBe('2025/07/09 22:22');
  });

  it('renders the simplified score surface with a unified score switch', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 6, 9, 15, 56).getTime());

    renderResultsPage();

    expect(screen.getByRole('heading', { name: '成绩列表' })).toBeTruthy();
    expect(screen.queryByText('3x3x3 · 3x3x3 · 6')).toBeNull();
    expect(screen.getByRole('tablist', { name: '成绩列表' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '成绩' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: '统计' }).getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('combobox', { name: '成绩类型' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: '统计视图' })).toBeNull();
    expect(screen.getByRole('group', { name: '成绩列表' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: '切换列表' })).toBeTruthy();

    const table = await screen.findByRole('table', { name: '成绩明细' });
    await within(table).findByText('#6');
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent);

    expect(headers).toEqual(['#', '成绩', 'ao5', 'ao12', '创建时间']);
    expect(within(table).getByText('8.423')).toBeTruthy();
    const newestRowCells = within(table)
      .getByText('#6')
      .closest('[role="row"]')
      ?.querySelectorAll('[role="cell"]');

    expect([...(newestRowCells ?? [])].map((cell) => cell.textContent)).toEqual([
      '#6',
      '8.423',
      '10.235',
      '--',
      '15:56',
    ]);
    expect(
      within(table)
        .getByText('#6')
        .closest('[role="row"]')
        ?.querySelectorAll('[role="cell"]')[1]
        ?.getAttribute('data-emphasis'),
    ).toBe('best');
    expect(
      within(table)
        .getByText('#1')
        .closest('[role="row"]')
        ?.querySelectorAll('[role="cell"]')[1]
        ?.getAttribute('data-emphasis'),
    ).toBe('worst');
    expect(table.querySelector('[data-component-virtual-list="true"]')).toBeTruthy();
    expect(within(table).queryByText('打乱')).toBeNull();
    expect(within(table).queryByText('处罚')).toBeNull();
  });

  it('specializes FMC rows, detail, and overview statistics around moves', async () => {
    renderResultsPage({ fewestMoves: true });

    const table = await screen.findByRole('table', { name: '成绩明细' });
    await within(table).findByText('#3');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['#', '步数', 'Mean of 3', '用时', '创建时间']);
    expect(within(table).getByText('29.00')).toBeTruthy();
    expect(within(table).getByText('32:00.000')).toBeTruthy();

    const detail = screen.getByRole('complementary', { name: '成绩详情' });
    expect(within(detail).getByText('31')).toBeTruthy();
    expect(within(detail).getAllByText("R U R'").length).toBeGreaterThan(0);
    expect(within(detail).queryByRole('button', { name: '+2' })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: '统计' }));
    expect(await screen.findByText('最佳 Mean')).toBeTruthy();
    expect(screen.getAllByText('29.00')).toHaveLength(2);
    expect(screen.queryByText('时间分布')).toBeNull();
  });

  it('shows the solve creation time and copies its scramble from the detail panel', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 6, 9, 15, 56).getTime());
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderResultsPage();

    const detailPanel = await screen.findByRole('complementary', { name: '成绩详情' });
    expect(within(detailPanel).getByText('创建时间')).toBeTruthy();
    expect(within(detailPanel).getByText('2026/07/09 15:56')).toBeTruthy();

    fireEvent.click(within(detailPanel).getByRole('button', { name: '复制打乱' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("R U R' U'");
    });
    expect(await within(detailPanel).findByRole('button', { name: '已复制打乱' })).toBeTruthy();
  });

  it('restores the copy scramble button after the copied acknowledgement', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderResultsPage();

    const detailPanel = await screen.findByRole('complementary', { name: '成绩详情' });
    vi.useFakeTimers();

    try {
      fireEvent.click(within(detailPanel).getByRole('button', { name: '复制打乱' }));
      await vi.advanceTimersByTimeAsync(0);

      expect(writeText).toHaveBeenCalledWith("R U R' U'");
      expect(within(detailPanel).getByRole('button', { name: '已复制打乱' })).toBeTruthy();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1600);
      });

      expect(within(detailPanel).getByRole('button', { name: '复制打乱' })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides the created time column on small screens', () => {
    expect(resultsPageStyles).toMatch(
      /@container\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.singleScoreTable \.scoreTableHeader \[role='columnheader'\]:nth-child\(5\),\s*\.singleScoreTable \.scoreTableRow \[role='cell'\]:nth-child\(5\)\s*\{[\s\S]*display:\s*none;/u,
    );
  });

  it('keeps mobile score list typography compact and consistent', () => {
    expect(resultsPageStyles).toMatch(
      /\.rowButton\s*\{[^}]*font-size:\s*inherit;[^}]*font-weight:\s*680;/su,
    );
    expect(resultsPageStyles).not.toMatch(/\.rowButton\s*\{[^}]*font-size:\s*1rem;/su);
    expect(resultsPageStyles).toMatch(
      /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*\.modeTab\s*\{[^}]*font-size:\s*0\.9rem;/u,
    );
    expect(resultsPageStyles).toMatch(
      /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*\.viewTypeTrigger\s*\{[^}]*font-size:\s*0\.82rem;[^}]*height:\s*44px;/u,
    );
    expect(resultsPageStyles).toMatch(
      /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*\.scoreTableHeader \[role='columnheader'\],\s*\.scoreTableRow \[role='cell'\]\s*\{[^}]*font-size:\s*0\.84rem;[^}]*height:\s*44px;/u,
    );
    expect(resultsPageStyles).toMatch(
      /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*\.scoreTableHeader \[role='columnheader'\]\s*\{[^}]*font-size:\s*0\.72rem;/u,
    );
    expect(resultsPageStyles).toMatch(
      /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*\.singleScoreTable\s*\{[^}]*minmax\(72px,\s*0\.9fr\)[\s\S]*minmax\(96px,\s*1\.6fr\);/u,
    );
    expect(resultsPageStyles).not.toMatch(/\.rowButton\s*\{[^}]*font-size:\s*0\.9rem;/su);
  });

  it('uses a simple full-page placeholder when the active list has no solves', async () => {
    renderResultsPage({ withSolves: false });

    const emptyPlaceholder = await screen.findByLabelText('暂无成绩');

    expect(within(emptyPlaceholder).getByRole('heading', { name: '暂无成绩' })).toBeTruthy();
    expect(within(emptyPlaceholder).getByText('先完成一次计时，或在右上角切换列表。')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('group', { name: '成绩列表' })).toBeNull();
  });

  it('switches the score dropdown to an average list without adding another select', async () => {
    renderResultsPage();

    await screen.findByRole('table', { name: '成绩明细' });
    await screen.findByText('#6');
    fireEvent.change(screen.getByRole('combobox', { name: '成绩类型' }), {
      target: { value: 'ao5' },
    });

    const table = await screen.findByRole('table', { name: '平均成绩明细' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent);

    expect(headers).toEqual(['范围', 'ao5', '组成']);
    expect(within(table).getByText('2-6')).toBeTruthy();
    expect(within(table).getByText('10.235')).toBeTruthy();
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
  });

  it('shows a wide detail preview with penalty controls and a delete icon button', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderResultsPage();

    await screen.findByText('#6');
    expect(await screen.findByRole('complementary', { name: '成绩详情' })).toBeTruthy();

    const detail = screen.getByRole('complementary', { name: '成绩详情' });
    const toolbar = within(detail).getByRole('toolbar', { name: '成绩操作' });

    expect(within(toolbar).getByRole('button', { name: '无' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: '+2' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'DNF' })).toBeTruthy();
    const deleteButton = within(toolbar).getByRole('button', { name: '删除成绩' });

    expect(deleteButton.textContent).toBe('');
    expect(
      deleteButton.querySelector(
        'path[d="M6.5 7 7.4 19.3A2 2 0 0 0 9.4 21h5.2a2 2 0 0 0 2-1.7L17.5 7"]',
      ),
    ).not.toBeNull();
    expect(within(detail).queryByText(/#6/u)).toBeNull();
    expect(within(detail).queryByText(/3x3x3 · 3x3x3/u)).toBeNull();
    expect(within(detail).getAllByText("R U R' U'").length).toBeGreaterThan(0);
    expect(within(detail).getByLabelText('scramble').getAttribute('data-event')).toBe('333');

    fireEvent.click(within(toolbar).getByRole('button', { name: 'DNF' }));

    await waitFor(() => expect(within(detail).getAllByText('DNF').length).toBeGreaterThan(0));

    fireEvent.click(within(toolbar).getByRole('button', { name: '删除成绩' }));

    expect(confirmSpy).not.toHaveBeenCalled();

    const deleteDialog = await screen.findByRole('dialog', { name: '删除本次成绩' });
    const confirmDeleteButton = within(deleteDialog).getByRole('button', { name: '删除' });

    expect(within(deleteDialog).getByText('删除后不可恢复。')).toBeTruthy();
    expect(within(deleteDialog).queryByRole('checkbox')).toBeNull();
    expect((confirmDeleteButton as HTMLButtonElement).disabled).toBe(false);
    expect(resultsPageStyles).toMatch(/\.deleteConfirmBackdrop\s*\{[^}]*place-items:\s*center;/su);
    expect(resultsPageStyles).toMatch(/\.deleteConfirmTitle\s*\{[^}]*font-size:\s*1\.16rem;/su);

    fireEvent.click(confirmDeleteButton);

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '删除本次成绩' })).toBeNull());
    await waitFor(() => expect(screen.queryByText('#6')).toBeNull());
  });

  it('opens a solve detail sheet from the score row on narrow screens', async () => {
    setNarrowViewport();
    renderResultsPage();

    const table = await screen.findByRole('table', { name: '成绩明细' });
    await within(table).findByText('#6');

    fireEvent.click(within(table).getByRole('button', { name: '8.423' }));

    const dialog = await screen.findByRole('dialog');
    const closeButton = within(dialog).getByRole('button', { name: '关闭详情' });

    expect(within(dialog).getByRole('complementary', { name: '成绩详情' })).toBeTruthy();
    expect(closeButton.textContent).toBe('');

    fireEvent.click(dialog);

    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.click(dialog.parentElement as HTMLElement);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(within(table).getByRole('button', { name: '8.423' }));
    await screen.findByRole('dialog');

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '关闭详情' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('switches between separately selectable statistics views', async () => {
    renderResultsPage();

    await screen.findByRole('table', { name: '成绩明细' });
    await screen.findByText('#6');
    fireEvent.click(screen.getByRole('tab', { name: '统计' }));
    const statsViewSelect = screen.getByRole('combobox', { name: '统计视图' });

    const statsRegion = screen.getByRole('region', { name: '统计' });

    expect(within(statsRegion).getByText('总数')).toBeTruthy();
    expect(within(statsRegion).getByText('有效成绩')).toBeTruthy();
    expect(within(statsRegion).getByText('有效占比')).toBeTruthy();
    expect(within(statsRegion).getByText('最佳单次')).toBeTruthy();
    expect(within(statsRegion).getByText('最差单次')).toBeTruthy();
    expect(within(statsRegion).getByText('总平均')).toBeTruthy();
    expect(within(statsRegion).getByText('平均成绩')).toBeTruthy();
    expect(within(statsRegion).getByText('mo3')).toBeTruthy();
    expect(within(statsRegion).getByText('ao5')).toBeTruthy();
    expect(within(statsRegion).queryByText('ao12')).toBeNull();
    expect(within(statsRegion).getAllByLabelText(/标准差/u)).toHaveLength(4);
    expect(within(statsRegion).queryByRole('img')).toBeNull();

    fireEvent.change(statsViewSelect, { target: { value: 'distribution' } });

    expect(within(statsRegion).getByRole('img', { name: '时间分布' })).toBeTruthy();
    expect(within(statsRegion).queryByText('总数')).toBeNull();
    expect(within(statsRegion).queryByRole('img', { name: '折线图' })).toBeNull();

    fireEvent.change(statsViewSelect, { target: { value: 'trend' } });

    expect(within(statsRegion).getByRole('img', { name: '折线图' })).toBeTruthy();
    const singleTrendButton = within(statsRegion).getByRole('button', { name: '单次' });
    const ao5TrendButton = within(statsRegion).getByRole('button', { name: 'ao5' });
    const ao12TrendButton = within(statsRegion).getByRole('button', { name: 'ao12' });
    const ao100TrendButton = within(statsRegion).getByRole('button', { name: 'ao100' });

    expect(singleTrendButton.getAttribute('aria-pressed')).toBe('true');
    expect(ao5TrendButton.getAttribute('aria-pressed')).toBe('true');
    expect(ao12TrendButton.getAttribute('aria-pressed')).toBe('true');
    expect(ao100TrendButton.getAttribute('aria-pressed')).toBe('true');
    expect(within(statsRegion).queryByRole('button', { name: '全部' })).toBeNull();

    fireEvent.click(ao5TrendButton);

    expect(ao5TrendButton.getAttribute('aria-pressed')).toBe('false');
    expect(singleTrendButton.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(singleTrendButton);
    fireEvent.click(ao12TrendButton);
    fireEvent.click(ao100TrendButton);

    expect(ao100TrendButton.getAttribute('aria-pressed')).toBe('true');
    expect(within(statsRegion).queryByRole('img', { name: '时间分布' })).toBeNull();
  });

  it('specializes multi-blind score rows and statistics without averages', async () => {
    renderResultsPage({ multiBlind: true });

    const table = await screen.findByRole('table', { name: '成绩明细' });
    await within(table).findByText('4/7 30:00');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['#', '成绩', '分数', '失败数量', '创建时间']);
    expect(within(table).getByText('3/5 40:32')).toBeTruthy();
    expect(
      screen.getByRole('combobox', { name: '成绩类型' }).querySelectorAll('option'),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '编辑成绩' }));
    const editDialog = screen.getByRole('dialog', { name: '多盲成绩' });
    expect(within(editDialog).queryByText('魔方数量')).toBeNull();
    const solvedCountInput = within(editDialog).getByRole('spinbutton', {
      name: '成功数量',
    }) as HTMLInputElement;
    const penaltyCountInput = within(editDialog).getByRole('spinbutton', {
      name: '累计 +2',
    }) as HTMLInputElement;
    const saveButton = within(editDialog).getByRole('button', { name: '保存' });
    const wholeDnfCheckbox = within(editDialog).getByRole('checkbox', { name: '整次 DNF' });

    expect(solvedCountInput.max).toBe('7');
    expect(penaltyCountInput.max).toBe('4');
    expect(wholeDnfCheckbox.closest('[data-component-checkbox]')).not.toBeNull();
    fireEvent.click(wholeDnfCheckbox);
    expect(solvedCountInput.disabled).toBe(true);
    expect(penaltyCountInput.disabled).toBe(true);
    expect(solvedCountInput.required).toBe(false);
    expect(penaltyCountInput.required).toBe(false);
    expect(saveButton.hasAttribute('disabled')).toBe(false);
    expect(solvedCountInput.value).toBe('4');
    expect(penaltyCountInput.value).toBe('0');
    fireEvent.click(wholeDnfCheckbox);
    expect(solvedCountInput.disabled).toBe(false);
    expect(penaltyCountInput.disabled).toBe(false);
    fireEvent.change(solvedCountInput, { target: { value: '8' } });
    expect(within(editDialog).getByText('成功数量需为 0–7 的整数。')).toBeTruthy();
    expect(saveButton.hasAttribute('disabled')).toBe(true);

    fireEvent.change(solvedCountInput, {
      target: { value: '5' },
    });
    fireEvent.change(penaltyCountInput, { target: { value: '6' } });
    expect(within(editDialog).getByText('累计 +2 需为 0–5 的整数。')).toBeTruthy();
    expect(saveButton.hasAttribute('disabled')).toBe(true);

    fireEvent.change(penaltyCountInput, { target: { value: '0' } });
    fireEvent.click(saveButton);
    await within(table).findByText('5/7 30:00');

    fireEvent.click(screen.getByRole('tab', { name: '统计' }));
    const stats = screen.getByRole('region', { name: '统计' });
    expect(within(stats).getByText('最佳成绩')).toBeTruthy();
    expect(within(stats).getByText('5/7 30:00')).toBeTruthy();
    expect(within(stats).getByText('最高分')).toBeTruthy();
    expect(within(stats).queryByText('总平均')).toBeNull();
    expect(within(stats).queryByText('平均成绩')).toBeNull();
    expect(
      screen.getByRole('combobox', { name: '统计视图' }).querySelectorAll('option'),
    ).toHaveLength(1);
  });

  it('returns to the score list when activating the score type control from statistics', async () => {
    renderResultsPage();

    await screen.findByRole('table', { name: '成绩明细' });
    fireEvent.click(screen.getByRole('tab', { name: '统计' }));

    expect(screen.getByRole('region', { name: '统计' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: '成绩' }));

    await waitFor(() => expect(screen.getByRole('table', { name: '成绩明细' })).toBeTruthy());
    expect(screen.queryByRole('region', { name: '统计' })).toBeNull();
  });

  it('updates labels and navigation in English', async () => {
    localStorage.setItem(
      'cubegin-app-preferences',
      JSON.stringify({ ...DEFAULT_APP_PREFERENCES, language: 'en' }),
    );

    renderResultsPage({ withSolves: false });

    const emptyPlaceholder = await screen.findByLabelText('No solves yet');

    expect(within(emptyPlaceholder).getByRole('heading', { name: 'No solves yet' })).toBeTruthy();
    expect(
      within(emptyPlaceholder).getByText('Complete a solve, or switch lists in the top right.'),
    ).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Score type' })).toBeNull();
    expect(
      within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByRole('button', {
        name: 'Results',
      }),
    ).toBeTruthy();
  });

  it('keeps the results layout independently scrollable and mobile-safe', () => {
    expect(resultsPageStyles).toMatch(/\.root\s*\{[^}]*overflow: hidden;/su);
    expect(resultsPageStyles).toMatch(/\.root\s*\{[^}]*height:\s*100dvh;/su);
    expect(resultsPageStyles).toMatch(/\.body\s*\{[^}]*overflow: auto;/su);
    expect(resultsPageStyles).toMatch(/\.content\s*\{[^}]*grid-template-columns:/su);
    expect(resultsPageStyles).toMatch(
      /\.contentEmpty\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.contentEmpty\s*\{[^}]*min-height:\s*calc\(\s*100dvh - var\(--results-header-height\) - var\(--results-nav-zone-height\) - 26px\s*\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.contentWithoutDetail\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /@media \(min-width: 861px\)\s*\{[^}]*\.bodyWithDetail\s*\{[^}]*overflow:\s*hidden;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.contentWithDetail\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\);[^}]*height:\s*100%;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.contentWithDetail \.listPane\s*\{[^}]*align-self:\s*stretch;[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\);[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.contentWithDetail \.scoreTable\s*\{[^}]*align-self:\s*stretch;[^}]*height:\s*100%;[^}]*min-height:\s*0;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.contentWithDetail \.detailPanel\s*\{[^}]*align-content:\s*start;[^}]*align-self:\s*start;[^}]*gap:\s*12px;[^}]*max-height:\s*100%;[^}]*min-height:\s*0;[^}]*overflow:\s*auto;[^}]*overscroll-behavior:\s*contain;[^}]*padding:\s*12px;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.contentWithDetail \.scrambleBlock\[data-event='666'\] p,\s*\.contentWithDetail \.scrambleBlock\[data-event='777'\] p\s*\{[^}]*font-size:\s*0\.8rem;[^}]*line-height:\s*1\.36;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.contentWithDetail \.scrambleImageSlot :global\(\[data-event='666'\]\),\s*\.contentWithDetail \.scrambleImageSlot :global\(\[data-event='777'\]\)\s*\{[^}]*width:\s*min\(100%,\s*240px\);/su,
    );
    expect(resultsPageStyles).toMatch(/\.resultsHeader\s*\{[^}]*grid-column:\s*1 \/ -1;/su);
    expect(resultsPageStyles).not.toMatch(/\.titleRow/u);
    expect(resultsPageStyles).toMatch(/\.listPane\s*\{[^}]*align-content:\s*start;/su);
    expect(resultsPageStyles).toMatch(/\.listPane\s*\{[^}]*align-self:\s*start;/su);
    expect(resultsPageStyles).toMatch(/\.scoreTable\s*\{[^}]*align-self:\s*start;/su);
    expect(resultsPageStyles).toMatch(
      /\.scoreTable\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*auto minmax\(0,\s*1fr\);[^}]*min-height:\s*0;/su,
    );
    expect(resultsPageStyles).toMatch(/\.virtualScoreList\s*\{[^}]*min-height:\s*0;/su);
    expect(resultsPageSource).not.toMatch(/scrollElement=/u);
    expect(resultsPageStyles).toMatch(
      /\.scoreTableRow\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*var\(--score-table-columns\);/su,
    );
    expect(resultsPageStyles).not.toMatch(/\.scoreTableHeader,\s*\.scoreTableRow\s*\{/su);
    expect(resultsPageStyles).toMatch(
      /\.scoreTableHeader \[role='columnheader'\],\s*\.scoreTableRow \[role='cell'\]\s*\{[^}]*height:\s*48px;/su,
    );
    expect(resultsPageStyles).toMatch(/\.detailPanel\s*\{[^}]*display: grid;/su);
    expect(resultsPageStyles).toMatch(/\.scrambleImageSlot\s*\{[^}]*overflow:\s*visible;/su);
    expect(resultsPageStyles).toMatch(
      /\.scrambleImageSlot :global\(\[data-scramble-image\]\)\s*\{[^}]*max-width:\s*100%;[^}]*width:\s*min\(100%,\s*360px\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.scrambleImageSlot :global\(\[data-scramble-image\] svg\)\s*\{[^}]*height:\s*auto;[^}]*max-width:\s*100%;[^}]*width:\s*100%;/su,
    );
    expect(resultsPageStyles).toMatch(/\.emptyResultsPlaceholder\s*\{[^}]*min-height:\s*100%;/su);
    expect(resultsPageStyles).toMatch(
      /\.emptyResultsPlaceholder\s*\{[^}]*align-content:\s*center;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.emptyResultsPlaceholder\s*\{[^}]*padding:\s*0 16px clamp\(64px,\s*10vh,\s*128px\);/su,
    );
    expect(resultsPageStyles).not.toMatch(/\.emptyResultsPlaceholder\s*\{[^}]*transform:/su);
    expect(resultsPageStyles).toMatch(
      /\.emptyResultsPlaceholder h1\s*\{[^}]*font-size:\s*clamp\(1\.55rem,\s*2\.2vw,\s*1\.85rem\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.emptyResultsPlaceholder p\s*\{[^}]*max-width:\s*min\(460px,\s*calc\(100vw - 48px\)\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.emptyResultsPlaceholder p\s*\{[^}]*white-space:\s*nowrap;/su,
    );
    expect(resultsPageStyles).toMatch(
      /@media \(max-width: 420px\)\s*\{[^}]*\.emptyResultsPlaceholder p\s*\{[^}]*white-space:\s*normal;/su,
    );
    expect(resultsPageStyles).not.toMatch(/\.emptyResultsIcon/u);
    expect(resultsPageStyles).not.toMatch(/\.emptyResultsText/u);
    expect(resultsPageStyles).not.toMatch(/\.resultsHeader p/u);
    expect(resultsPageStyles).toMatch(
      /\.resultsViewBar\s*\{[^}]*border-bottom:\s*1px solid color-mix\([^}]*display:\s*flex;/su,
    );
    expect(resultsPageStyles).toMatch(/\.scoreSwitch\s*\{[^}]*margin-left:\s*auto;/su);
    expect(resultsPageStyles).toMatch(
      /\.modeTabs\s*\{[^}]*align-self:\s*stretch;[^}]*display:\s*flex;[^}]*min-height:\s*44px;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.modeTab\s*\{[^}]*background:\s*transparent;[^}]*border:\s*0;[^}]*border-bottom:\s*2px solid transparent;[^}]*margin-bottom:\s*-1px;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.modeTab\s*\{[^}]*font-family:\s*var\(--ui-font-serif\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.modeTab\[data-active='true'\]\s*\{[^}]*color:\s*var\(--ui-color-text\);[^}]*font-weight:\s*680;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.modeTab\[data-active='true'\]\s*\{[^}]*border-bottom-color:\s*var\(--ui-color-brand-text\);[^}]*color:\s*var\(--ui-color-text\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.scoreTableRow \[role='cell'\]\[data-emphasis='best'\],\s*\.scoreTableRow \[role='cell'\]\[data-emphasis='best'\] \.rowButton\s*\{[^}]*color:\s*color-mix\(in srgb,\s*#1eb877 76%,\s*var\(--ui-color-text\)\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.scoreTableRow \[role='cell'\]\[data-emphasis='worst'\],\s*\.scoreTableRow \[role='cell'\]\[data-emphasis='worst'\] \.rowButton\s*\{[^}]*color:\s*color-mix\(in srgb,\s*var\(--ui-color-danger-text\) 80%,\s*var\(--ui-color-text\)\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.modeTab:hover\s*\{[^}]*color:\s*color-mix\(in srgb, var\(--ui-color-text\) 88%, transparent\);/su,
    );
    expect(resultsPageStyles).not.toMatch(/\.modeTab:hover\s*\{[^}]*background:/su);
    expect(resultsPageStyles).toMatch(
      /\.viewTypeTrigger\s*\{[^}]*background:\s*transparent;[^}]*border:\s*0;[^}]*font-size:\s*0\.84rem;[^}]*height:\s*40px;[^}]*justify-content:\s*flex-end;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.viewTypeTrigger:hover\s*\{[^}]*color:\s*var\(--ui-color-text\);/su,
    );
    expect(resultsPageStyles).not.toMatch(/\.viewTypeTrigger:hover\s*\{[^}]*background:/su);
    expect(resultsPageStyles).not.toMatch(/\.scoreTypeControl/u);
    expect(resultsPageStyles).not.toMatch(/\.statsViewControl/u);
    expect(resultsPageStyles).toMatch(/\.scoreTable\s*\{[^}]*min-width:\s*0;/su);
    expect(resultsPageStyles).toMatch(
      /\.scoreTable\s*\{[^}]*background:\s*transparent;[^}]*border:\s*0;[^}]*box-shadow:\s*none;/su,
    );
    expect(resultsPageStyles).toMatch(/\.listPane\s*\{[^}]*container-type:\s*inline-size;/su);
    expect(resultsPageStyles).toMatch(
      /\.scoreTableHeader \[role='columnheader'\],\s*\.scoreTableRow \[role='cell'\]\s*\{[^}]*white-space:\s*nowrap;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.singleScoreTable\s*\{[^}]*minmax\(80px,\s*0\.9fr\)[\s\S]*minmax\(120px,\s*1\.8fr\);/u,
    );
    expect(resultsPageStyles).toMatch(/\.virtualScoreList\s*\{[^}]*min-width:\s*0;/su);
    expect(resultsPageStyles).toMatch(/\.virtualScoreListItem\s*\{[^}]*cursor:\s*pointer;/su);
    expect(resultsPageStyles).toMatch(/@media \(max-width: 860px\)/u);
    expect(resultsPageStyles).toMatch(/\.detailSheetBackdrop\s*\{[^}]*place-items:\s*center;/su);
    expect(resultsPageStyles).toMatch(/\.detailSheet\s*\{[^}]*align-self:\s*center;/su);
    expect(resultsPageStyles).toMatch(/\.detailSheet\s*\{[^}]*margin:\s*0 auto;/su);
    expect(resultsPageStyles).not.toMatch(/\.detailSheet\s*\{[^}]*align-self:\s*end;/su);
    expect(resultsPageStyles).not.toMatch(/\.detailSheet\s*\{[^}]*margin:\s*auto auto 0;/su);
  });

  it('keeps the mobile solve detail modal compact and image-focused', () => {
    expect(resultsPageStyles).toMatch(
      /\.detailSheet\s*\{[^}]*width:\s*min\(560px,\s*calc\(100vw - 32px\)\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.detailSheet \.detailPanel\s*\{[^}]*box-shadow:\s*0 18px 54px color-mix\(in srgb,\s*var\(--ui-color-text\) 10%,\s*transparent\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.detailSheet \.detailKicker\s*\{[^}]*font-size:\s*0\.82rem;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.detailSheet \.detailKicker\s*\{[^}]*font-weight:\s*680;/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.detailSheet \.scrambleBlock\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--ui-color-canvas\) 42%,\s*transparent\);/su,
    );
    expect(resultsPageStyles).toMatch(
      /\.detailSheet \.scrambleImageSlot svg\s*\{[^}]*width:\s*min\(360px,\s*72vw\);/su,
    );
  });
});
