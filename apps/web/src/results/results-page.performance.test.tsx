import { fireEvent, render, screen, within } from '@testing-library/react';
import { Children, isValidElement, type CSSProperties, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppPreferencesProvider } from '../preferences/app-preferences';
import {
  createPerformancePreviewTimerSessionDb,
  PERFORMANCE_PREVIEW_SOLVE_COUNT,
} from '../timer-session/performance-preview-db';
import { TimerSessionStoreProvider } from '../timer-session/timer-session-store';
import { ResultsPage } from './results-page';

const PERFORMANCE_TEST_TIMEOUT = 30_000;
const VIRTUAL_VIEWPORT_ROW_COUNT = 24;
const PERFORMANCE_NOW = new Date(2026, 6, 10, 12, 0).getTime();

const scrambleImageMock = vi.hoisted(() => ({
  renderScrambleImage: vi.fn(
    (_eventId: string, scramble: string) =>
      `<svg data-rendered-scramble="true"><text>${scramble}</text></svg>`,
  ),
}));

vi.mock('@cubegin/scramble-image', () => ({
  renderScrambleImage: scrambleImageMock.renderScrambleImage,
}));

vi.mock('@deweyou-design/react/select', () => {
  const Trigger = () => null;
  const Content = ({ children }: { children: ReactNode }) => <>{children}</>;
  const Item = ({ label, value }: { label: string; value: string }) => <option value={value}>{label}</option>;

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
      const items: ReactNode[] = [];

      Children.forEach(children, (child) => {
        if (!isValidElement(child) || child.type !== Content) return;
        Children.forEach(child.props.children, (contentChild) => {
          if (isValidElement(contentChild) && contentChild.type === Item) items.push(contentChild);
        });
      });

      return (
        <label className={className} style={style}>
          {label}
          <select
            aria-label={typeof label === 'string' ? label : undefined}
            value={value?.[0] ?? ''}
            onChange={(event) => onValueChange?.([event.target.value])}
          >
            {items}
          </select>
        </label>
      );
    },
    Trigger,
    Content,
    Item,
  };

  return { Select };
});

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
      {Array.from({ length: Math.min(count, VIRTUAL_VIEWPORT_ROW_COUNT) }, (_, index) => (
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

const renderPerformanceResultsPage = () =>
  render(
    <AppPreferencesProvider>
      <TimerSessionStoreProvider db={createPerformancePreviewTimerSessionDb()}>
        <MemoryRouter initialEntries={['/results']}>
          <ResultsPage />
        </MemoryRouter>
      </TimerSessionStoreProvider>
    </AppPreferencesProvider>,
  );

const formatDuration = (durationMs: number) => `${durationMs.toFixed(1)}ms`;

const describePerformance = process.env.RUN_RESULTS_PERFORMANCE === '1' ? describe : describe.skip;

describePerformance('ResultsPage performance', () => {
  const originalNavigatorLanguage = window.navigator.language;
  const originalNavigatorLanguages = window.navigator.languages;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: originalNavigatorLanguage,
    });
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: originalNavigatorLanguages,
    });
  });

  it('keeps the 12,000-solve list virtual and charts responsive', async () => {
    Object.defineProperty(window.navigator, 'language', { configurable: true, value: 'zh-CN' });
    Object.defineProperty(window.navigator, 'languages', { configurable: true, value: ['zh-CN'] });
    vi.spyOn(Date, 'now').mockReturnValue(PERFORMANCE_NOW);

    const scoresStartedAt = performance.now();
    renderPerformanceResultsPage();

    const table = await screen.findByRole('table', { name: '成绩明细' }, { timeout: 10_000 });
    await within(table).findByText('#12000', {}, { timeout: 10_000 });
    const scoresDuration = performance.now() - scoresStartedAt;
    const renderedRowCount = table.querySelectorAll('[data-component-virtual-list="true"] > *').length;
    console.info(
      `[results-performance] scores solves=${PERFORMANCE_PREVIEW_SOLVE_COUNT} renderedRows=${renderedRowCount} duration=${formatDuration(scoresDuration)}`,
    );

    const overviewStartedAt = performance.now();
    fireEvent.click(screen.getByRole('tab', { name: '统计' }));
    const statsRegion = await screen.findByRole('region', { name: '统计' }, { timeout: 10_000 });
    await within(statsRegion).findByText('总平均', {}, { timeout: 10_000 });
    const overviewDuration = performance.now() - overviewStartedAt;
    console.info(`[results-performance] overview duration=${formatDuration(overviewDuration)}`);

    const statisticsView = screen.getByRole('combobox', { name: '统计视图' });

    const distributionStartedAt = performance.now();
    fireEvent.change(statisticsView, { target: { value: 'distribution' } });
    await within(statsRegion).findByRole('img', { name: '时间分布' }, { timeout: 10_000 });
    const distributionDuration = performance.now() - distributionStartedAt;
    console.info(`[results-performance] distribution duration=${formatDuration(distributionDuration)}`);

    const trendStartedAt = performance.now();
    fireEvent.change(statisticsView, { target: { value: 'trend' } });
    await within(statsRegion).findByRole('img', { name: '折线图' }, { timeout: 10_000 });
    const trendDuration = performance.now() - trendStartedAt;
    console.info(`[results-performance] trend duration=${formatDuration(trendDuration)}`);

    console.info(
      `[results-performance] solves=${PERFORMANCE_PREVIEW_SOLVE_COUNT} renderedRows=${renderedRowCount} scores=${formatDuration(scoresDuration)} overview=${formatDuration(overviewDuration)} distribution=${formatDuration(distributionDuration)} trend=${formatDuration(trendDuration)}`,
    );

    expect(renderedRowCount).toBe(VIRTUAL_VIEWPORT_ROW_COUNT);
    expect(scoresDuration).toBeLessThan(2_500);
    expect(overviewDuration).toBeLessThan(5_000);
    expect(distributionDuration).toBeLessThan(1_500);
    expect(trendDuration).toBeLessThan(1_500);
  }, PERFORMANCE_TEST_TIMEOUT);
});
