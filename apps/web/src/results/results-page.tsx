import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import { CubeginAnimatedIcon } from '@cubegin/icons/react';
import { renderScrambleImage } from '@cubegin/scramble-image';
import {
  calculateMultiBlindStatistics,
  calculateFewestMovesStatistics,
  calculateRollingAverageWindows,
  calculateSolveStatistics,
  formatMultiBlindAttempt,
  formatMultiBlindSolve,
  formatFewestMovesMean,
  formatFewestMovesSolve,
  formatMilliseconds,
  getDisplayedElapsedMs,
  getMultiBlindMissedCount,
  getMultiBlindScore,
  getFewestMovesMean,
  getPrimarySolveScramble,
  getSolveDisplayText,
  type RollingAverageType,
  type RollingAverageWindow,
  type MultiBlindSolveResult,
  type SolvePenalty,
  type SolveRecord,
} from '@cubegin/shared/timer-session';
import { Checkbox } from '@deweyou-design/react/checkbox';
import { Select } from '@deweyou-design/react/select';
import { NumberInput } from '@deweyou-design/react/number-input';
import { VirtualList } from '@deweyou-design/react/virtual-list';
import { getCubeginWordmarkSvg } from '../brand/wordmark';
import { useAppPreferences } from '../preferences/app-preferences';
import { CheckIcon, CloseIcon, CopyIcon, DeleteIcon } from '../timer/components/timer-icons';
import { ScrambleImage } from '../timer/components/scramble-image';
import { TimerTopNavigation } from '../timer/timer-navigation';
import { resolveMultiBlindResultDraft } from '../timer-session/multi-blind-result-draft';
import { useTimerSessionStore, type TimerList } from '../timer-session/timer-session-store';
import styles from './results-page.module.css';

type ScoreType = 'single' | RollingAverageType;
type ResultsMode = 'scores' | 'stats';
type StatsViewType = 'overview' | 'distribution' | 'trend';
type TrendMetric = 'single' | 'ao5' | 'ao12' | 'ao100';

interface ScoreTypeOption {
  label: string;
  value: ScoreType;
}

interface StatsViewOption {
  label: string;
  value: StatsViewType;
}

interface SingleSolveRow {
  ao5Text: string;
  ao12Text: string;
  ao12Value?: number | null;
  ao5Value?: number | null;
  createdAtText: string;
  emphasis?: {
    ao12?: ScoreValueEmphasis;
    ao5?: ScoreValueEmphasis;
    result?: ScoreValueEmphasis;
  };
  sequence: number;
  solve: SolveRecord;
  resultValue: number | null;
}

type ScoreValueEmphasis = 'best' | 'worst';

interface ScoreValueBounds {
  best: number;
  worst: number;
}

interface DistributionChartDatum {
  count: number;
  rangeLabel: string;
  tickLabel: string;
}

interface TrendChartDatum {
  ao100Ms: number | null;
  ao12Ms: number | null;
  ao5Ms: number | null;
  sequenceLabel: string;
  singleMs: number | null;
}

type TrendValueKey = Exclude<keyof TrendChartDatum, 'sequenceLabel'>;

type ResultsChartTooltipProps = TooltipContentProps<TooltipValueType, number | string>;
type ResultsChartTooltipState = Pick<ResultsChartTooltipProps, 'active' | 'label' | 'payload'>;

const AVERAGE_SCORE_TYPES: RollingAverageType[] = ['av3', 'ao5', 'ao12', 'ao20', 'ao50', 'ao100'];
const DISTRIBUTION_TARGET_BUCKET_COUNT = 20;
const DISTRIBUTION_MAX_BUCKET_COUNT = 24;
const TREND_TOOLTIP_DEBOUNCE_MS = 120;
const ALL_TREND_METRICS: readonly TrendMetric[] = ['single', 'ao5', 'ao12', 'ao100'];

const isAverageScoreType = (scoreType: ScoreType): scoreType is RollingAverageType =>
  scoreType !== 'single';

const formatStat = (valueMs: number | null | undefined, fallback = '--') => {
  if (valueMs === undefined) return fallback;
  if (valueMs === null) return 'DNF';
  return formatMilliseconds(valueMs);
};

const formatStandardDeviation = (valueMs: number | null | undefined) =>
  valueMs === null || valueMs === undefined ? '--' : `(σ = ${formatMilliseconds(valueMs)})`;

const formatRollingAverageLabel = (size: number) => (size === 3 ? 'mo3' : `ao${size}`);

const formatValidRatio = (ratio: number) => {
  const percentage = ratio * 100;
  return `${percentage === 100 ? '100' : percentage.toFixed(1)}%`;
};

const compareDisplayedMs = (a: number | null, b: number | null): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
};

const averageDisplayedMs = (
  displayedTimes: readonly (number | null)[],
  shouldTrim: boolean,
): number | null => {
  const times = [...displayedTimes];
  if (shouldTrim && times.length >= 3) {
    const bestIndex = times.reduce<number>(
      (best, time, index) => (compareDisplayedMs(time, times[best]!) < 0 ? index : best),
      0,
    );
    times.splice(bestIndex, 1);

    const worstIndex = times.reduce<number>(
      (worst, time, index) => (compareDisplayedMs(time, times[worst]!) > 0 ? index : worst),
      0,
    );
    times.splice(worstIndex, 1);
  }

  const numericTimes = times.filter((time): time is number => time !== null);
  if (numericTimes.length === 0 || numericTimes.length !== times.length) return null;
  return Math.round(numericTimes.reduce((sum, time) => sum + time, 0) / numericTimes.length);
};

const buildAverageValueByEndSequence = (
  solvesNewestFirst: readonly SolveRecord[],
  size: number,
): Map<number, number | null> => {
  if (solvesNewestFirst.length < size) return new Map();

  const total = solvesNewestFirst.length;
  const shouldTrim = size >= 5;

  return new Map(
    Array.from({ length: solvesNewestFirst.length - size + 1 }, (_, startIndex) => {
      const displayedTimes = solvesNewestFirst
        .slice(startIndex, startIndex + size)
        .map((solve) => getDisplayedElapsedMs(solve.elapsedMs, solve.penalty));
      const valueMs = averageDisplayedMs(displayedTimes, shouldTrim);

      return [total - startIndex, valueMs];
    }),
  );
};

const getScoreValueBounds = (
  values: readonly (number | null | undefined)[],
): ScoreValueBounds | undefined => {
  let best = Number.POSITIVE_INFINITY;
  let worst = Number.NEGATIVE_INFINITY;
  let count = 0;

  for (const value of values) {
    if (typeof value !== 'number') continue;
    best = Math.min(best, value);
    worst = Math.max(worst, value);
    count += 1;
  }

  if (count < 2 || best === worst) return undefined;
  return { best, worst };
};

const getScoreValueEmphasis = (
  value: number | null | undefined,
  bounds: ScoreValueBounds | undefined,
): ScoreValueEmphasis | undefined => {
  if (value === null || value === undefined || bounds === undefined) return undefined;
  if (value === bounds.best) return 'best';
  if (value === bounds.worst) return 'worst';
  return undefined;
};

const padTimePart = (value: number) => value.toString().padStart(2, '0');

const formatSlashedDate = (date: Date) =>
  `${padTimePart(date.getMonth() + 1)}/${padTimePart(date.getDate())}`;

const isSameLocalDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const formatSolveCreatedAt = (createdAt: number, now = Date.now()) => {
  const createdDate = new Date(createdAt);
  const currentDate = new Date(now);
  const timeText = `${padTimePart(createdDate.getHours())}:${padTimePart(createdDate.getMinutes())}`;

  if (isSameLocalDate(createdDate, currentDate)) return timeText;

  const dateText = formatSlashedDate(createdDate);
  if (createdDate.getFullYear() === currentDate.getFullYear()) return `${dateText} ${timeText}`;

  return `${createdDate.getFullYear()}/${dateText} ${timeText}`;
};

const formatSolveDetailCreatedAt = (createdAt: number) => {
  const createdDate = new Date(createdAt);
  const timeText = `${padTimePart(createdDate.getHours())}:${padTimePart(createdDate.getMinutes())}`;
  return `${createdDate.getFullYear()}/${formatSlashedDate(createdDate)} ${timeText}`;
};

const copyTextToClipboard = async (text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText !== undefined) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue to the legacy path for browsers that reject clipboard permissions.
    }
  }

  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.opacity = '0';
  textarea.style.position = 'fixed';
  document.body.append(textarea);
  textarea.select();

  const didCopy = document.execCommand?.('copy') ?? false;
  textarea.remove();
  return didCopy;
};

const getWindowRangeText = (window: RollingAverageWindow) =>
  `${window.startSequenceNumber}-${window.endSequenceNumber}`;

const shouldOpenDetailSheet = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 860px)').matches;

const buildSingleRows = (
  solves: readonly SolveRecord[],
  isMultiBlind = false,
): SingleSolveRow[] => {
  const ao5ByEndSequence = isMultiBlind ? new Map() : buildAverageValueByEndSequence(solves, 5);
  const ao12ByEndSequence = isMultiBlind ? new Map() : buildAverageValueByEndSequence(solves, 12);
  const total = solves.length;

  const rows = solves.map((solve, index) => {
    const sequence = total - index;
    const ao5Value = ao5ByEndSequence.get(sequence);
    const ao12Value = ao12ByEndSequence.get(sequence);

    return {
      ao5Text: formatStat(ao5Value),
      ao5Value,
      ao12Text: formatStat(ao12Value),
      ao12Value,
      createdAtText: formatSolveCreatedAt(solve.createdAt),
      resultValue: getDisplayedElapsedMs(solve.elapsedMs, solve.penalty),
      sequence,
      solve,
    };
  });

  const resultValues = rows.map((row) => row.resultValue);
  const ao5Values = rows.map((row) => row.ao5Value);
  const ao12Values = rows.map((row) => row.ao12Value);
  const resultBounds = getScoreValueBounds(resultValues);
  const ao5Bounds = getScoreValueBounds(ao5Values);
  const ao12Bounds = getScoreValueBounds(ao12Values);

  return rows.map((row) => ({
    ...row,
    emphasis: {
      ao12: getScoreValueEmphasis(row.ao12Value, ao12Bounds),
      ao5: getScoreValueEmphasis(row.ao5Value, ao5Bounds),
      result: getScoreValueEmphasis(row.resultValue, resultBounds),
    },
  }));
};

export const buildTrendChartData = (solves: readonly SolveRecord[]): TrendChartDatum[] => {
  const ao5ByEndSequence = buildAverageValueByEndSequence(solves, 5);
  const ao12ByEndSequence = buildAverageValueByEndSequence(solves, 12);
  const ao100ByEndSequence = buildAverageValueByEndSequence(solves, 100);
  const total = solves.length;

  return solves
    .map((solve, index) => ({
      sequence: total - index,
      ao100Ms: ao100ByEndSequence.get(total - index) ?? null,
      ao12Ms: ao12ByEndSequence.get(total - index) ?? null,
      ao5Ms: ao5ByEndSequence.get(total - index) ?? null,
      singleMs: getDisplayedElapsedMs(solve.elapsedMs, solve.penalty),
    }))
    .reverse()
    .map((solve) => ({
      sequenceLabel: `#${solve.sequence}`,
      ao100Ms: solve.ao100Ms,
      ao12Ms: solve.ao12Ms,
      ao5Ms: solve.ao5Ms,
      singleMs: solve.singleMs,
    }));
};

export const buildTrendYAxisDomain = (
  data: readonly TrendChartDatum[],
  keys: readonly TrendValueKey[],
): [number, number] => {
  const values = data.flatMap((datum) =>
    keys.flatMap((key) => {
      const value = datum[key];
      return typeof value === 'number' ? [value] : [];
    }),
  );

  if (values.length === 0) return [0, 1];

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = Math.max(maximum - minimum, 1_000);
  const padding = Math.min(5_000, Math.max(250, Math.ceil((spread * 0.06) / 100) * 100));

  return [
    Math.max(0, Math.floor((minimum - padding) / 100) * 100),
    Math.ceil((maximum + padding) / 100) * 100,
  ];
};

const formatDistributionSecond = (second: number) => {
  const minutes = Math.floor(second / 60);
  if (minutes === 0) return String(second);

  return `${minutes}:${String(second % 60).padStart(2, '0')}`;
};

const formatDistributionRange = (startSecond: number, endSecond: number) =>
  `${startSecond < 60 ? `${startSecond}s` : formatDistributionSecond(startSecond)} - ${
    endSecond < 60 ? `${endSecond}s` : formatDistributionSecond(endSecond)
  }`;

const getClosestNiceDistributionInterval = (targetSeconds: number) => {
  if (targetSeconds <= 1) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(targetSeconds));
  const candidates = [1, 2, 5, 10].map((factor) => factor * magnitude);

  return candidates.reduce((closest, candidate) =>
    Math.abs(candidate - targetSeconds) < Math.abs(closest - targetSeconds) ? candidate : closest,
  );
};

const getNextNiceDistributionInterval = (intervalSeconds: number) => {
  const magnitude = 10 ** Math.floor(Math.log10(intervalSeconds));
  const next = [1, 2, 5, 10]
    .map((factor) => factor * magnitude)
    .find((candidate) => candidate > intervalSeconds);

  return next ?? magnitude * 20;
};

const getDistributionBucketCount = (
  minSecond: number,
  maxSecond: number,
  intervalSeconds: number,
) => Math.floor(maxSecond / intervalSeconds) - Math.floor(minSecond / intervalSeconds) + 1;

const getDistributionIntervalSeconds = (minSecond: number, maxSecond: number) => {
  const coveredSeconds = maxSecond - minSecond + 1;
  let intervalSeconds = getClosestNiceDistributionInterval(
    coveredSeconds / DISTRIBUTION_TARGET_BUCKET_COUNT,
  );

  while (
    getDistributionBucketCount(minSecond, maxSecond, intervalSeconds) >
    DISTRIBUTION_MAX_BUCKET_COUNT
  ) {
    intervalSeconds = getNextNiceDistributionInterval(intervalSeconds);
  }

  return intervalSeconds;
};

export const buildDistributionChartData = (
  solves: readonly SolveRecord[],
): DistributionChartDatum[] => {
  const values = solves
    .map((solve) => getDisplayedElapsedMs(solve.elapsedMs, solve.penalty))
    .filter((value): value is number => value !== null);

  if (values.length === 0) return [];

  const valuesInSeconds = values.map((value) => Math.floor(value / 1_000));
  const minSecond = Math.min(...valuesInSeconds);
  const maxSecond = Math.max(...valuesInSeconds);
  const secondsPerBin = getDistributionIntervalSeconds(minSecond, maxSecond);
  const firstBucketSecond = Math.floor(minSecond / secondsPerBin) * secondsPerBin;
  const lastBucketSecond = Math.floor(maxSecond / secondsPerBin) * secondsPerBin;
  const binCount = (lastBucketSecond - firstBucketSecond) / secondsPerBin + 1;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const startSecond = firstBucketSecond + secondsPerBin * index;
    const endSecond = startSecond + secondsPerBin;

    return {
      count: 0,
      rangeLabel: formatDistributionRange(startSecond, endSecond),
      tickLabel: formatDistributionSecond(startSecond),
    };
  });

  valuesInSeconds.forEach((valueInSeconds) => {
    const index = Math.min(
      binCount - 1,
      Math.floor((valueInSeconds - firstBucketSecond) / secondsPerBin),
    );
    bins[index]!.count += 1;
  });

  return bins.filter((bin) => bin.count > 0);
};

interface ResultsListSelectorProps {
  activeListId: string;
  copy: ReturnType<typeof useAppPreferences>['copy'];
  lists: TimerList[];
  onChange: (listId: string) => void;
}

const ResultsListSelector = ({ activeListId, copy, lists, onChange }: ResultsListSelectorProps) => (
  <Select.Root
    className={styles.listControl}
    label={<span className={styles.visuallyHidden}>{copy.timer.listSelectorLabel}</span>}
    value={[activeListId]}
    onValueChange={(nextValue) => {
      const nextListId = nextValue[0];
      if (nextListId) onChange(nextListId);
    }}
  >
    <Select.Trigger className={styles.listTrigger} />
    <Select.Content className={styles.listContent}>
      {lists.map((list) => (
        <Select.Item key={list.id} className={styles.listItem} value={list.id} label={list.name} />
      ))}
    </Select.Content>
  </Select.Root>
);

interface ModeTabsProps {
  activeMode: ResultsMode;
  copy: ReturnType<typeof useAppPreferences>['copy'];
  onModeChange: (mode: ResultsMode) => void;
}

const ModeTabs = ({ activeMode, copy, onModeChange }: ModeTabsProps) => {
  const handleModeTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      onModeChange('scores');
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      onModeChange('stats');
    }
  };

  return (
    <div className={styles.modeTabs} role="tablist" aria-label={copy.results.pageLabel}>
      <button
        aria-selected={activeMode === 'scores'}
        className={styles.modeTab}
        data-active={activeMode === 'scores' ? 'true' : undefined}
        role="tab"
        tabIndex={activeMode === 'scores' ? 0 : -1}
        type="button"
        onClick={() => onModeChange('scores')}
        onKeyDown={handleModeTabKeyDown}
      >
        {copy.results.scores}
      </button>
      <button
        aria-selected={activeMode === 'stats'}
        className={styles.modeTab}
        data-active={activeMode === 'stats' ? 'true' : undefined}
        role="tab"
        tabIndex={activeMode === 'stats' ? 0 : -1}
        type="button"
        onClick={() => onModeChange('stats')}
        onKeyDown={handleModeTabKeyDown}
      >
        {copy.results.stats}
      </button>
    </div>
  );
};

interface ScoreSwitchProps {
  activeMode: ResultsMode;
  copy: ReturnType<typeof useAppPreferences>['copy'];
  scoreType: ScoreType;
  scoreTypes: readonly ScoreTypeOption[];
  statsView: StatsViewType;
  statsViews: readonly StatsViewOption[];
  onScoreTypeChange: (scoreType: ScoreType) => void;
  onStatsViewChange: (statsView: StatsViewType) => void;
}

const ScoreSwitch = ({
  activeMode,
  copy,
  scoreType,
  scoreTypes,
  statsView,
  statsViews,
  onScoreTypeChange,
  onStatsViewChange,
}: ScoreSwitchProps) => (
  <div className={styles.scoreSwitch} role="group" aria-label={copy.results.pageLabel}>
    {activeMode === 'scores' ? (
      <Select.Root
        className={styles.viewTypeControl}
        label={<span className={styles.visuallyHidden}>{copy.results.scoreTypeLabel}</span>}
        value={[scoreType]}
        onValueChange={(nextValue) => {
          const nextScoreType = nextValue[0] as ScoreType | undefined;
          if (nextScoreType) onScoreTypeChange(nextScoreType);
        }}
      >
        <Select.Trigger className={styles.viewTypeTrigger} />
        <Select.Content className={styles.scoreTypeContent}>
          {scoreTypes.map((option) => (
            <Select.Item
              key={option.value}
              className={styles.scoreTypeItem}
              value={option.value}
              label={option.label}
            />
          ))}
        </Select.Content>
      </Select.Root>
    ) : (
      <Select.Root
        className={styles.viewTypeControl}
        label={<span className={styles.visuallyHidden}>{copy.results.statsViewLabel}</span>}
        value={[statsView]}
        onValueChange={(nextValue) => {
          const nextStatsView = nextValue[0] as StatsViewType | undefined;
          if (nextStatsView) onStatsViewChange(nextStatsView);
        }}
      >
        <Select.Trigger className={styles.viewTypeTrigger} />
        <Select.Content className={styles.statsViewContent}>
          {statsViews.map((option) => (
            <Select.Item
              key={option.value}
              className={styles.statsViewItem}
              value={option.value}
              label={option.label}
            />
          ))}
        </Select.Content>
      </Select.Root>
    )}
  </div>
);

interface EmptyResultsPlaceholderProps {
  copy: ReturnType<typeof useAppPreferences>['copy'];
}

const EmptyResultsPlaceholder = ({ copy }: EmptyResultsPlaceholderProps) => (
  <section className={styles.emptyResultsPlaceholder} aria-label={copy.results.emptySolves}>
    <h1>{copy.results.emptySolves}</h1>
    <p>{copy.results.emptySolvesHint}</p>
  </section>
);

interface SingleSolveTableProps {
  copy: ReturnType<typeof useAppPreferences>['copy'];
  isFewestMoves: boolean;
  isMultiBlind: boolean;
  rows: readonly SingleSolveRow[];
  selectedSolveId?: string;
  onSelect: (row: SingleSolveRow) => void;
}

interface VirtualScoreTableProps<Row> {
  ariaLabel: string;
  className: string;
  columns: readonly string[];
  getRowKey: (row: Row) => string;
  renderRow: (row: Row, index: number) => ReactNode;
  rows: readonly Row[];
}

const VirtualScoreTable = <Row,>({
  ariaLabel,
  className,
  columns,
  getRowKey,
  renderRow,
  rows,
}: VirtualScoreTableProps<Row>) => (
  <div className={className} role="table" aria-label={ariaLabel}>
    <div className={styles.scoreTableHeader} role="rowgroup">
      <div className={styles.scoreTableRow} role="row">
        {columns.map((column) => (
          <div key={column} role="columnheader">
            {column}
          </div>
        ))}
      </div>
    </div>
    <VirtualList
      className={styles.virtualScoreList}
      count={rows.length}
      estimateSize={() => 48}
      getItemKey={(index) => getRowKey(rows[index]!)}
      height="100%"
      itemClassName={styles.virtualScoreListItem}
      itemRole={null}
      overscan={8}
      renderItem={({ index }) => renderRow(rows[index]!, index)}
      role="rowgroup"
    />
  </div>
);

const SingleSolveTable = ({
  copy,
  isFewestMoves,
  isMultiBlind,
  rows,
  selectedSolveId,
  onSelect,
}: SingleSolveTableProps) => {
  if (rows.length === 0) {
    return <p className={styles.emptyState}>{copy.results.emptySolves}</p>;
  }

  return (
    <VirtualScoreTable
      ariaLabel={copy.results.scoreTableLabel}
      className={`${styles.scoreTable} ${styles.singleScoreTable}`}
      columns={[
        copy.results.sequenceColumn,
        isFewestMoves ? copy.results.fewestMovesResult : copy.results.resultColumn,
        isFewestMoves
          ? copy.results.fewestMovesMeanOfThree
          : isMultiBlind
            ? copy.results.multiBlindScore
            : copy.results.ao5Column,
        isFewestMoves
          ? copy.results.fewestMovesDuration
          : isMultiBlind
            ? copy.results.multiBlindMissedCount
            : copy.results.ao12Column,
        copy.results.createdAtColumn,
      ]}
      getRowKey={(row) => row.solve.id}
      rows={rows}
      renderRow={(row, index) => (
        <div
          className={styles.scoreTableRow}
          data-last={index === rows.length - 1 ? 'true' : undefined}
          data-selected={row.solve.id === selectedSolveId ? 'true' : undefined}
          role="row"
          onClick={() => onSelect(row)}
        >
          <div role="cell">#{row.sequence}</div>
          <div data-emphasis={row.emphasis?.result} role="cell">
            <button className={styles.rowButton} type="button" onClick={() => onSelect(row)}>
              {isFewestMoves
                ? formatFewestMovesSolve(row.solve)
                : isMultiBlind
                  ? formatMultiBlindSolve(row.solve)
                  : getSolveDisplayText(row.solve.elapsedMs, row.solve.penalty)}
            </button>
          </div>
          <div data-emphasis={row.emphasis?.ao5} role="cell">
            {isFewestMoves
              ? formatFewestMovesMean(
                  getFewestMovesMean(rows.slice(index, index + 3).map(({ solve }) => solve)),
                )
              : isMultiBlind
                ? row.solve.multiBlind === undefined
                  ? '--'
                  : getMultiBlindScore(row.solve.multiBlind)
                : row.ao5Text}
          </div>
          <div data-emphasis={row.emphasis?.ao12} role="cell">
            {isFewestMoves
              ? formatMilliseconds(row.solve.elapsedMs)
              : isMultiBlind
                ? row.solve.multiBlind === undefined
                  ? '--'
                  : getMultiBlindMissedCount(row.solve.multiBlind)
                : row.ao12Text}
          </div>
          <div className={styles.createdAtCell} role="cell">
            {row.createdAtText}
          </div>
        </div>
      )}
    />
  );
};

interface AverageTableProps {
  copy: ReturnType<typeof useAppPreferences>['copy'];
  scoreType: RollingAverageType;
  selectedWindowKey?: string;
  windows: readonly RollingAverageWindow[];
  onSelect: (window: RollingAverageWindow) => void;
}

const AverageTable = ({
  copy,
  scoreType,
  selectedWindowKey,
  windows,
  onSelect,
}: AverageTableProps) => {
  if (windows.length === 0) {
    return (
      <p className={styles.emptyState}>
        {scoreType} {copy.results.emptyAverage}
      </p>
    );
  }

  return (
    <VirtualScoreTable
      ariaLabel={copy.results.averageTableLabel}
      className={`${styles.scoreTable} ${styles.averageScoreTable}`}
      columns={[copy.results.rangeColumn, scoreType, copy.results.compositionColumn]}
      getRowKey={(averageWindow) =>
        `${averageWindow.averageType}:${getWindowRangeText(averageWindow)}`
      }
      rows={windows}
      renderRow={(averageWindow, index) => {
        const key = `${averageWindow.averageType}:${getWindowRangeText(averageWindow)}`;
        const composition = averageWindow.componentSolves
          .map((solve) => getSolveDisplayText(solve.elapsedMs, solve.penalty))
          .join(', ');

        return (
          <div
            className={styles.scoreTableRow}
            data-last={index === windows.length - 1 ? 'true' : undefined}
            data-selected={key === selectedWindowKey ? 'true' : undefined}
            role="row"
            onClick={() => onSelect(averageWindow)}
          >
            <div role="cell">{getWindowRangeText(averageWindow)}</div>
            <div role="cell">
              <button
                className={styles.rowButton}
                type="button"
                onClick={() => onSelect(averageWindow)}
              >
                {averageWindow.valueText}
              </button>
            </div>
            <div className={styles.compositionCell} role="cell">
              {composition}
            </div>
          </div>
        );
      }}
    />
  );
};

interface SolveDetailProps {
  copy: ReturnType<typeof useAppPreferences>['copy'];
  solve: SolveRecord;
  onDelete: (solveId: string) => void;
  onEditMultiBlind: (solveId: string) => void;
  onPenaltyChange: (solveId: string, penalty: SolvePenalty) => void;
}

const SolveDetail = ({
  copy,
  solve,
  onDelete,
  onEditMultiBlind,
  onPenaltyChange,
}: SolveDetailProps) => {
  const detailPanelRef = useRef<HTMLElement>(null);
  const copiedFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScrambleCopied, setIsScrambleCopied] = useState(false);
  const primaryScramble = getPrimarySolveScramble(solve);
  const scrambleSvg = useMemo(
    () => (primaryScramble.length > 0 ? renderScrambleImage(solve.eventId, primaryScramble) : ''),
    [primaryScramble, solve.eventId],
  );

  useEffect(() => {
    detailPanelRef.current?.scrollTo?.({ top: 0 });
    if (copiedFeedbackTimeoutRef.current !== null) {
      clearTimeout(copiedFeedbackTimeoutRef.current);
      copiedFeedbackTimeoutRef.current = null;
    }
    setIsScrambleCopied(false);
  }, [solve.id]);

  useEffect(() => {
    return () => {
      if (copiedFeedbackTimeoutRef.current !== null) {
        clearTimeout(copiedFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyScramble = useCallback(async () => {
    if (primaryScramble.length === 0) return;
    if (!(await copyTextToClipboard(primaryScramble))) return;

    if (copiedFeedbackTimeoutRef.current !== null) {
      clearTimeout(copiedFeedbackTimeoutRef.current);
    }
    setIsScrambleCopied(true);
    copiedFeedbackTimeoutRef.current = setTimeout(() => {
      copiedFeedbackTimeoutRef.current = null;
      setIsScrambleCopied(false);
    }, 1600);
  }, [primaryScramble]);

  return (
    <aside
      ref={detailPanelRef}
      className={styles.detailPanel}
      role="complementary"
      aria-label={copy.results.detailTitle}
    >
      <header className={styles.detailHeader}>
        <span className={styles.detailKicker}>{copy.results.detailTitle}</span>
        <strong className={styles.detailResult}>
          {solve.eventId === '333fm'
            ? formatFewestMovesSolve(solve)
            : solve.eventId === '333mbld'
              ? formatMultiBlindSolve(solve)
              : getSolveDisplayText(solve.elapsedMs, solve.penalty)}
        </strong>
        {solve.eventId === '333mbld' && solve.multiBlind !== undefined ? (
          <div className={styles.multiBlindDetailMetrics}>
            <span>{formatMultiBlindAttempt(solve)}</span>
            <span>{`${copy.results.multiBlindScore} ${getMultiBlindScore(solve.multiBlind)}`}</span>
            <span>{`${copy.results.multiBlindMissedCount} ${getMultiBlindMissedCount(solve.multiBlind)}`}</span>
          </div>
        ) : null}
        {solve.eventId === '333fm' && solve.fewestMoves !== undefined ? (
          <div className={styles.multiBlindDetailMetrics}>
            <span>{`${copy.results.fewestMovesDuration} ${formatMilliseconds(solve.elapsedMs)}`}</span>
            <span>{`OBTM ${solve.fewestMoves.moveCount ?? '--'}`}</span>
            <span>{`ETM ${solve.fewestMoves.executionMoveCount ?? '--'}`}</span>
          </div>
        ) : null}
        <div className={styles.detailTimestamp}>
          <span>{copy.results.createdAtColumn}</span>
          <time dateTime={new Date(solve.createdAt).toISOString()}>
            {formatSolveDetailCreatedAt(solve.createdAt)}
          </time>
        </div>
      </header>

      <div
        className={styles.resultToolbar}
        role="toolbar"
        aria-label={copy.timer.resultToolbarLabel}
      >
        {solve.eventId === '333mbld' ? (
          <button
            className={styles.resultButton}
            type="button"
            onClick={() => onEditMultiBlind(solve.id)}
          >
            {copy.timer.editResult}
          </button>
        ) : solve.eventId === '333fm' ? null : (
          <>
            <button
              className={styles.resultButton}
              type="button"
              data-active={solve.penalty === 'none' ? 'true' : undefined}
              onClick={() => onPenaltyChange(solve.id, 'none')}
            >
              {copy.results.noPenalty}
            </button>
            <button
              className={styles.resultButton}
              type="button"
              data-active={solve.penalty === '+2' ? 'true' : undefined}
              onClick={() => onPenaltyChange(solve.id, '+2')}
            >
              {copy.results.plusTwoPenalty}
            </button>
            <button
              className={styles.resultButton}
              type="button"
              data-active={solve.penalty === 'dnf' ? 'true' : undefined}
              onClick={() => onPenaltyChange(solve.id, 'dnf')}
            >
              {copy.results.dnfPenalty}
            </button>
          </>
        )}
        <button
          className={`${styles.resultButton} ${styles.deleteButton}`}
          type="button"
          aria-label={copy.results.deleteSolve}
          onClick={() => onDelete(solve.id)}
        >
          <DeleteIcon className={styles.deleteIcon} size={18} />
        </button>
        <button
          className={`${styles.resultButton} ${styles.copyButton}`}
          type="button"
          aria-label={isScrambleCopied ? copy.results.scrambleCopied : copy.results.copyScramble}
          data-copied={isScrambleCopied ? 'true' : undefined}
          disabled={primaryScramble.length === 0}
          title={isScrambleCopied ? copy.results.scrambleCopied : copy.results.copyScramble}
          onClick={() => void handleCopyScramble()}
        >
          {isScrambleCopied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        </button>
      </div>

      {solve.eventId === '333fm' && solve.fewestMoves !== undefined ? (
        <section className={styles.solutionBlock} aria-label={copy.results.fewestMovesSolution}>
          <span>{copy.results.fewestMovesSolution}</span>
          <code>{solve.fewestMoves.normalizedSolution ?? solve.fewestMoves.rawSolution}</code>
        </section>
      ) : null}

      <section className={styles.scrambleBlock} aria-label="scramble" data-event={solve.eventId}>
        <p>{primaryScramble}</p>
      </section>
      {scrambleSvg.length > 0 ? (
        <div className={styles.scrambleImageSlot}>
          <ScrambleImage eventId={solve.eventId} svg={scrambleSvg} />
        </div>
      ) : null}
    </aside>
  );
};

interface AverageDetailProps {
  copy: ReturnType<typeof useAppPreferences>['copy'];
  window: RollingAverageWindow;
}

const AverageDetail = ({ copy, window }: AverageDetailProps) => (
  <aside
    className={styles.detailPanel}
    role="complementary"
    aria-label={copy.results.averageDetailTitle}
  >
    <header className={styles.detailHeader}>
      <span className={styles.detailKicker}>{copy.results.averageDetailTitle}</span>
      <strong className={styles.detailResult}>{window.valueText}</strong>
    </header>
    <ol className={styles.averageComponentList}>
      {window.componentSolves.map((solve) => (
        <li key={solve.id}>
          <span>{getSolveDisplayText(solve.elapsedMs, solve.penalty)}</span>
          <small>{getPrimarySolveScramble(solve)}</small>
        </li>
      ))}
    </ol>
  </aside>
);

interface StatisticsViewProps {
  copy: ReturnType<typeof useAppPreferences>['copy'];
  isFewestMoves: boolean;
  isMultiBlind: boolean;
  solves: readonly SolveRecord[];
  view: StatsViewType;
}

interface StatisticMetricProps {
  detail?: string;
  label: string;
  value: string | number;
}

const StatisticMetric = ({ detail, label, value }: StatisticMetricProps) => (
  <div className={styles.statMetric}>
    <div className={styles.statMetricLabel}>
      <span>{label}</span>
      {detail !== undefined ? <small>{detail}</small> : null}
    </div>
    <strong>{value}</strong>
  </div>
);

const ResultsChartTooltip = ({ active, label, payload }: ResultsChartTooltipState) => {
  if (!active || payload.length === 0) return null;

  const datum = payload[0]?.payload as DistributionChartDatum | TrendChartDatum | undefined;
  const isDistributionDatum = datum !== undefined && 'rangeLabel' in datum;

  if (isDistributionDatum) {
    const value = payload[0]?.value;
    if (typeof value !== 'number') return null;

    return (
      <div className={styles.chartTooltip}>
        <strong>{datum.rangeLabel}</strong>
        <span>{`${value} 次`}</span>
      </div>
    );
  }

  const trendValues = payload.flatMap(({ color, name, value }) =>
    typeof value === 'number' ? [{ color, name: String(name), value }] : [],
  );

  if (trendValues.length === 0) return null;

  return (
    <div className={styles.chartTooltip}>
      <strong>{label}</strong>
      {trendValues.map(({ color, name, value }) => (
        <span key={name} className={styles.chartTooltipValue}>
          <i aria-hidden="true" style={{ backgroundColor: color }} />
          {`${name} ${formatMilliseconds(value)}`}
        </span>
      ))}
    </div>
  );
};

const DebouncedResultsChartTooltip = (tooltipProps: ResultsChartTooltipProps) => {
  const { active, label, payload } = tooltipProps;
  const [displayedTooltip, setDisplayedTooltip] = useState<ResultsChartTooltipState>();

  useEffect(() => {
    if (!active) {
      setDisplayedTooltip(undefined);
      return;
    }

    const timeout = window.setTimeout(() => {
      setDisplayedTooltip({ active, label, payload });
    }, TREND_TOOLTIP_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [active, label, payload]);

  return displayedTooltip === undefined ? null : <ResultsChartTooltip {...displayedTooltip} />;
};

const renderDebouncedResultsChartTooltip = (tooltipProps: ResultsChartTooltipProps) => (
  <DebouncedResultsChartTooltip {...tooltipProps} />
);

const StatisticsView = ({
  copy,
  isFewestMoves,
  isMultiBlind,
  solves,
  view,
}: StatisticsViewProps) => {
  const [activeTrendMetrics, setActiveTrendMetrics] =
    useState<readonly TrendMetric[]>(ALL_TREND_METRICS);
  const statistics = useMemo(() => calculateSolveStatistics(solves), [solves]);
  const trendChartData = useMemo(() => buildTrendChartData(solves), [solves]);
  const distributionChartData = useMemo(() => buildDistributionChartData(solves), [solves]);
  const distributionChartHeight = Math.max(220, distributionChartData.length * 30 + 24);
  const trendSeries = [
    {
      color: 'var(--results-chart-single)',
      dataKey: 'singleMs' as const,
      id: 'single' as const,
      label: copy.results.trendSingle,
      strokeOpacity: 0.72,
      strokeWidth: 0.8,
      zIndex: 10,
    },
    {
      color: 'var(--results-chart-ao5)',
      dataKey: 'ao5Ms' as const,
      id: 'ao5' as const,
      label: copy.results.ao5Column,
      strokeOpacity: 0.92,
      strokeWidth: 1.2,
      zIndex: 20,
    },
    {
      color: 'var(--results-chart-ao12)',
      dataKey: 'ao12Ms' as const,
      id: 'ao12' as const,
      label: copy.results.ao12Column,
      strokeOpacity: 0.92,
      strokeWidth: 1.2,
      zIndex: 30,
    },
    {
      color: 'var(--results-chart-ao100)',
      dataKey: 'ao100Ms' as const,
      id: 'ao100' as const,
      label: 'ao100',
      strokeOpacity: 0.92,
      strokeWidth: 1.2,
      zIndex: 40,
    },
  ];
  const visibleTrendSeries = trendSeries.filter((series) => activeTrendMetrics.includes(series.id));
  const trendYAxisDomain = useMemo(
    () =>
      buildTrendYAxisDomain(
        trendChartData,
        visibleTrendSeries.map((series) => series.dataKey),
      ),
    [trendChartData, visibleTrendSeries],
  );
  const toggleTrendMetric = useCallback((metric: TrendMetric) => {
    setActiveTrendMetrics((currentMetrics) => {
      if (currentMetrics.includes(metric)) {
        return currentMetrics.length === 1
          ? currentMetrics
          : currentMetrics.filter((currentMetric) => currentMetric !== metric);
      }

      return ALL_TREND_METRICS.filter(
        (currentMetric) => currentMetrics.includes(currentMetric) || currentMetric === metric,
      );
    });
  }, []);

  if (solves.length === 0) {
    return (
      <section className={styles.statsView} aria-label={copy.results.stats}>
        <p className={styles.emptyState}>{copy.results.statsEmpty}</p>
      </section>
    );
  }

  if (isFewestMoves) {
    const fewestMovesStatistics = calculateFewestMovesStatistics(solves);
    return (
      <section className={styles.statsView} aria-label={copy.results.stats}>
        <div className={styles.statsGrid}>
          <StatisticMetric label={copy.results.total} value={fewestMovesStatistics.totalCount} />
          <StatisticMetric
            label={copy.results.validCount}
            value={fewestMovesStatistics.validCount}
          />
          <StatisticMetric
            label={copy.results.validRatio}
            value={formatValidRatio(
              fewestMovesStatistics.totalCount === 0
                ? 0
                : fewestMovesStatistics.validCount / fewestMovesStatistics.totalCount,
            )}
          />
          <StatisticMetric
            label={copy.results.bestSingle}
            value={
              fewestMovesStatistics.bestSolve
                ? formatFewestMovesSolve(fewestMovesStatistics.bestSolve)
                : '--'
            }
          />
          <StatisticMetric
            label={copy.results.fewestMovesCurrentMean}
            value={formatFewestMovesMean(fewestMovesStatistics.currentMean)}
          />
          <StatisticMetric
            label={copy.results.fewestMovesBestMean}
            value={formatFewestMovesMean(fewestMovesStatistics.bestMean)}
          />
        </div>
      </section>
    );
  }

  if (isMultiBlind) {
    const multiBlindStatistics = calculateMultiBlindStatistics(solves);
    return (
      <section className={styles.statsView} aria-label={copy.results.stats}>
        <div className={styles.statsGrid}>
          <StatisticMetric label={copy.results.total} value={multiBlindStatistics.totalCount} />
          <StatisticMetric
            label={copy.results.validCount}
            value={multiBlindStatistics.validCount}
          />
          <StatisticMetric
            label={copy.results.validRatio}
            value={formatValidRatio(
              multiBlindStatistics.totalCount === 0
                ? 0
                : multiBlindStatistics.validCount / multiBlindStatistics.totalCount,
            )}
          />
          <StatisticMetric
            label={copy.results.multiBlindBestResult}
            value={
              multiBlindStatistics.bestSolve
                ? formatMultiBlindSolve(multiBlindStatistics.bestSolve)
                : '--'
            }
          />
          <StatisticMetric
            label={copy.results.multiBlindBestScore}
            value={multiBlindStatistics.bestScore ?? '--'}
          />
        </div>
        <p className={styles.multiBlindNoAverage}>{copy.results.multiBlindNoAverage}</p>
      </section>
    );
  }

  return (
    <section className={styles.statsView} aria-label={copy.results.stats}>
      {view === 'overview' ? (
        <>
          <div className={styles.statsGrid}>
            <StatisticMetric label={copy.results.total} value={statistics.totalCount} />
            <StatisticMetric label={copy.results.validCount} value={statistics.validCount} />
            <StatisticMetric
              label={copy.results.validRatio}
              value={formatValidRatio(statistics.validRatio)}
            />
            <StatisticMetric
              label={copy.results.bestSingle}
              value={formatStat(statistics.bestMs)}
            />
            <StatisticMetric
              label={copy.results.worstSingle}
              value={formatStat(statistics.worstMs)}
            />
            <StatisticMetric
              detail={formatStandardDeviation(statistics.averageStandardDeviationMs)}
              label={copy.results.overallAverage}
              value={formatStat(statistics.averageMs, solves.length > 0 ? 'DNF' : '--')}
            />
          </div>

          {statistics.rollingAverages.length > 0 ? (
            <section
              className={styles.averageStatistics}
              aria-labelledby="results-average-statistics-title"
            >
              <header className={styles.averageStatisticsHeader}>
                <h2 id="results-average-statistics-title">{copy.results.averageResults}</h2>
                <div className={styles.averageStatisticsColumns} aria-hidden="true">
                  <span>{copy.results.currentAverage}</span>
                  <span>{copy.results.bestAverage}</span>
                </div>
              </header>
              <div
                className={styles.averageStatisticsRows}
                role="table"
                aria-label={copy.results.averageResults}
              >
                {statistics.rollingAverages.map((average) => (
                  <div key={average.size} className={styles.averageStatisticsRow} role="row">
                    <strong role="rowheader">{formatRollingAverageLabel(average.size)}</strong>
                    <span className={styles.averageStatisticValue} role="cell">
                      <b>{formatStat(average.currentMs)}</b>
                      <small
                        aria-label={`${copy.results.standardDeviation} ${formatStandardDeviation(average.currentStandardDeviationMs)}`}
                      >
                        {formatStandardDeviation(average.currentStandardDeviationMs)}
                      </small>
                    </span>
                    <span className={styles.averageStatisticValue} role="cell">
                      <b>{formatStat(average.bestMs)}</b>
                      <small
                        aria-label={`${copy.results.standardDeviation} ${formatStandardDeviation(average.bestStandardDeviationMs)}`}
                      >
                        {formatStandardDeviation(average.bestStandardDeviationMs)}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {view === 'trend' ? (
        <section className={styles.chartPanel} aria-labelledby="results-trend-chart-title">
          <header className={styles.chartPanelHeader}>
            <span id="results-trend-chart-title">{copy.results.lineChart}</span>
            <div
              className={styles.chartLegend}
              role="group"
              aria-label={copy.results.trendMetricLabel}
            >
              {trendSeries.map((series) => (
                <button
                  key={series.id}
                  aria-pressed={activeTrendMetrics.includes(series.id)}
                  className={styles.chartLegendButton}
                  type="button"
                  onClick={() => toggleTrendMetric(series.id)}
                >
                  <i aria-hidden="true" style={{ backgroundColor: series.color }} />
                  {series.label}
                </button>
              ))}
            </div>
          </header>
          {trendChartData.length > 0 ? (
            <div className={styles.chartCanvas} role="img" aria-label={copy.results.lineChart}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData} margin={{ top: 12, right: 8, bottom: 2, left: 0 }}>
                  <CartesianGrid
                    stroke="var(--results-chart-grid)"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    axisLine={{ stroke: 'var(--results-chart-axis)' }}
                    dataKey="sequenceLabel"
                    interval="preserveStartEnd"
                    minTickGap={26}
                    tick={{ fill: 'var(--ui-color-text-muted)', fontSize: 11 }}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    axisLine={false}
                    domain={trendYAxisDomain}
                    tick={{ fill: 'var(--ui-color-text-muted)', fontSize: 11 }}
                    tickFormatter={(value: number) => formatMilliseconds(value)}
                    tickLine={false}
                    tickMargin={8}
                    width={52}
                  />
                  <Tooltip
                    content={renderDebouncedResultsChartTooltip}
                    cursor={{ stroke: 'var(--results-chart-axis)', strokeWidth: 1 }}
                  />
                  {trendSeries.map((series) => (
                    <Line
                      key={series.id}
                      activeDot={{ fill: 'var(--ui-color-surface)', r: 3, strokeWidth: 1.5 }}
                      connectNulls={false}
                      dataKey={series.dataKey}
                      dot={false}
                      hide={!activeTrendMetrics.includes(series.id)}
                      isAnimationActive={false}
                      name={series.label}
                      stroke={series.color}
                      strokeOpacity={series.strokeOpacity}
                      strokeWidth={series.strokeWidth}
                      type="linear"
                      zIndex={series.zIndex}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={styles.emptyState}>{copy.results.statsEmpty}</p>
          )}
        </section>
      ) : null}

      {view === 'distribution' ? (
        <div className={styles.chartPanel} role="img" aria-label={copy.results.timeDistribution}>
          <header>{copy.results.timeDistribution}</header>
          {distributionChartData.length > 0 ? (
            <div className={styles.chartCanvas} style={{ height: distributionChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={distributionChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 12, bottom: 2, left: 4 }}
                >
                  <CartesianGrid
                    stroke="var(--results-chart-grid)"
                    strokeDasharray="3 5"
                    horizontal={false}
                  />
                  <XAxis
                    allowDecimals={false}
                    axisLine={{ stroke: 'var(--results-chart-axis)' }}
                    tick={{ fill: 'var(--ui-color-text-muted)', fontSize: 11 }}
                    tickLine={false}
                    tickMargin={8}
                    type="number"
                  />
                  <YAxis
                    axisLine={false}
                    dataKey="tickLabel"
                    tick={{ fill: 'var(--ui-color-text-muted)', fontSize: 11 }}
                    tickLine={false}
                    tickMargin={8}
                    type="category"
                    width={58}
                  />
                  <Tooltip
                    content={ResultsChartTooltip}
                    cursor={{ fill: 'var(--results-chart-hover)' }}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--results-chart-primary)"
                    isAnimationActive={false}
                    maxBarSize={30}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={styles.emptyState}>{copy.results.statsEmpty}</p>
          )}
        </div>
      ) : null}
    </section>
  );
};

interface DeleteSolveDialogProps {
  copy: ReturnType<typeof useAppPreferences>['copy'];
  onCancel: () => void;
  onDelete: () => void;
}

const DeleteSolveDialog = ({ copy, onCancel, onDelete }: DeleteSolveDialogProps) => (
  <div className={styles.deleteConfirmBackdrop}>
    <div
      className={styles.deleteConfirmModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-delete-solve-title"
      aria-describedby="results-delete-solve-description"
    >
      <div className={styles.deleteConfirmContent}>
        <h2 className={styles.deleteConfirmTitle} id="results-delete-solve-title">
          {copy.timer.deleteResultConfirmTitle}
        </h2>
        <p className={styles.deleteConfirmDescription} id="results-delete-solve-description">
          {copy.timer.deleteResultConfirmDescription}
        </p>
        <div className={styles.deleteConfirmActions}>
          <button className={styles.secondaryButton} type="button" onClick={onCancel}>
            {copy.timer.cancel}
          </button>
          <button
            className={`${styles.primaryButton} ${styles.dangerButton}`}
            type="button"
            onClick={onDelete}
          >
            {copy.timer.deleteResult}
          </button>
        </div>
      </div>
    </div>
  </div>
);

interface MultiBlindEditDialogProps {
  copy: ReturnType<typeof useAppPreferences>['copy'];
  solve: SolveRecord;
  onCancel: () => void;
  onSave: (
    solveId: string,
    multiBlind: MultiBlindSolveResult,
    penalty: Extract<SolvePenalty, 'none' | 'dnf'>,
  ) => void;
}

const MultiBlindEditDialog = ({ copy, solve, onCancel, onSave }: MultiBlindEditDialogProps) => {
  const multiBlind = solve.multiBlind!;
  const [solvedCount, setSolvedCount] = useState(String(multiBlind.solvedCount));
  const [penaltyCount, setPenaltyCount] = useState(String(multiBlind.timePenaltyCount ?? 0));
  const [isDnf, setIsDnf] = useState(solve.penalty === 'dnf');
  const solved = Number(solvedCount);
  const penalties = Number(penaltyCount);
  const isSolvedCountValid =
    solvedCount.trim() !== '' &&
    Number.isSafeInteger(solved) &&
    solved >= 0 &&
    solved <= multiBlind.attemptedCount;
  const penaltyCountMax = isSolvedCountValid ? solved : 0;
  const isPenaltyCountValid =
    penaltyCount.trim() !== '' &&
    Number.isSafeInteger(penalties) &&
    penalties >= 0 &&
    penalties <= penaltyCountMax;
  const hasSolvedCountError = !isDnf && solvedCount.trim() !== '' && !isSolvedCountValid;
  const hasPenaltyCountError = !isDnf && penaltyCount.trim() !== '' && !isPenaltyCountValid;
  const isValid = isDnf || (isSolvedCountValid && isPenaltyCountValid);
  const solvedCountError = copy.timer.multiBlindSolvedCountError.replace(
    '{max}',
    multiBlind.attemptedCount.toString(),
  );
  const penaltyCountError = copy.timer.multiBlindPenaltyCountError.replace(
    '{max}',
    penaltyCountMax.toString(),
  );

  return (
    <div className={styles.deleteConfirmBackdrop}>
      <div
        className={styles.deleteConfirmModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="results-mbld-edit-title"
      >
        <form
          className={styles.multiBlindEditForm}
          onSubmit={(event) => {
            event.preventDefault();
            const resolvedMultiBlind = resolveMultiBlindResultDraft({
              attemptedCount: multiBlind.attemptedCount,
              isDnf,
              penaltyCount,
              solvedCount,
            });
            if (!resolvedMultiBlind) return;
            onSave(solve.id, resolvedMultiBlind, isDnf ? 'dnf' : 'none');
          }}
        >
          <h2 className={styles.deleteConfirmTitle} id="results-mbld-edit-title">
            {copy.timer.multiBlindResultTitle}
          </h2>
          <NumberInput
            className={styles.multiBlindEditRow}
            autoFocus
            decrementLabel={copy.timer.decreaseValue}
            disabled={isDnf}
            error={hasSolvedCountError ? solvedCountError : undefined}
            incrementLabel={copy.timer.increaseValue}
            inputMode="numeric"
            label={copy.timer.multiBlindSolvedCountLabel}
            max={multiBlind.attemptedCount}
            min={0}
            required={!isDnf}
            size="sm"
            step={1}
            value={solvedCount}
            onValueChange={({ value }) => setSolvedCount(value)}
          />
          <NumberInput
            className={styles.multiBlindEditRow}
            decrementLabel={copy.timer.decreaseValue}
            disabled={isDnf}
            error={hasPenaltyCountError ? penaltyCountError : undefined}
            incrementLabel={copy.timer.increaseValue}
            inputMode="numeric"
            label={copy.timer.multiBlindPenaltyCountLabel}
            max={penaltyCountMax}
            min={0}
            required={!isDnf}
            size="sm"
            step={1}
            value={penaltyCount}
            onValueChange={({ value }) => setPenaltyCount(value)}
          />
          <Checkbox
            checked={isDnf}
            className={styles.multiBlindEditCheckbox}
            onCheckedChange={setIsDnf}
          >
            {copy.timer.multiBlindWholeDnfLabel}
          </Checkbox>
          <div className={styles.deleteConfirmActions}>
            <button className={styles.secondaryButton} type="button" onClick={onCancel}>
              {copy.timer.cancel}
            </button>
            <button className={styles.primaryButton} disabled={!isValid} type="submit">
              {copy.timer.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ResultsPage = () => {
  const { copy, resolvedTheme } = useAppPreferences();
  const {
    activeList,
    activeListId,
    activeListSolveRecords,
    deleteSolve,
    error,
    isLoading,
    lists,
    retry,
    setActiveListId,
    updateSolvePenalty,
    updateSolveMultiBlind,
  } = useTimerSessionStore();
  const [isBrandHovering, setIsBrandHovering] = useState(false);
  const [mode, setMode] = useState<ResultsMode>('scores');
  const [scoreType, setScoreType] = useState<ScoreType>('single');
  const [statsView, setStatsView] = useState<StatsViewType>('overview');
  const [selectedSolveId, setSelectedSolveId] = useState<string>();
  const [selectedAverageKey, setSelectedAverageKey] = useState<string>();
  const [sheetSolveId, setSheetSolveId] = useState<string>();
  const [sheetAverageKey, setSheetAverageKey] = useState<string>();
  const [deleteCandidateSolveId, setDeleteCandidateSolveId] = useState<string>();
  const [multiBlindEditSolveId, setMultiBlindEditSolveId] = useState<string>();
  const hasManualAverageSelection = useRef(false);
  const hasManualSolveSelection = useRef(false);
  const wordmarkSvg = getCubeginWordmarkSvg(resolvedTheme);
  const isMultiBlindList = activeList.scrambleTypeId === '333mbld';
  const isFewestMovesList = activeList.scrambleTypeId === '333fm';
  const isSpecialSingleOnlyList = isMultiBlindList || isFewestMovesList;
  const scoreTypes = useMemo<ScoreTypeOption[]>(
    () =>
      isSpecialSingleOnlyList
        ? [{ label: copy.results.singleScoreType, value: 'single' }]
        : [
            { label: copy.results.singleScoreType, value: 'single' },
            ...AVERAGE_SCORE_TYPES.map((value) => ({ label: value, value })),
          ],
    [copy.results.singleScoreType, isSpecialSingleOnlyList],
  );
  const statsViews = useMemo<StatsViewOption[]>(
    () =>
      isSpecialSingleOnlyList
        ? [{ label: copy.results.statsOverview, value: 'overview' }]
        : [
            { label: copy.results.statsOverview, value: 'overview' },
            { label: copy.results.timeDistribution, value: 'distribution' },
            { label: copy.results.lineChart, value: 'trend' },
          ],
    [
      copy.results.lineChart,
      copy.results.statsOverview,
      copy.results.timeDistribution,
      isSpecialSingleOnlyList,
    ],
  );
  const singleRows = useMemo(
    () => buildSingleRows(activeListSolveRecords, isMultiBlindList),
    [activeListSolveRecords, isMultiBlindList],
  );
  const averageWindows = useMemo(
    () =>
      isAverageScoreType(scoreType)
        ? calculateRollingAverageWindows(activeListSolveRecords, scoreType)
        : [],
    [activeListSolveRecords, scoreType],
  );
  const selectedRow = singleRows.find((row) => row.solve.id === selectedSolveId) ?? singleRows[0];
  const selectedAverageWindow =
    averageWindows.find(
      (averageWindow) =>
        `${averageWindow.averageType}:${getWindowRangeText(averageWindow)}` === selectedAverageKey,
    ) ?? averageWindows[0];
  const sheetRow = singleRows.find((row) => row.solve.id === sheetSolveId);
  const sheetAverageWindow = averageWindows.find(
    (averageWindow) =>
      `${averageWindow.averageType}:${getWindowRangeText(averageWindow)}` === sheetAverageKey,
  );
  const hasNoSolves =
    activeListSolveRecords.length === 0 && error === undefined && isLoading === false;
  const shouldShowSolveDetail =
    mode === 'scores' && scoreType === 'single' && selectedRow !== undefined;
  const shouldShowAverageDetail =
    mode === 'scores' && isAverageScoreType(scoreType) && selectedAverageWindow !== undefined;
  const hasDetailPanel = shouldShowSolveDetail || shouldShowAverageDetail;
  const contentClassName = [
    styles.content,
    hasNoSolves ? styles.contentEmpty : '',
    !hasNoSolves && hasDetailPanel ? styles.contentWithDetail : '',
    !hasNoSolves && !hasDetailPanel ? styles.contentWithoutDetail : '',
  ]
    .filter(Boolean)
    .join(' ');
  const bodyClassName = [styles.body, hasDetailPanel ? styles.bodyWithDetail : '']
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (!isSpecialSingleOnlyList) return;
    setScoreType('single');
    setStatsView('overview');
  }, [isSpecialSingleOnlyList]);

  useEffect(() => {
    if (singleRows.length === 0) {
      setSelectedSolveId(undefined);
      return;
    }

    if (
      !hasManualSolveSelection.current ||
      selectedSolveId === undefined ||
      !singleRows.some((row) => row.solve.id === selectedSolveId)
    ) {
      setSelectedSolveId(singleRows[0]!.solve.id);
    }
  }, [selectedSolveId, singleRows]);

  useEffect(() => {
    if (averageWindows.length === 0) {
      setSelectedAverageKey(undefined);
      return;
    }

    const nextKey = `${averageWindows[0]!.averageType}:${getWindowRangeText(averageWindows[0]!)}`;
    if (
      !hasManualAverageSelection.current ||
      selectedAverageKey === undefined ||
      !averageWindows.some(
        (averageWindow) =>
          `${averageWindow.averageType}:${getWindowRangeText(averageWindow)}` ===
          selectedAverageKey,
      )
    ) {
      setSelectedAverageKey(nextKey);
    }
  }, [averageWindows, selectedAverageKey]);

  const handleScoreTypeChange = useCallback((nextScoreType: ScoreType) => {
    setScoreType(nextScoreType);
    setMode('scores');
  }, []);

  const handleStatsViewChange = useCallback((nextStatsView: StatsViewType) => {
    setStatsView(nextStatsView);
    setMode('stats');
  }, []);

  const handleSingleRowSelect = useCallback((row: SingleSolveRow) => {
    hasManualSolveSelection.current = true;
    setSelectedSolveId(row.solve.id);
    if (shouldOpenDetailSheet()) setSheetSolveId(row.solve.id);
  }, []);

  const handleAverageRowSelect = useCallback((averageWindow: RollingAverageWindow) => {
    const key = `${averageWindow.averageType}:${getWindowRangeText(averageWindow)}`;
    hasManualAverageSelection.current = true;
    setSelectedAverageKey(key);
    if (shouldOpenDetailSheet()) setSheetAverageKey(key);
  }, []);

  const handleDeleteSolve = useCallback((solveId: string) => {
    setDeleteCandidateSolveId(solveId);
  }, []);

  const handleCancelDeleteSolve = useCallback(() => {
    setDeleteCandidateSolveId(undefined);
  }, []);

  const handleConfirmDeleteSolve = useCallback(() => {
    const solveId = deleteCandidateSolveId;
    if (solveId === undefined) return;

    setDeleteCandidateSolveId(undefined);
    if (sheetSolveId === solveId) setSheetSolveId(undefined);
    if (selectedSolveId === solveId) setSelectedSolveId(undefined);
    void deleteSolve(solveId);
  }, [deleteCandidateSolveId, deleteSolve, selectedSolveId, sheetSolveId]);

  const handlePenaltyChange = useCallback(
    (solveId: string, penalty: SolvePenalty) => {
      void updateSolvePenalty(solveId, penalty);
    },
    [updateSolvePenalty],
  );
  const handleMultiBlindSave = useCallback(
    (
      solveId: string,
      multiBlind: MultiBlindSolveResult,
      penalty: Extract<SolvePenalty, 'none' | 'dnf'>,
    ) => {
      setMultiBlindEditSolveId(undefined);
      void updateSolveMultiBlind(solveId, multiBlind, penalty);
    },
    [updateSolveMultiBlind],
  );
  const multiBlindEditSolve = activeListSolveRecords.find(
    (solve) => solve.id === multiBlindEditSolveId && solve.multiBlind !== undefined,
  );

  const handleListChange = useCallback(
    (listId: string) => {
      void setActiveListId(listId);
    },
    [setActiveListId],
  );
  const handleDetailSheetContentClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <section className={styles.root} aria-label={copy.results.pageLabel}>
      <header className={styles.header}>
        <strong
          className={styles.brand}
          onMouseEnter={() => setIsBrandHovering(true)}
          onMouseLeave={() => setIsBrandHovering(false)}
        >
          <CubeginAnimatedIcon
            className={styles.brandLogo}
            isPlaying={isBrandHovering}
            size={32}
            title="Cubegin"
            trigger="manual"
          />
          <span
            className={styles.wordmark}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: wordmarkSvg }}
          />
        </strong>
        <ResultsListSelector
          activeListId={activeListId}
          copy={copy}
          lists={lists}
          onChange={handleListChange}
        />
      </header>

      <TimerTopNavigation isHidden={false} />

      <main className={bodyClassName}>
        <div className={contentClassName}>
          {hasNoSolves ? (
            <EmptyResultsPlaceholder copy={copy} />
          ) : (
            <>
              <header className={styles.resultsHeader}>
                <h1 className={styles.visuallyHidden}>{copy.results.title}</h1>
                <div className={styles.resultsViewBar}>
                  <ModeTabs activeMode={mode} copy={copy} onModeChange={setMode} />
                  <ScoreSwitch
                    activeMode={mode}
                    copy={copy}
                    scoreType={scoreType}
                    scoreTypes={scoreTypes}
                    statsView={statsView}
                    statsViews={statsViews}
                    onScoreTypeChange={handleScoreTypeChange}
                    onStatsViewChange={handleStatsViewChange}
                  />
                </div>
              </header>

              <section className={styles.listPane}>
                {error !== undefined ? (
                  <div className={styles.errorState} role="alert">
                    <span>{copy.results.localHistoryError}</span>
                    <button type="button" onClick={() => void retry()}>
                      {copy.results.retry}
                    </button>
                  </div>
                ) : null}

                {isLoading ? <div className={styles.loadingBlock} aria-hidden="true" /> : null}

                {mode === 'stats' ? (
                  <StatisticsView
                    copy={copy}
                    isFewestMoves={isFewestMovesList}
                    isMultiBlind={isMultiBlindList}
                    solves={activeListSolveRecords}
                    view={statsView}
                  />
                ) : isAverageScoreType(scoreType) ? (
                  <AverageTable
                    copy={copy}
                    scoreType={scoreType}
                    selectedWindowKey={selectedAverageKey}
                    windows={averageWindows}
                    onSelect={handleAverageRowSelect}
                  />
                ) : (
                  <SingleSolveTable
                    copy={copy}
                    isFewestMoves={isFewestMovesList}
                    isMultiBlind={isMultiBlindList}
                    rows={singleRows}
                    selectedSolveId={selectedSolveId}
                    onSelect={handleSingleRowSelect}
                  />
                )}
              </section>
            </>
          )}

          {shouldShowSolveDetail ? (
            <SolveDetail
              copy={copy}
              solve={selectedRow.solve}
              onDelete={handleDeleteSolve}
              onEditMultiBlind={setMultiBlindEditSolveId}
              onPenaltyChange={handlePenaltyChange}
            />
          ) : null}

          {shouldShowAverageDetail ? (
            <AverageDetail copy={copy} window={selectedAverageWindow} />
          ) : null}
        </div>
      </main>

      {sheetRow !== undefined ? (
        <div className={styles.detailSheetBackdrop} onClick={() => setSheetSolveId(undefined)}>
          <div
            className={styles.detailSheet}
            role="dialog"
            aria-modal="true"
            onClick={handleDetailSheetContentClick}
          >
            <button
              className={styles.sheetCloseButton}
              type="button"
              aria-label={copy.results.closeDetail}
              onClick={() => setSheetSolveId(undefined)}
            >
              <CloseIcon size={18} />
            </button>
            <SolveDetail
              copy={copy}
              solve={sheetRow.solve}
              onDelete={handleDeleteSolve}
              onEditMultiBlind={setMultiBlindEditSolveId}
              onPenaltyChange={handlePenaltyChange}
            />
          </div>
        </div>
      ) : null}

      {sheetAverageWindow !== undefined ? (
        <div className={styles.detailSheetBackdrop} onClick={() => setSheetAverageKey(undefined)}>
          <div
            className={styles.detailSheet}
            role="dialog"
            aria-modal="true"
            onClick={handleDetailSheetContentClick}
          >
            <button
              className={styles.sheetCloseButton}
              type="button"
              aria-label={copy.results.closeDetail}
              onClick={() => setSheetAverageKey(undefined)}
            >
              <CloseIcon size={18} />
            </button>
            <AverageDetail copy={copy} window={sheetAverageWindow} />
          </div>
        </div>
      ) : null}

      {deleteCandidateSolveId !== undefined ? (
        <DeleteSolveDialog
          copy={copy}
          onCancel={handleCancelDeleteSolve}
          onDelete={handleConfirmDeleteSolve}
        />
      ) : null}
      {multiBlindEditSolve !== undefined ? (
        <MultiBlindEditDialog
          copy={copy}
          solve={multiBlindEditSolve}
          onCancel={() => setMultiBlindEditSolveId(undefined)}
          onSave={handleMultiBlindSave}
        />
      ) : null}
    </section>
  );
};
