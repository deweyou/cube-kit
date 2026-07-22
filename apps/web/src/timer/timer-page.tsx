import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { CubeginAnimatedIcon } from '@cubegin/icons/react';
import { renderScrambleImage } from '@cubegin/scramble-image';
import { validateFewestMovesSolution, type FewestMovesValidation } from '@cubegin/solver';
import { EVENT_IDS, type EventId } from '@cubegin/shared/events';
import { formatTimerDisplay, resolveWcaInspectionPenalty } from '@cubegin/shared/preferences';
import {
  calculateFewestMovesStatistics,
  calculateMultiBlindStatistics,
  calculateSolveStatistics,
  formatFewestMovesMean,
  formatFewestMovesSolve,
  formatMultiBlindSolve,
  formatMilliseconds,
  getEventShortLabel,
  getMultiBlindTimeLimitMs,
  getSolveDisplayText,
  type RollingAverageStat,
  type FewestMovesSolveResult,
  type SolvePenalty,
  type SolveRecord,
  type SolveStatistics,
} from '@cubegin/shared/timer-session';
import { Checkbox } from '@deweyou-design/react/checkbox';
import { Select } from '@deweyou-design/react/select';
import { NumberInput } from '@deweyou-design/react/number-input';
import {
  AddIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  RefreshIcon,
  SettingsIcon,
  TrashIcon,
} from '@deweyou-design/react-icons';
import { getCubeginWordmarkSvg } from '../brand/wordmark';
import type { AppCopy } from '../preferences/app-copy';
import { useAppPreferences } from '../preferences/app-preferences';
import { resolveMultiBlindResultDraft } from '../timer-session/multi-blind-result-draft';
import { useTimerSessionStore, type TimerList } from '../timer-session/timer-session-store';
import { ScrambleImage } from './components/scramble-image';
import { ScrambleText } from './components/scramble-text';
import {
  FewestMovesWorkspace,
  type FewestMovesInverseDecision,
  type FewestMovesWorkspacePhase,
} from './components/fewest-moves-workspace';
import { useTimer } from './hooks/use-timer';
import {
  DEFAULT_MULTI_BLIND_CUBE_COUNT,
  MAX_MULTI_BLIND_CUBE_COUNT,
  MIN_MULTI_BLIND_CUBE_COUNT,
  getTimerScrambleGenerateOptions,
} from './scramble-prefetcher';
import { createTimerScrambleGenerator } from './scramble-worker-client';
import { TimerTopNavigation } from './timer-navigation';
import styles from './timer-page.module.css';

type TimerState = 'idle' | 'armed' | 'inspection' | 'inspection-armed' | 'timing' | 'stopped';
type TimerDisplayKind = 'clock' | 'label';
type TimerTimeWidth = 'wide' | 'max';
type TimerReadyAction = 'inspection' | 'solve';

interface TimerScrambleType {
  id: EventId;
  label: string;
}

const TIMER_SCRAMBLE_TYPES: TimerScrambleType[] = EVENT_IDS.map((eventId) => ({
  id: eventId,
  label: getEventShortLabel(eventId),
}));

const TIMER_ROLLING_STAT_SIZES = [3, 5, 12, 50, 100] as const;
const TIMER_ALWAYS_VISIBLE_ROLLING_STAT_LIMIT = 5;
const TIMER_RECENT_SOLVE_LIMIT = 12;
const WCA_INSPECTION_UNSUPPORTED_EVENT_IDS = new Set<EventId>([
  '333bld',
  '444bld',
  '555bld',
  '333mbld',
  '333fm',
]);
const FEWEST_MOVES_TIME_LIMIT_MS = 60 * 60_000;

const formatFewestMovesClock = (elapsedMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
const TIMER_FONT_SIZE_PRECISION = 4;
const TIMER_FONT_SIZE_SAFETY_STEP = 0.5;
const TIMER_MIN_FITTED_FONT_SIZE = 32;

interface SafeTimerFontSizeOptions {
  availableWidth: number;
  baseFontSize: number;
  minFontSize: number;
  renderedWidth: number;
}

export const getBufferedTimerWidth = (width: number) =>
  Math.max(0, width - Math.max(24, width * 0.06));

export const getSafeTimerFontSize = ({
  availableWidth,
  baseFontSize,
  minFontSize,
  renderedWidth,
}: SafeTimerFontSizeOptions) => {
  const bufferedWidth = getBufferedTimerWidth(availableWidth);

  if (bufferedWidth <= 0 || renderedWidth <= 0 || renderedWidth <= bufferedWidth) {
    return baseFontSize;
  }

  const scaledSize = (baseFontSize * bufferedWidth) / renderedWidth;
  const roundedDownSize =
    Math.floor(scaledSize * TIMER_FONT_SIZE_PRECISION) / TIMER_FONT_SIZE_PRECISION;

  return Math.max(
    minFontSize,
    Math.min(baseFontSize, roundedDownSize - TIMER_FONT_SIZE_SAFETY_STEP),
  );
};

type TimerListFormMode = 'create' | 'edit';

const isSpaceShortcut = (event: KeyboardEvent) => event.code === 'Space' || event.key === ' ';

const isEnterShortcut = (event: KeyboardEvent) => event.code === 'Enter' || event.key === 'Enter';

const isEscapeShortcut = (event: KeyboardEvent) =>
  event.code === 'Escape' || event.key === 'Escape';

const claimTimerShortcutEvent = (event: Event) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest('button, input, textarea, select, a, [contenteditable="true"]'));

const isTextEntryTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(target.closest('input, textarea, [contenteditable="true"]'));

interface StartTimerOptions {
  penalty?: SolvePenalty;
  resetFirst?: boolean;
}

interface TimerPageProps {
  isActive?: boolean;
}

interface TimerFocusSurfaceProps {
  hasStoppedSolve: boolean;
  copy: AppCopy['timer'];
  elapsedText: string;
  isFocusMode: boolean;
  isMultiBlind: boolean;
  label: string;
  placeholder?: string;
  stoppedPenalty: SolvePenalty;
  state: TimerState;
  onDeleteStoppedSolve: () => void;
  onEditMultiBlindResult: () => void;
  onStoppedPenaltyChange: (penalty: SolvePenalty) => void;
}

interface TimerElapsedDisplayProps {
  displayKind: TimerDisplayKind;
  elapsedText: string;
}

const formatSummaryStat = (elapsedMs: number | null, isAvailable: boolean) => {
  if (!isAvailable) return '--';
  if (elapsedMs === null) return 'DNF';
  return formatMilliseconds(elapsedMs);
};

const getTimerTimeWidth = (elapsedText: string): TimerTimeWidth => {
  if (elapsedText.length >= 9) return 'max';
  return 'wide';
};

const getTimerDisplayKind = (elapsedText: string): TimerDisplayKind => {
  if (/^[0-9:.+]+$/u.test(elapsedText)) return 'clock';
  return 'label';
};

const splitTimerElapsedText = (elapsedText: string) => {
  const fractionStart = elapsedText.indexOf('.');

  if (fractionStart === -1) {
    return { fraction: '', whole: elapsedText };
  }

  return {
    fraction: elapsedText.slice(fractionStart),
    whole: elapsedText.slice(0, fractionStart),
  };
};

const getTimerGlyphKind = (glyph: string) =>
  glyph === '.' || glyph === ':' ? 'separator' : 'digit';

const getRollingAverageStat = (
  rollingAverages: readonly RollingAverageStat[],
  size: number,
): RollingAverageStat | undefined =>
  rollingAverages.find((rollingAverage) => rollingAverage.size === size);

interface TimerListSelectorProps {
  activeListId: string;
  copy: AppCopy['timer'];
  lists: TimerList[];
  isHidden: boolean;
  onChange: (listId: string) => void;
  onCreateList: () => void;
  onEditList: () => void;
}

const TimerListSelector = ({
  activeListId,
  copy,
  isHidden,
  lists,
  onChange,
  onCreateList,
  onEditList,
}: TimerListSelectorProps) => (
  <Select.Root
    className={styles.listControl}
    aria-hidden={isHidden ? 'true' : undefined}
    data-hidden={isHidden ? 'true' : undefined}
    label={<span className={styles.visuallyHidden}>{copy.listSelectorLabel}</span>}
    value={[activeListId]}
    onValueChange={(nextValue) => {
      const nextListId = nextValue[0];
      if (nextListId) onChange(nextListId);
    }}
  >
    <Select.Trigger className={styles.listTrigger} />
    <Select.Content className={styles.listContent}>
      <div className={styles.listToolbar} role="toolbar" aria-label={copy.listToolbarLabel}>
        <span className={styles.listToolbarLabel}>{copy.listToolbarTitle}</span>
        <div className={styles.listToolbarActions}>
          <button
            className={styles.listToolbarButton}
            type="button"
            aria-label={copy.createList}
            title={copy.createList}
            onClick={onCreateList}
          >
            <AddIcon size={15} />
          </button>
          <button
            className={styles.listToolbarButton}
            type="button"
            aria-label={copy.editList}
            title={copy.editList}
            onClick={onEditList}
          >
            <EditIcon size={15} />
          </button>
        </div>
      </div>
      {lists.map((list) => (
        <Select.Item key={list.id} className={styles.listItem} value={list.id} label={list.name} />
      ))}
    </Select.Content>
  </Select.Root>
);

interface CreateListModalProps {
  copy: AppCopy['timer'];
  mode: TimerListFormMode;
  name: string;
  scrambleTypeId: EventId;
  onCancel: () => void;
  onNameChange: (name: string) => void;
  onScrambleTypeChange: (scrambleTypeId: EventId) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const CreateListModal = ({
  copy,
  mode,
  name,
  scrambleTypeId,
  onCancel,
  onNameChange,
  onScrambleTypeChange,
  onSubmit,
}: CreateListModalProps) => (
  <div className={styles.modalBackdrop}>
    <div
      className={styles.createListModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="timer-create-list-title"
    >
      <form
        className={styles.createListForm}
        aria-label={mode === 'create' ? copy.createListFormLabel : copy.editListFormLabel}
        onSubmit={onSubmit}
      >
        <h2 className={styles.modalTitle} id="timer-create-list-title">
          {mode === 'create' ? copy.createList : copy.editList}
        </h2>
        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>{copy.listNameLabel}</span>
          <input
            className={styles.fieldInput}
            autoFocus
            required
            value={name}
            onChange={(event) => onNameChange(event.currentTarget.value)}
          />
        </label>
        <div className={styles.fieldGroup}>
          <Select.Root
            className={styles.fieldSelect}
            label={<span className={styles.fieldLabel}>{copy.eventLabel}</span>}
            value={[scrambleTypeId]}
            onValueChange={(nextValue) => {
              const nextScrambleTypeId = nextValue[0] as EventId | undefined;
              if (nextScrambleTypeId) onScrambleTypeChange(nextScrambleTypeId);
            }}
          >
            <Select.Trigger className={styles.fieldSelectTrigger} />
            <Select.Content className={styles.fieldSelectContent}>
              {TIMER_SCRAMBLE_TYPES.map((scrambleType) => (
                <Select.Item
                  key={scrambleType.id}
                  className={styles.fieldSelectItem}
                  value={scrambleType.id}
                  label={scrambleType.label}
                />
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.secondaryButton} type="button" onClick={onCancel}>
            {copy.cancel}
          </button>
          <button className={styles.primaryButton} type="submit">
            {mode === 'create' ? copy.create : copy.save}
          </button>
        </div>
      </form>
    </div>
  </div>
);

interface MultiBlindSettingsDialogProps {
  copy: AppCopy['timer'];
  cubeCount: string;
  onCancel: () => void;
  onCubeCountChange: (cubeCount: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const MultiBlindSettingsDialog = ({
  copy,
  cubeCount,
  onCancel,
  onCubeCountChange,
  onSubmit,
}: MultiBlindSettingsDialogProps) => (
  <div className={styles.modalBackdrop}>
    <div
      className={`${styles.createListModal} ${styles.multiBlindSettingsModal}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="timer-multi-blind-settings-title"
    >
      <form className={styles.createListForm} onSubmit={onSubmit}>
        <h2 className={styles.modalTitle} id="timer-multi-blind-settings-title">
          {copy.multiBlindSettings}
        </h2>
        <NumberInput
          className={styles.multiBlindNumberInput}
          autoFocus
          decrementLabel={copy.decreaseValue}
          incrementLabel={copy.increaseValue}
          inputMode="numeric"
          label={copy.multiBlindCubeCountLabel}
          max={MAX_MULTI_BLIND_CUBE_COUNT}
          min={MIN_MULTI_BLIND_CUBE_COUNT}
          required
          size="sm"
          step={1}
          value={cubeCount}
          onValueChange={({ value }) => onCubeCountChange(value)}
        />
        <div className={styles.modalActions}>
          <button className={styles.secondaryButton} type="button" onClick={onCancel}>
            {copy.cancel}
          </button>
          <button className={styles.primaryButton} type="submit">
            {copy.apply}
          </button>
        </div>
      </form>
    </div>
  </div>
);

interface MultiBlindScrambleNavigation {
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onOpenSettings: () => void;
  onPrevious: () => void;
}

interface TimerScrambleStripProps {
  ariaLabel: string;
  copy: AppCopy['timer'];
  eventId: EventId;
  isLoading: boolean;
  multiBlindNavigation?: MultiBlindScrambleNavigation;
  scramble: string;
  onRefresh: () => void;
}

const TimerScrambleStrip = ({
  ariaLabel,
  copy,
  eventId,
  isLoading,
  multiBlindNavigation,
  scramble,
  onRefresh,
}: TimerScrambleStripProps) => (
  <section className={styles.scrambleStrip} aria-label={ariaLabel} data-scramble-event-id={eventId}>
    <div className={styles.scrambleText}>
      <ScrambleText scramble={scramble} isLoading={isLoading} />
      <div className={styles.scrambleToolbarSlot}>
        <div className={styles.scrambleToolbar}>
          {multiBlindNavigation ? (
            <>
              <button
                className={styles.scrambleToolbarButton}
                type="button"
                aria-label={copy.previousMultiBlindScramble}
                disabled={isLoading || multiBlindNavigation.currentIndex === 0}
                title={copy.previousMultiBlindScramble}
                onClick={multiBlindNavigation.onPrevious}
              >
                <ChevronLeftIcon size={18} />
              </button>
              <span
                className={styles.multiBlindPosition}
                role="status"
                aria-label={`${copy.multiBlindPositionLabel}: ${multiBlindNavigation.currentIndex + 1} / ${multiBlindNavigation.totalCount}`}
              >
                {multiBlindNavigation.currentIndex + 1} / {multiBlindNavigation.totalCount}
              </span>
              <button
                className={styles.scrambleToolbarButton}
                type="button"
                aria-label={copy.nextMultiBlindScramble}
                disabled={
                  isLoading ||
                  multiBlindNavigation.currentIndex >= multiBlindNavigation.totalCount - 1
                }
                title={copy.nextMultiBlindScramble}
                onClick={multiBlindNavigation.onNext}
              >
                <ChevronRightIcon size={18} />
              </button>
            </>
          ) : null}
          <button
            className={`${styles.scrambleToolbarButton} ${styles.scrambleRefreshButton}`}
            type="button"
            aria-label={copy.refreshScramble}
            data-loading={isLoading ? 'true' : 'false'}
            disabled={isLoading}
            title={copy.refreshScramble}
            onClick={onRefresh}
          >
            <RefreshIcon className={styles.scrambleRefreshIcon} size={18} />
          </button>
          {multiBlindNavigation ? (
            <button
              className={styles.scrambleToolbarButton}
              type="button"
              aria-label={copy.multiBlindSettings}
              title={copy.multiBlindSettings}
              onClick={multiBlindNavigation.onOpenSettings}
            >
              <SettingsIcon size={18} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  </section>
);

interface SummaryMetricProps {
  label: string;
  value: string;
}

const SummaryMetric = ({ label, value }: SummaryMetricProps) => (
  <div className={styles.summaryMetric}>
    <span className={styles.summaryLabel}>{label}</span>
    <strong className={styles.summaryValue}>{value}</strong>
  </div>
);

interface SummaryCountMetricProps {
  label: string;
  value: string;
}

const SummaryCountMetric = ({ label, value }: SummaryCountMetricProps) => (
  <div className={styles.summaryMetric} role="group" aria-label={label}>
    <strong className={styles.summaryValue}>{value}</strong>
  </div>
);

interface TimerSessionSummaryProps {
  copy: AppCopy['timer'];
  isFewestMoves: boolean;
  isMultiBlind: boolean;
  solveRecords: readonly SolveRecord[];
  statistics: SolveStatistics;
}

const TimerSessionSummary = ({
  copy,
  isFewestMoves,
  isMultiBlind,
  solveRecords,
  statistics,
}: TimerSessionSummaryProps) => {
  if (isFewestMoves) {
    const fewestMovesStatistics = calculateFewestMovesStatistics(solveRecords);
    return (
      <section className={styles.sessionSummary} aria-label={copy.summaryLabel}>
        <SummaryCountMetric
          label={copy.summaryCountLabel}
          value={`${fewestMovesStatistics.validCount}/${fewestMovesStatistics.totalCount}`}
        />
        <SummaryMetric
          label={copy.best}
          value={
            fewestMovesStatistics.bestSolve
              ? `${formatFewestMovesSolve(fewestMovesStatistics.bestSolve)} ${copy.fewestMovesMoveUnit}`
              : '--'
          }
        />
        <SummaryMetric
          label="mo3"
          value={formatFewestMovesMean(fewestMovesStatistics.currentMean)}
        />
        <SummaryMetric
          label="best mo3"
          value={formatFewestMovesMean(fewestMovesStatistics.bestMean)}
        />
      </section>
    );
  }

  if (isMultiBlind) {
    const multiBlindStatistics = calculateMultiBlindStatistics(solveRecords);
    return (
      <section className={styles.sessionSummary} aria-label={copy.summaryLabel}>
        <SummaryCountMetric
          label={copy.summaryCountLabel}
          value={`${multiBlindStatistics.validCount}/${multiBlindStatistics.totalCount}`}
        />
        <SummaryMetric
          label={copy.best}
          value={
            multiBlindStatistics.bestSolve
              ? formatMultiBlindSolve(multiBlindStatistics.bestSolve)
              : '--'
          }
        />
        <SummaryMetric
          label={copy.multiBlindBestScore}
          value={multiBlindStatistics.bestScore?.toString() ?? '--'}
        />
      </section>
    );
  }

  const rollingStats = TIMER_ROLLING_STAT_SIZES.filter(
    (size) => size <= TIMER_ALWAYS_VISIBLE_ROLLING_STAT_LIMIT || statistics.totalCount >= size,
  ).map((size) => ({
    label: size === 3 ? 'mo3' : `ao${size}`,
    stat: getRollingAverageStat(statistics.rollingAverages, size),
  }));

  return (
    <section className={styles.sessionSummary} aria-label={copy.summaryLabel}>
      <SummaryCountMetric
        label={copy.summaryCountLabel}
        value={`${statistics.validCount}/${statistics.totalCount}`}
      />
      <SummaryMetric
        label={copy.mean}
        value={formatSummaryStat(statistics.averageMs, statistics.totalCount > 0)}
      />
      <SummaryMetric
        label={copy.best}
        value={formatSummaryStat(statistics.bestMs, statistics.validCount > 0)}
      />
      {rollingStats.map(({ label, stat }) => (
        <SummaryMetric
          key={label}
          label={label}
          value={formatSummaryStat(stat?.currentMs ?? null, stat !== undefined)}
        />
      ))}
    </section>
  );
};

interface TimerRecentSolvesProps {
  label: string;
  solveRecords: readonly SolveRecord[];
}

const TimerRecentSolves = ({ label, solveRecords }: TimerRecentSolvesProps) => {
  const recentSolves = solveRecords.slice(0, TIMER_RECENT_SOLVE_LIMIT).reverse();

  if (recentSolves.length <= 1) return null;

  return (
    <section className={styles.recentRail} aria-label={label}>
      <ol className={styles.recentRailList}>
        {recentSolves.map((solveRecord) => (
          <li className={styles.recentRailItem} key={solveRecord.id}>
            <strong className={styles.recentRailTime}>
              {solveRecord.eventId === '333mbld'
                ? formatMultiBlindSolve(solveRecord)
                : solveRecord.eventId === '333fm'
                  ? formatFewestMovesSolve(solveRecord)
                  : getSolveDisplayText(solveRecord.elapsedMs, solveRecord.penalty)}
            </strong>
          </li>
        ))}
      </ol>
    </section>
  );
};

interface TimerScramblePreviewProps {
  eventId: EventId;
  label: string;
  svg: string;
}

const TimerScramblePreview = ({ eventId, label, svg }: TimerScramblePreviewProps) => (
  <aside className={styles.scramblePreview} aria-label={label}>
    {svg.length > 0 ? <ScrambleImage eventId={eventId} svg={svg} /> : null}
  </aside>
);

interface TimerFeedbackSlotProps {
  hasStoppedSolve: boolean;
  copy: AppCopy['timer'];
  isMultiBlind: boolean;
  placeholder?: string;
  stoppedPenalty: SolvePenalty;
  state: TimerState;
  onDeleteStoppedSolve: () => void;
  onEditMultiBlindResult: () => void;
  onStoppedPenaltyChange: (penalty: SolvePenalty) => void;
}

interface ResultToolbarProps {
  copy: AppCopy['timer'];
  isMultiBlind: boolean;
  penalty: SolvePenalty;
  onDelete: () => void;
  onEditMultiBlindResult: () => void;
  onPenaltyChange: (penalty: SolvePenalty) => void;
}

const ResultToolbar = ({
  copy,
  isMultiBlind,
  penalty,
  onDelete,
  onEditMultiBlindResult,
  onPenaltyChange,
}: ResultToolbarProps) => (
  <div
    className={styles.resultToolbar}
    data-compact={isMultiBlind ? 'true' : undefined}
    role="toolbar"
    aria-label={copy.resultToolbarLabel}
  >
    {isMultiBlind ? (
      <button
        className={styles.resultButton}
        type="button"
        aria-label={copy.editResult}
        title={copy.editResult}
        onClick={onEditMultiBlindResult}
      >
        <EditIcon size={18} />
      </button>
    ) : (
      <>
        <button
          className={styles.resultButton}
          type="button"
          aria-pressed={penalty === '+2'}
          data-active={penalty === '+2' ? 'true' : undefined}
          onClick={() => onPenaltyChange('+2')}
        >
          +2
        </button>
        <button
          className={styles.resultButton}
          type="button"
          aria-pressed={penalty === 'dnf'}
          data-active={penalty === 'dnf' ? 'true' : undefined}
          onClick={() => onPenaltyChange('dnf')}
        >
          DNF
        </button>
      </>
    )}
    <button
      className={`${styles.resultButton} ${styles.deleteResultButton}`}
      type="button"
      aria-label={copy.deleteResult}
      onClick={onDelete}
    >
      <TrashIcon className={styles.deleteIcon} size={18} />
    </button>
  </div>
);

const TimerFeedbackSlot = ({
  copy,
  hasStoppedSolve,
  isMultiBlind,
  onEditMultiBlindResult,
  placeholder,
  stoppedPenalty,
  state,
  onDeleteStoppedSolve,
  onStoppedPenaltyChange,
}: TimerFeedbackSlotProps) => (
  <div className={styles.feedbackSlot} data-feedback-slot="true" data-state={state}>
    {placeholder === undefined ? null : (
      <span className={styles.placeholder} aria-hidden="true">
        {placeholder}
      </span>
    )}
    {state === 'stopped' && (!isMultiBlind || hasStoppedSolve) ? (
      <ResultToolbar
        copy={copy}
        isMultiBlind={isMultiBlind}
        penalty={stoppedPenalty}
        onDelete={onDeleteStoppedSolve}
        onEditMultiBlindResult={onEditMultiBlindResult}
        onPenaltyChange={onStoppedPenaltyChange}
      />
    ) : null}
  </div>
);

interface MultiBlindResultDialogProps {
  attemptedCount: number;
  copy: AppCopy['timer'];
  isDnf: boolean;
  penaltyCount: string;
  solvedCount: string;
  onDiscard: () => void;
  onDnfChange: (isDnf: boolean) => void;
  onPenaltyCountChange: (value: string) => void;
  onSolvedCountChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const MultiBlindResultDialog = ({
  attemptedCount,
  copy,
  isDnf,
  penaltyCount,
  solvedCount,
  onDiscard,
  onDnfChange,
  onPenaltyCountChange,
  onSolvedCountChange,
  onSubmit,
}: MultiBlindResultDialogProps) => {
  const [isDiscardConfirmationOpen, setIsDiscardConfirmationOpen] = useState(false);
  const discardButtonRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreDiscardFocusRef = useRef(false);
  const solved = Number(solvedCount);
  const penalties = Number(penaltyCount);
  const isSolvedCountValid =
    solvedCount.trim() !== '' &&
    Number.isSafeInteger(solved) &&
    solved >= 0 &&
    solved <= attemptedCount;
  const penaltyCountMax = isSolvedCountValid ? solved : 0;
  const isPenaltyCountValid =
    penaltyCount.trim() !== '' &&
    Number.isSafeInteger(penalties) &&
    penalties >= 0 &&
    penalties <= penaltyCountMax;
  const hasSolvedCountError = !isDnf && solvedCount.trim() !== '' && !isSolvedCountValid;
  const hasPenaltyCountError = !isDnf && penaltyCount.trim() !== '' && !isPenaltyCountValid;
  const isValid = isDnf || (isSolvedCountValid && isPenaltyCountValid);
  const solvedCountError = copy.multiBlindSolvedCountError.replace(
    '{max}',
    attemptedCount.toString(),
  );
  const penaltyCountError = copy.multiBlindPenaltyCountError.replace(
    '{max}',
    penaltyCountMax.toString(),
  );

  useEffect(() => {
    if (isDiscardConfirmationOpen || !shouldRestoreDiscardFocusRef.current) return;
    shouldRestoreDiscardFocusRef.current = false;
    discardButtonRef.current?.focus();
  }, [isDiscardConfirmationOpen]);
  return (
    <>
      <div className={styles.modalBackdrop} hidden={isDiscardConfirmationOpen}>
        <div
          className={`${styles.createListModal} ${styles.multiBlindResultModal}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="timer-multi-blind-result-title"
        >
          <form className={styles.createListForm} onSubmit={onSubmit}>
            <h2 className={styles.modalTitle} id="timer-multi-blind-result-title">
              {copy.multiBlindResultTitle}
            </h2>
            <div className={styles.multiBlindResultFields}>
              <NumberInput
                className={styles.multiBlindNumberInput}
                autoFocus
                decrementLabel={copy.decreaseValue}
                disabled={isDnf}
                error={hasSolvedCountError ? solvedCountError : undefined}
                incrementLabel={copy.increaseValue}
                inputMode="numeric"
                label={copy.multiBlindSolvedCountLabel}
                max={attemptedCount}
                min={0}
                required={!isDnf}
                size="sm"
                step={1}
                value={solvedCount}
                onValueChange={({ value }) => onSolvedCountChange(value)}
              />
              <NumberInput
                className={styles.multiBlindNumberInput}
                decrementLabel={copy.decreaseValue}
                disabled={isDnf}
                error={hasPenaltyCountError ? penaltyCountError : undefined}
                incrementLabel={copy.increaseValue}
                inputMode="numeric"
                label={copy.multiBlindPenaltyCountLabel}
                max={penaltyCountMax}
                min={0}
                required={!isDnf}
                size="sm"
                step={1}
                value={penaltyCount}
                onValueChange={({ value }) => onPenaltyCountChange(value)}
              />
              <Checkbox
                checked={isDnf}
                className={styles.multiBlindCheckboxRow}
                onCheckedChange={onDnfChange}
              >
                {copy.multiBlindWholeDnfLabel}
              </Checkbox>
            </div>
            <div className={styles.modalActions}>
              <button
                className={`${styles.secondaryButton} ${styles.discardButton}`}
                ref={discardButtonRef}
                type="button"
                onClick={() => {
                  shouldRestoreDiscardFocusRef.current = true;
                  setIsDiscardConfirmationOpen(true);
                }}
              >
                {copy.discard}
              </button>
              <button className={styles.primaryButton} disabled={!isValid} type="submit">
                {copy.save}
              </button>
            </div>
          </form>
        </div>
      </div>
      {isDiscardConfirmationOpen ? (
        <div className={styles.modalBackdrop}>
          <div
            className={`${styles.createListModal} ${styles.deleteResultModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="timer-discard-result-title"
            aria-describedby="timer-discard-result-description"
          >
            <div className={styles.deleteResultContent}>
              <h2
                className={`${styles.modalTitle} ${styles.deleteResultTitle}`}
                id="timer-discard-result-title"
              >
                {copy.discardConfirmTitle}
              </h2>
              <p className={styles.deleteResultDescription} id="timer-discard-result-description">
                {copy.discardConfirmDescription}
              </p>
              <div className={styles.modalActions}>
                <button
                  autoFocus
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => setIsDiscardConfirmationOpen(false)}
                >
                  {copy.cancel}
                </button>
                <button
                  className={`${styles.primaryButton} ${styles.dangerButton}`}
                  type="button"
                  onClick={onDiscard}
                >
                  {copy.discardConfirmAction}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

interface DeleteResultDialogProps {
  copy: AppCopy['timer'];
  onCancel: () => void;
  onDelete: () => void;
}

const DeleteResultDialog = ({ copy, onCancel, onDelete }: DeleteResultDialogProps) => (
  <div className={styles.modalBackdrop}>
    <div
      className={`${styles.createListModal} ${styles.deleteResultModal}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="timer-delete-result-title"
      aria-describedby="timer-delete-result-description"
    >
      <div className={styles.deleteResultContent}>
        <h2
          className={`${styles.modalTitle} ${styles.deleteResultTitle}`}
          id="timer-delete-result-title"
        >
          {copy.deleteResultConfirmTitle}
        </h2>
        <p className={styles.deleteResultDescription} id="timer-delete-result-description">
          {copy.deleteResultConfirmDescription}
        </p>
        <div className={styles.modalActions}>
          <button className={styles.secondaryButton} type="button" onClick={onCancel}>
            {copy.cancel}
          </button>
          <button
            className={`${styles.primaryButton} ${styles.dangerButton}`}
            type="button"
            onClick={onDelete}
          >
            {copy.deleteResult}
          </button>
        </div>
      </div>
    </div>
  </div>
);

const TimerElapsedDisplay = ({ displayKind, elapsedText }: TimerElapsedDisplayProps) => {
  if (displayKind === 'label') {
    return (
      <span className={styles.timerText} data-timer-display="label" data-timer-text="true">
        <span className={styles.timerLabelText} data-timer-label-text="true">
          {elapsedText}
        </span>
      </span>
    );
  }

  const { fraction, whole } = splitTimerElapsedText(elapsedText);
  const renderGlyphs = (part: 'fraction' | 'whole', text: string) =>
    Array.from(text).map((glyph, index) => (
      <span
        className={styles.timerGlyph}
        data-timer-glyph={getTimerGlyphKind(glyph)}
        key={`${part}-${index}`}
      >
        {glyph}
      </span>
    ));

  return (
    <span className={styles.timerText} data-timer-display="clock" data-timer-text="true">
      <span className={styles.timerWhole} data-timer-part="whole">
        {renderGlyphs('whole', whole)}
      </span>
      {fraction.length > 0 ? (
        <span className={styles.timerFraction} data-timer-part="fraction">
          {renderGlyphs('fraction', fraction)}
        </span>
      ) : null}
    </span>
  );
};

const TimerFocusSurface = ({
  copy,
  elapsedText,
  hasStoppedSolve,
  isFocusMode,
  isMultiBlind,
  label,
  placeholder,
  stoppedPenalty,
  state,
  onDeleteStoppedSolve,
  onEditMultiBlindResult,
  onStoppedPenaltyChange,
}: TimerFocusSurfaceProps) => {
  const displayKind = getTimerDisplayKind(elapsedText);
  const timeWidth = getTimerTimeWidth(elapsedText);
  const timeFaceRef = useRef<HTMLSpanElement>(null);
  const timerFitKey = `${displayKind}:${timeWidth}:${elapsedText.length}`;

  useLayoutEffect(() => {
    const timeFace = timeFaceRef.current;
    const timerSurface = timeFace?.parentElement;
    const timerText = timeFace?.querySelector<HTMLElement>('[data-timer-text="true"]');

    if (!timeFace) {
      return;
    }

    timeFace.dataset.autoFit = 'fallback';
    timeFace.style.removeProperty('--timer-time-fitted-size');

    if (!timerSurface || !timerText || typeof ResizeObserver === 'undefined') {
      return;
    }

    let isDisposed = false;

    const measure = () => {
      if (isDisposed) {
        return;
      }

      timeFace.style.removeProperty('--timer-time-fitted-size');

      const availableWidth = timerSurface.clientWidth;
      const renderedWidth = timerText.scrollWidth;
      const baseFontSize = Number.parseFloat(getComputedStyle(timeFace).fontSize);

      if (
        availableWidth <= 0 ||
        renderedWidth <= 0 ||
        !Number.isFinite(baseFontSize) ||
        baseFontSize <= 0
      ) {
        return;
      }

      const fittedFontSize = getSafeTimerFontSize({
        availableWidth,
        baseFontSize,
        minFontSize: TIMER_MIN_FITTED_FONT_SIZE,
        renderedWidth,
      });

      timeFace.style.setProperty('--timer-time-fitted-size', `${fittedFontSize}px`);
      timeFace.dataset.autoFit = 'measured';
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(timerSurface);

    void document.fonts?.ready.then(measure);

    return () => {
      isDisposed = true;
      observer.disconnect();
    };
  }, [timerFitKey]);

  return (
    <div
      className={styles.timerSurface}
      role="timer"
      aria-keyshortcuts="Space Enter"
      aria-label={label}
      data-state={state}
      data-focus-mode={isFocusMode ? 'true' : 'false'}
    >
      <span
        ref={timeFaceRef}
        className={styles.timeFace}
        aria-live={state === 'timing' ? 'off' : 'polite'}
        data-auto-fit="fallback"
        data-timer-display={displayKind}
        data-time-width={timeWidth}
      >
        <TimerElapsedDisplay displayKind={displayKind} elapsedText={elapsedText} />
      </span>
      <TimerFeedbackSlot
        copy={copy}
        hasStoppedSolve={hasStoppedSolve}
        isMultiBlind={isMultiBlind}
        onEditMultiBlindResult={onEditMultiBlindResult}
        placeholder={placeholder}
        stoppedPenalty={stoppedPenalty}
        state={state}
        onDeleteStoppedSolve={onDeleteStoppedSolve}
        onStoppedPenaltyChange={onStoppedPenaltyChange}
      />
    </div>
  );
};

export const TimerPage = ({ isActive = true }: TimerPageProps) => {
  const { copy, preferences, resolvedTheme } = useAppPreferences();
  const {
    activeList,
    activeListId,
    activeListSolveRecords,
    addSolve,
    createList,
    deleteSolve,
    lists,
    setActiveListId,
    updateList,
    updateSolveFewestMoves,
    updateSolveMultiBlind,
    updateSolvePenalty,
  } = useTimerSessionStore();
  const timerCopy = copy.timer;
  const wordmarkSvg = getCubeginWordmarkSvg(resolvedTheme);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [finalElapsed, setFinalElapsed] = useState(0);
  const [inspectionElapsed, setInspectionElapsed] = useState(0);
  const [stoppedSolveId, setStoppedSolveId] = useState<string>();
  const [stoppedSolvePenalty, setStoppedSolvePenalty] = useState<SolvePenalty>('none');
  const [isDeleteResultDialogOpen, setIsDeleteResultDialogOpen] = useState(false);
  const [isBrandHovering, setIsBrandHovering] = useState(false);
  const [listFormMode, setListFormMode] = useState<TimerListFormMode>();
  const [editingListId, setEditingListId] = useState<string>();
  const [listFormName, setListFormName] = useState('');
  const [listFormScrambleTypeId, setListFormScrambleTypeId] = useState(TIMER_SCRAMBLE_TYPES[0].id);
  const latestScrambleRequestId = useRef(0);
  const inspectionStartedAt = useRef<number | undefined>(undefined);
  const pendingReadyAction = useRef<TimerReadyAction>('solve');
  const pendingSolvePenalty = useRef<SolvePenalty>('none');
  const pendingStoppedSolve = useRef<Promise<SolveRecord> | undefined>(undefined);
  const stoppedPenaltyRequestId = useRef(0);
  const keyboardClickSuppressionTarget = useRef<EventTarget | null>(null);
  const keyboardClickSuppressionTimeout = useRef<number | undefined>(undefined);
  const [activeScramble, setActiveScramble] = useState('');
  const [activeScrambleEventId, setActiveScrambleEventId] = useState<EventId>(
    TIMER_SCRAMBLE_TYPES[0].id,
  );
  const [scrambleError, setScrambleError] = useState<string>();
  const [isScrambleLoading, setIsScrambleLoading] = useState(true);
  const [activeMultiBlindScrambleIndex, setActiveMultiBlindScrambleIndex] = useState(0);
  const [multiBlindCubeCount, setMultiBlindCubeCount] = useState(DEFAULT_MULTI_BLIND_CUBE_COUNT);
  const [multiBlindCubeCountDraft, setMultiBlindCubeCountDraft] = useState(
    String(DEFAULT_MULTI_BLIND_CUBE_COUNT),
  );
  const [isMultiBlindSettingsOpen, setIsMultiBlindSettingsOpen] = useState(false);
  const [isMultiBlindResultOpen, setIsMultiBlindResultOpen] = useState(false);
  const [multiBlindSolvedCountDraft, setMultiBlindSolvedCountDraft] = useState('');
  const [multiBlindPenaltyCountDraft, setMultiBlindPenaltyCountDraft] = useState('0');
  const [isMultiBlindWholeDnfDraft, setIsMultiBlindWholeDnfDraft] = useState(false);
  const [fewestMovesPhase, setFewestMovesPhase] = useState<FewestMovesWorkspacePhase>('sealed');
  const [fewestMovesSolution, setFewestMovesSolution] = useState('');
  const [fewestMovesValidation, setFewestMovesValidation] = useState<FewestMovesValidation | null>(
    null,
  );
  const [fewestMovesReviewDecision, setFewestMovesReviewDecision] =
    useState<FewestMovesInverseDecision>(null);
  const [fewestMovesElapsedBase, setFewestMovesElapsedBase] = useState(0);
  const [isEditingFewestMovesResult, setIsEditingFewestMovesResult] = useState(false);
  const scrambleGenerator = useMemo(() => createTimerScrambleGenerator(), []);
  const { elapsed, start, stop, reset } = useTimer();

  const isActiveScrambleForList = activeScrambleEventId === activeList.scrambleTypeId;
  const isMultiBlindList = activeList.scrambleTypeId === '333mbld';
  const isFewestMovesList = activeList.scrambleTypeId === '333fm';
  const isWcaInspectionEnabled =
    preferences.wcaInspection &&
    !WCA_INSPECTION_UNSUPPORTED_EVENT_IDS.has(activeList.scrambleTypeId);
  const activeMultiBlindScrambles = useMemo(
    () =>
      activeScrambleEventId === '333mbld'
        ? activeScramble.split('\n').filter((scramble) => scramble.length > 0)
        : [],
    [activeScramble, activeScrambleEventId],
  );
  const selectedScramble = isMultiBlindList
    ? (activeMultiBlindScrambles[activeMultiBlindScrambleIndex] ?? '')
    : activeScramble;
  const multiBlindScrambleCount = activeMultiBlindScrambles.length || multiBlindCubeCount;
  const multiBlindTimeLimitMs = getMultiBlindTimeLimitMs(multiBlindScrambleCount);
  const stoppedSolve = useMemo(
    () => activeListSolveRecords.find((solveRecord) => solveRecord.id === stoppedSolveId),
    [activeListSolveRecords, stoppedSolveId],
  );
  const scrambleSvg = useMemo(
    () =>
      isActiveScrambleForList && selectedScramble.length > 0
        ? renderScrambleImage(activeList.scrambleTypeId, selectedScramble)
        : '',
    [activeList.scrambleTypeId, isActiveScrambleForList, selectedScramble],
  );
  const fewestMovesWorkspaceScramble = useMemo(() => {
    if (!isEditingFewestMovesResult || stoppedSolve === undefined) return activeScramble;
    return Array.isArray(stoppedSolve.scramble)
      ? (stoppedSolve.scramble[0] ?? '')
      : stoppedSolve.scramble;
  }, [activeScramble, isEditingFewestMovesResult, stoppedSolve]);
  const fewestMovesWorkspaceSvg = useMemo(
    () =>
      isFewestMovesList && fewestMovesWorkspaceScramble.length > 0
        ? renderScrambleImage('333fm', fewestMovesWorkspaceScramble)
        : '',
    [fewestMovesWorkspaceScramble, isFewestMovesList],
  );
  const displayScramble =
    scrambleError ??
    (isScrambleLoading || !isActiveScrambleForList ? timerCopy.scrambleLoading : selectedScramble);
  const statistics = useMemo(
    () => calculateSolveStatistics(activeListSolveRecords),
    [activeListSolveRecords],
  );
  const liveFewestMovesValidation = useMemo(
    () =>
      isFewestMovesList && activeScramble.length > 0 && fewestMovesSolution.trim().length > 0
        ? validateFewestMovesSolution({
            scramble: activeScramble,
            solution: fewestMovesSolution,
          })
        : null,
    [activeScramble, fewestMovesSolution, isFewestMovesList],
  );

  const clearStoppedSolveState = useCallback(() => {
    pendingStoppedSolve.current = undefined;
    stoppedPenaltyRequestId.current += 1;
    setStoppedSolveId(undefined);
    setStoppedSolvePenalty('none');
    setIsDeleteResultDialogOpen(false);
    setIsMultiBlindResultOpen(false);
  }, []);

  const openDeleteResultDialog = useCallback(() => {
    setIsDeleteResultDialogOpen(true);
  }, []);

  const closeDeleteResultDialog = useCallback(() => {
    setIsDeleteResultDialogOpen(false);
  }, []);

  const handleStoppedPenaltyChange = useCallback(
    (penalty: SolvePenalty) => {
      const requestId = stoppedPenaltyRequestId.current + 1;
      stoppedPenaltyRequestId.current = requestId;
      setStoppedSolvePenalty(penalty);

      void (async () => {
        const solveId = stoppedSolveId ?? (await pendingStoppedSolve.current)?.id;
        if (solveId === undefined || stoppedPenaltyRequestId.current !== requestId) return;

        setStoppedSolveId(solveId);
        await updateSolvePenalty(solveId, penalty);
      })();
    },
    [stoppedSolveId, updateSolvePenalty],
  );

  const handleDeleteStoppedSolve = useCallback(() => {
    const solveId = stoppedSolveId;
    const solvePromise = pendingStoppedSolve.current;

    pendingStoppedSolve.current = undefined;
    stoppedPenaltyRequestId.current += 1;
    setStoppedSolveId(undefined);
    setStoppedSolvePenalty('none');
    setIsDeleteResultDialogOpen(false);
    setFinalElapsed(0);
    reset();
    pendingSolvePenalty.current = 'none';
    pendingReadyAction.current = 'solve';
    inspectionStartedAt.current = undefined;
    setInspectionElapsed(0);
    setTimerState('idle');
    setFewestMovesPhase('sealed');
    setFewestMovesSolution('');
    setFewestMovesValidation(null);
    setFewestMovesReviewDecision(null);
    setFewestMovesElapsedBase(0);
    setIsEditingFewestMovesResult(false);

    void (async () => {
      const resolvedSolveId = solveId ?? (await solvePromise)?.id;
      if (resolvedSolveId === undefined) return;

      await deleteSolve(resolvedSolveId);
    })();
  }, [deleteSolve, reset, stoppedSolveId]);

  const openMultiBlindResultEditor = useCallback(() => {
    setMultiBlindSolvedCountDraft(stoppedSolve?.multiBlind?.solvedCount.toString() ?? '');
    setMultiBlindPenaltyCountDraft(stoppedSolve?.multiBlind?.timePenaltyCount?.toString() ?? '0');
    setIsMultiBlindWholeDnfDraft(stoppedSolve?.penalty === 'dnf');
    setIsMultiBlindResultOpen(true);
  }, [stoppedSolve]);

  const discardPendingMultiBlindResult = useCallback(() => {
    setIsMultiBlindResultOpen(false);
    if (stoppedSolveId !== undefined) return;

    setFinalElapsed(0);
    reset();
    setTimerState('idle');
  }, [reset, stoppedSolveId]);

  const handleMultiBlindResultSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const multiBlind = resolveMultiBlindResultDraft({
        attemptedCount: multiBlindScrambleCount,
        isDnf: isMultiBlindWholeDnfDraft,
        penaltyCount: multiBlindPenaltyCountDraft,
        solvedCount: multiBlindSolvedCountDraft,
      });
      if (!multiBlind) return;
      const penalty = isMultiBlindWholeDnfDraft ? 'dnf' : 'none';

      if (stoppedSolveId !== undefined) {
        void updateSolveMultiBlind(stoppedSolveId, multiBlind, penalty).then((updatedSolve) => {
          setStoppedSolvePenalty(updatedSolve.penalty);
        });
        setIsMultiBlindResultOpen(false);
        return;
      }

      const savedSolve = addSolve({
        elapsedMs: finalElapsed,
        eventId: '333mbld',
        listId: activeListId,
        multiBlind,
        penalty,
        scramble: activeScramble.split('\n').filter(Boolean),
      });
      pendingStoppedSolve.current = savedSolve;
      setStoppedSolvePenalty(penalty);
      setIsMultiBlindResultOpen(false);
      void savedSolve.then((solveRecord) => {
        if (pendingStoppedSolve.current !== savedSolve) return;
        setStoppedSolveId(solveRecord.id);
      });
    },
    [
      activeListId,
      activeScramble,
      addSolve,
      finalElapsed,
      isMultiBlindWholeDnfDraft,
      multiBlindPenaltyCountDraft,
      multiBlindScrambleCount,
      multiBlindSolvedCountDraft,
      stoppedSolveId,
      updateSolveMultiBlind,
    ],
  );

  const loadScramble = useCallback(
    async (eventId: EventId) => {
      const requestId = latestScrambleRequestId.current + 1;
      latestScrambleRequestId.current = requestId;
      setActiveScramble('');
      setActiveScrambleEventId(eventId);
      setActiveMultiBlindScrambleIndex(0);
      setScrambleError(undefined);
      setIsScrambleLoading(true);

      try {
        const result = await scrambleGenerator.generate(
          eventId,
          getTimerScrambleGenerateOptions(eventId, multiBlindCubeCount),
        );
        if (latestScrambleRequestId.current !== requestId) return;
        setActiveScrambleEventId(result.eventId);
        setActiveScramble(result.scramble);
      } catch (cause) {
        if (latestScrambleRequestId.current !== requestId) return;
        setScrambleError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (latestScrambleRequestId.current === requestId) {
          setIsScrambleLoading(false);
        }
      }
    },
    [multiBlindCubeCount, scrambleGenerator],
  );

  useEffect(() => {
    return () => {
      scrambleGenerator.dispose?.();
    };
  }, [scrambleGenerator]);

  useEffect(() => {
    void loadScramble(activeList.scrambleTypeId);
  }, [activeList.scrambleTypeId, loadScramble]);

  const showPreviousMultiBlindScramble = useCallback(() => {
    setActiveMultiBlindScrambleIndex((currentIndex) => Math.max(0, currentIndex - 1));
  }, []);

  const showNextMultiBlindScramble = useCallback(() => {
    setActiveMultiBlindScrambleIndex((currentIndex) =>
      Math.min(multiBlindScrambleCount - 1, currentIndex + 1),
    );
  }, [multiBlindScrambleCount]);

  const openMultiBlindSettings = useCallback(() => {
    setMultiBlindCubeCountDraft(String(multiBlindCubeCount));
    setIsMultiBlindSettingsOpen(true);
  }, [multiBlindCubeCount]);

  const closeMultiBlindSettings = useCallback(() => {
    setMultiBlindCubeCountDraft(String(multiBlindCubeCount));
    setIsMultiBlindSettingsOpen(false);
  }, [multiBlindCubeCount]);

  const handleMultiBlindSettingsSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const nextCubeCount = Number(multiBlindCubeCountDraft);
      if (
        !Number.isSafeInteger(nextCubeCount) ||
        nextCubeCount < MIN_MULTI_BLIND_CUBE_COUNT ||
        nextCubeCount > MAX_MULTI_BLIND_CUBE_COUNT
      ) {
        return;
      }

      setIsMultiBlindSettingsOpen(false);
      setActiveMultiBlindScrambleIndex(0);
      setMultiBlindCubeCount(nextCubeCount);
    },
    [multiBlindCubeCountDraft],
  );

  useEffect(() => {
    if (timerState !== 'inspection' && timerState !== 'inspection-armed') return undefined;

    let animationFrameId: number | undefined;

    const tickInspection = () => {
      const startedAt = inspectionStartedAt.current;
      if (startedAt !== undefined) {
        setInspectionElapsed(Math.max(0, performance.now() - startedAt));
      }

      animationFrameId = window.requestAnimationFrame(tickInspection);
    };

    animationFrameId = window.requestAnimationFrame(tickInspection);

    return () => {
      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [timerState]);

  const startTimer = useCallback(
    ({ penalty = 'none', resetFirst = true }: StartTimerOptions = {}) => {
      clearStoppedSolveState();

      if (isFewestMovesList) {
        reset();
        setFinalElapsed(0);
        setFewestMovesElapsedBase(0);
        setFewestMovesSolution('');
        setFewestMovesValidation(null);
        setFewestMovesReviewDecision(null);
        setIsEditingFewestMovesResult(false);
        setFewestMovesPhase('attempt');
        start();
        setTimerState('timing');
        return;
      }

      if (resetFirst) {
        reset();
        setFinalElapsed(0);
      }

      pendingSolvePenalty.current = penalty;
      pendingReadyAction.current = 'solve';
      inspectionStartedAt.current = undefined;
      setInspectionElapsed(0);
      start();
      setTimerState('timing');
    },
    [clearStoppedSolveState, isFewestMovesList, reset, start],
  );

  const persistFewestMovesResult = useCallback(
    ({
      attemptDurationMs,
      decision,
      scramble,
      validation,
    }: {
      attemptDurationMs: number;
      decision: Exclude<FewestMovesInverseDecision, null> | null;
      scramble: string;
      validation: FewestMovesValidation;
    }) => {
      const isDnf =
        validation.status === 'dnf' ||
        (validation.status === 'suspected-inverse' && decision === 'dnf');
      const fewestMoves: FewestMovesSolveResult = {
        attemptDurationMs,
        executionMoveCount: validation.executionMoveCount,
        inverseScrambleReview:
          validation.status === 'suspected-inverse'
            ? decision === 'dnf'
              ? 'confirmed'
              : 'dismissed'
            : validation.reason === 'inverse-scramble'
              ? 'confirmed'
              : 'not-suspected',
        moveCount: isDnf ? null : validation.moveCount,
        normalizedSolution: validation.normalizedSolution,
        rawSolution: validation.rawSolution,
        rulesVersion: 'wca-2026-04-01',
        validationReason: isDnf ? (validation.reason ?? 'manual') : null,
        validationStatus: isDnf ? 'dnf' : 'valid',
      };
      const penalty = isDnf ? 'dnf' : 'none';

      if (stoppedSolveId !== undefined) {
        void updateSolveFewestMoves(stoppedSolveId, fewestMoves, penalty).then((updatedSolve) => {
          setStoppedSolvePenalty(updatedSolve.penalty);
        });
      } else {
        const savedSolve = addSolve({
          elapsedMs: attemptDurationMs,
          eventId: '333fm',
          fewestMoves,
          listId: activeListId,
          penalty,
          scramble,
        });
        pendingStoppedSolve.current = savedSolve;
        void savedSolve.then((solveRecord) => {
          if (pendingStoppedSolve.current !== savedSolve) return;
          setStoppedSolveId(solveRecord.id);
          setStoppedSolvePenalty(solveRecord.penalty);
        });
      }

      setIsEditingFewestMovesResult(false);
      setFewestMovesReviewDecision(decision);
      setFewestMovesPhase('stopped');
      void loadScramble('333fm');
    },
    [activeListId, addSolve, loadScramble, stoppedSolveId, updateSolveFewestMoves],
  );

  const submitFewestMovesAttempt = useCallback(() => {
    if (!isFewestMovesList) return;

    const stoppedElapsed = isEditingFewestMovesResult
      ? finalElapsed
      : Math.min(FEWEST_MOVES_TIME_LIMIT_MS, fewestMovesElapsedBase + stop());
    const validationScramble =
      isEditingFewestMovesResult && stoppedSolve
        ? Array.isArray(stoppedSolve.scramble)
          ? (stoppedSolve.scramble[0] ?? '')
          : stoppedSolve.scramble
        : activeScramble;
    const validation = validateFewestMovesSolution({
      scramble: validationScramble,
      solution: fewestMovesSolution,
    });

    setFinalElapsed(stoppedElapsed);
    setFewestMovesValidation(validation);
    setFewestMovesReviewDecision(null);
    setTimerState('stopped');

    if (validation.status === 'suspected-inverse') {
      setFewestMovesPhase('result');
      return;
    }

    persistFewestMovesResult({
      attemptDurationMs: stoppedElapsed,
      decision: null,
      scramble: validationScramble,
      validation,
    });
  }, [
    activeScramble,
    fewestMovesElapsedBase,
    fewestMovesSolution,
    finalElapsed,
    isEditingFewestMovesResult,
    isFewestMovesList,
    persistFewestMovesResult,
    stop,
    stoppedSolve,
  ]);

  const handleFewestMovesInverseDecision = useCallback(
    (decision: Exclude<FewestMovesInverseDecision, null>) => {
      const validation = fewestMovesValidation;
      if (validation?.status !== 'suspected-inverse') return;

      persistFewestMovesResult({
        attemptDurationMs: finalElapsed,
        decision,
        scramble: fewestMovesWorkspaceScramble,
        validation,
      });
    },
    [fewestMovesValidation, fewestMovesWorkspaceScramble, finalElapsed, persistFewestMovesResult],
  );

  const editFewestMovesResult = useCallback(() => {
    const solve = stoppedSolve;
    const result = solve?.fewestMoves;
    if (solve === undefined || result === undefined) return;
    setFewestMovesSolution(result.rawSolution);
    setFewestMovesValidation(
      validateFewestMovesSolution({
        scramble: Array.isArray(solve.scramble) ? (solve.scramble[0] ?? '') : solve.scramble,
        solution: result.rawSolution,
      }),
    );
    setFewestMovesReviewDecision(
      result.inverseScrambleReview === 'confirmed'
        ? 'dnf'
        : result.inverseScrambleReview === 'dismissed'
          ? 'keep'
          : null,
    );
    setIsEditingFewestMovesResult(true);
    setFewestMovesPhase('attempt');
  }, [stoppedSolve]);

  const startInspection = useCallback(() => {
    clearStoppedSolveState();
    reset();
    setFinalElapsed(0);
    setInspectionElapsed(0);
    pendingSolvePenalty.current = 'none';
    pendingReadyAction.current = 'solve';
    inspectionStartedAt.current = performance.now();
    setTimerState('inspection');
  }, [clearStoppedSolveState, reset]);

  const armInspection = useCallback(() => {
    clearStoppedSolveState();
    reset();
    setFinalElapsed(0);
    setInspectionElapsed(0);
    pendingSolvePenalty.current = 'none';
    pendingReadyAction.current = 'inspection';
    inspectionStartedAt.current = undefined;
    setTimerState('armed');
  }, [clearStoppedSolveState, reset]);

  const cancelInspection = useCallback(() => {
    clearStoppedSolveState();
    reset();
    setFinalElapsed(0);
    setInspectionElapsed(0);
    pendingSolvePenalty.current = 'none';
    pendingReadyAction.current = 'solve';
    inspectionStartedAt.current = undefined;
    setTimerState('idle');
  }, [clearStoppedSolveState, reset]);

  const startTimerFromInspection = useCallback(() => {
    const startedAt = inspectionStartedAt.current;
    const elapsedInspectionMs =
      startedAt === undefined ? inspectionElapsed : Math.max(0, performance.now() - startedAt);

    startTimer({
      penalty: resolveWcaInspectionPenalty(elapsedInspectionMs),
      resetFirst: true,
    });
  }, [inspectionElapsed, startTimer]);

  const armTimerFromInspection = useCallback(() => {
    const startedAt = inspectionStartedAt.current;
    if (startedAt !== undefined) {
      setInspectionElapsed(Math.max(0, performance.now() - startedAt));
    }

    setTimerState('inspection-armed');
  }, []);

  const stopTimer = useCallback(() => {
    if (isFewestMovesList) {
      submitFewestMovesAttempt();
      return;
    }

    const stoppedElapsed = stop();
    const solvePenalty = pendingSolvePenalty.current;
    setFinalElapsed(stoppedElapsed);
    setStoppedSolveId(undefined);
    setStoppedSolvePenalty(solvePenalty);
    setIsDeleteResultDialogOpen(false);
    pendingSolvePenalty.current = 'none';
    pendingReadyAction.current = 'solve';
    setTimerState('stopped');

    if (isMultiBlindList) {
      setMultiBlindSolvedCountDraft(String(multiBlindScrambleCount));
      setMultiBlindPenaltyCountDraft('0');
      setIsMultiBlindWholeDnfDraft(false);
      setIsMultiBlindResultOpen(true);
      return;
    }

    const savedSolve = addSolve({
      elapsedMs: stoppedElapsed,
      eventId: activeList.scrambleTypeId,
      listId: activeListId,
      penalty: solvePenalty,
      scramble: activeScramble,
    });

    pendingStoppedSolve.current = savedSolve;
    void savedSolve.then((solveRecord) => {
      if (pendingStoppedSolve.current !== savedSolve) return;

      setStoppedSolveId(solveRecord.id);
      setStoppedSolvePenalty(solveRecord.penalty);
    });
  }, [
    activeList.scrambleTypeId,
    activeListId,
    activeScramble,
    addSolve,
    isMultiBlindList,
    isFewestMovesList,
    multiBlindScrambleCount,
    stop,
    submitFewestMovesAttempt,
  ]);

  const armTimer = useCallback(() => {
    clearStoppedSolveState();
    reset();
    setFinalElapsed(0);
    setInspectionElapsed(0);
    pendingSolvePenalty.current = 'none';
    pendingReadyAction.current = 'solve';
    inspectionStartedAt.current = undefined;
    setTimerState('armed');
  }, [clearStoppedSolveState, reset]);

  useEffect(() => {
    if (
      !isFewestMovesList ||
      fewestMovesPhase !== 'attempt' ||
      isEditingFewestMovesResult ||
      fewestMovesElapsedBase + elapsed < FEWEST_MOVES_TIME_LIMIT_MS
    ) {
      return;
    }

    submitFewestMovesAttempt();
  }, [
    elapsed,
    fewestMovesElapsedBase,
    fewestMovesPhase,
    isEditingFewestMovesResult,
    isFewestMovesList,
    submitFewestMovesAttempt,
  ]);

  const cancelReady = useCallback(() => {
    clearStoppedSolveState();
    reset();
    setFinalElapsed(0);
    setInspectionElapsed(0);
    pendingSolvePenalty.current = 'none';
    pendingReadyAction.current = 'solve';
    inspectionStartedAt.current = undefined;
    setTimerState('idle');
    if (isFewestMovesList) {
      setFewestMovesPhase('sealed');
      setFewestMovesSolution('');
      setFewestMovesValidation(null);
      setFewestMovesReviewDecision(null);
      setFewestMovesElapsedBase(0);
      setIsEditingFewestMovesResult(false);
    }
  }, [clearStoppedSolveState, isFewestMovesList, reset]);

  const resetListForm = useCallback(() => {
    setListFormName('');
    setListFormScrambleTypeId(activeList.scrambleTypeId);
    setEditingListId(undefined);
  }, [activeList.scrambleTypeId]);

  const closeListFormModal = useCallback(() => {
    setListFormMode(undefined);
    resetListForm();
  }, [resetListForm]);

  const openCreateListModal = useCallback(() => {
    setEditingListId(undefined);
    setListFormName('');
    setListFormScrambleTypeId(activeList.scrambleTypeId);
    setListFormMode('create');
  }, [activeList.scrambleTypeId]);

  const openEditListModal = useCallback(() => {
    setEditingListId(activeList.id);
    setListFormName(activeList.name);
    setListFormScrambleTypeId(activeList.scrambleTypeId);
    setListFormMode('edit');
  }, [activeList.id, activeList.name, activeList.scrambleTypeId]);

  const handleListChange = useCallback(
    (nextListId: string) => {
      clearStoppedSolveState();
      reset();
      setFinalElapsed(0);
      setInspectionElapsed(0);
      pendingSolvePenalty.current = 'none';
      pendingReadyAction.current = 'solve';
      inspectionStartedAt.current = undefined;
      setTimerState('idle');
      setFewestMovesPhase('sealed');
      setFewestMovesSolution('');
      setFewestMovesValidation(null);
      setFewestMovesReviewDecision(null);
      setFewestMovesElapsedBase(0);
      setIsEditingFewestMovesResult(false);
      void setActiveListId(nextListId);
    },
    [clearStoppedSolveState, reset, setActiveListId],
  );

  const handleListFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const name = listFormName.trim();
      if (name.length === 0) return;

      if (listFormMode === 'edit') {
        const listId = editingListId;
        if (listId === undefined) return;

        setListFormMode(undefined);
        setEditingListId(undefined);
        setListFormName('');
        setListFormScrambleTypeId(listFormScrambleTypeId);
        void updateList({ listId, name, scrambleTypeId: listFormScrambleTypeId });
        return;
      }

      setListFormMode(undefined);
      setEditingListId(undefined);
      setListFormName('');
      setListFormScrambleTypeId(listFormScrambleTypeId);
      void createList({ name, scrambleTypeId: listFormScrambleTypeId });
    },
    [createList, editingListId, listFormMode, listFormName, listFormScrambleTypeId, updateList],
  );

  useEffect(() => {
    if (!isActive || isMultiBlindResultOpen) return undefined;

    const clearKeyboardClickSuppression = () => {
      keyboardClickSuppressionTarget.current = null;
      if (keyboardClickSuppressionTimeout.current !== undefined) {
        window.clearTimeout(keyboardClickSuppressionTimeout.current);
        keyboardClickSuppressionTimeout.current = undefined;
      }
    };

    const suppressNextKeyboardClick = (target: EventTarget | null) => {
      keyboardClickSuppressionTarget.current = target;
      if (keyboardClickSuppressionTimeout.current !== undefined) {
        window.clearTimeout(keyboardClickSuppressionTimeout.current);
      }

      keyboardClickSuppressionTimeout.current = window.setTimeout(() => {
        clearKeyboardClickSuppression();
      }, 250);
    };

    const isSuppressedKeyboardClick = (event: MouseEvent) => {
      if (event.detail !== 0) return false;

      const suppressedTarget = keyboardClickSuppressionTarget.current;
      if (!(suppressedTarget instanceof Node)) return false;

      const eventTarget = event.target;
      return (
        event.composedPath().includes(suppressedTarget) ||
        (eventTarget instanceof Node &&
          (eventTarget === suppressedTarget || suppressedTarget.contains(eventTarget)))
      );
    };

    const handleClick = (event: MouseEvent) => {
      if (!isSuppressedKeyboardClick(event)) return;

      clearKeyboardClickSuppression();
      claimTimerShortcutEvent(event);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEscapeShortcut(event)) {
        if (timerState === 'inspection' || timerState === 'inspection-armed') {
          claimTimerShortcutEvent(event);
          cancelInspection();
          return;
        }

        if (timerState === 'armed') {
          claimTimerShortcutEvent(event);
          cancelReady();
        }

        return;
      }

      if (isSpaceShortcut(event)) {
        if (isTextEntryTarget(event.target)) {
          return;
        }

        claimTimerShortcutEvent(event);
        suppressNextKeyboardClick(event.target);

        if (event.repeat) {
          return;
        }

        if (timerState === 'timing') {
          stopTimer();
          return;
        }

        if (timerState === 'inspection') {
          armTimerFromInspection();
          return;
        }

        if (timerState === 'inspection-armed' || timerState === 'armed') {
          return;
        }

        if (isWcaInspectionEnabled) {
          armInspection();
          return;
        }

        armTimer();
        return;
      }

      if (!isEnterShortcut(event)) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      claimTimerShortcutEvent(event);

      if (event.repeat) {
        return;
      }

      if (timerState === 'timing') {
        stopTimer();
        return;
      }

      if (timerState === 'inspection' || timerState === 'inspection-armed') {
        startTimerFromInspection();
        return;
      }

      if (timerState === 'armed') {
        if (pendingReadyAction.current === 'inspection') {
          startInspection();
          return;
        }

        startTimer({ resetFirst: false });
        return;
      }

      if (isWcaInspectionEnabled) {
        startInspection();
        return;
      }

      startTimer();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isSpaceShortcut(event) || isTextEntryTarget(event.target)) {
        return;
      }

      claimTimerShortcutEvent(event);

      if (timerState === 'armed') {
        if (pendingReadyAction.current === 'inspection') {
          startInspection();
          return;
        }

        startTimer({ resetFirst: false });
        return;
      }

      if (timerState === 'inspection-armed') {
        startTimerFromInspection();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('click', handleClick, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('click', handleClick, { capture: true });
    };
  }, [
    armTimer,
    armInspection,
    armTimerFromInspection,
    cancelInspection,
    cancelReady,
    isActive,
    isMultiBlindResultOpen,
    isWcaInspectionEnabled,
    startInspection,
    startTimer,
    startTimerFromInspection,
    stopTimer,
    timerState,
  ]);

  useEffect(
    () => () => {
      if (keyboardClickSuppressionTimeout.current !== undefined) {
        window.clearTimeout(keyboardClickSuppressionTimeout.current);
      }
    },
    [],
  );

  const isTimerInspectionState = timerState === 'inspection' || timerState === 'inspection-armed';
  const isTimerReadyState = timerState === 'armed' || timerState === 'inspection-armed';
  const displayElapsed =
    timerState === 'stopped' ? finalElapsed : isTimerInspectionState ? inspectionElapsed : elapsed;
  const timerDisplayPhase = isTimerInspectionState
    ? 'inspection'
    : timerState === 'timing'
      ? 'solve'
      : 'final';
  const multiBlindTimeDifferenceMs = multiBlindTimeLimitMs - elapsed;
  const multiBlindTimerClock = formatTimerDisplay({
    elapsedMs: Math.abs(multiBlindTimeDifferenceMs),
    mode: 'seconds',
    phase: 'solve',
    timingText: timerCopy.timingDisplayText,
  });
  const multiBlindTimerText = `${multiBlindTimeDifferenceMs < 0 ? '+' : ''}${
    Math.abs(multiBlindTimeDifferenceMs) < 60_000
      ? `0:${multiBlindTimerClock.padStart(2, '0')}`
      : multiBlindTimerClock
  }`;
  const elapsedText =
    timerState === 'stopped'
      ? isMultiBlindList && stoppedSolve?.multiBlind
        ? formatMultiBlindSolve(stoppedSolve)
        : getSolveDisplayText(finalElapsed, stoppedSolvePenalty)
      : isMultiBlindList && !isTimerInspectionState
        ? multiBlindTimerText
        : formatTimerDisplay({
            elapsedMs: displayElapsed,
            mode: preferences.timerDisplayMode,
            phase: timerDisplayPhase,
            timingText: timerCopy.timingDisplayText,
          });
  const isTimerFocusMode = isTimerReadyState || isTimerInspectionState || timerState === 'timing';
  const isTimerRunning = timerState === 'timing';
  const timerLabel =
    timerState === 'timing'
      ? timerCopy.timingLabel
      : timerState === 'inspection'
        ? timerCopy.inspectionLabel
        : isTimerReadyState
          ? timerCopy.armedLabel
          : timerCopy.idleLabel;
  const placeholder = isTimerReadyState || isTimerInspectionState ? timerCopy.escCancel : undefined;
  const currentFewestMovesElapsed =
    fewestMovesPhase === 'attempt' && !isEditingFewestMovesResult
      ? fewestMovesElapsedBase + elapsed
      : finalElapsed;
  const fewestMovesRemainingMs = Math.max(
    0,
    FEWEST_MOVES_TIME_LIMIT_MS - currentFewestMovesElapsed,
  );
  const fewestMovesElapsedText =
    fewestMovesPhase === 'stopped'
      ? formatFewestMovesClock(finalElapsed)
      : formatFewestMovesClock(fewestMovesRemainingMs);
  const displayedFewestMovesValidation =
    fewestMovesPhase === 'attempt' ? liveFewestMovesValidation : fewestMovesValidation;
  const isFewestMovesActiveWorkspace = isFewestMovesList && fewestMovesPhase === 'attempt';

  return (
    <section
      className={styles.root}
      aria-label={timerCopy.pageLabel}
      data-focus-mode={isTimerFocusMode ? 'true' : 'false'}
      data-fewest-moves-active={isFewestMovesActiveWorkspace ? 'true' : 'false'}
      data-fewest-moves-list={isFewestMovesList ? 'true' : 'false'}
      data-timer-running={isTimerRunning ? 'true' : 'false'}
      hidden={!isActive}
    >
      <header className={styles.hero}>
        <div className={styles.brandRow}>
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
          <TimerListSelector
            activeListId={activeListId}
            copy={timerCopy}
            isHidden={isTimerRunning}
            lists={lists}
            onChange={handleListChange}
            onCreateList={openCreateListModal}
            onEditList={openEditListModal}
          />
        </div>
        {isFewestMovesList ? null : (
          <TimerScrambleStrip
            ariaLabel={timerCopy.currentScrambleLabel}
            copy={timerCopy}
            eventId={activeList.scrambleTypeId}
            isLoading={isScrambleLoading}
            multiBlindNavigation={
              isMultiBlindList
                ? {
                    currentIndex: activeMultiBlindScrambleIndex,
                    totalCount: multiBlindScrambleCount,
                    onNext: showNextMultiBlindScramble,
                    onOpenSettings: openMultiBlindSettings,
                    onPrevious: showPreviousMultiBlindScramble,
                  }
                : undefined
            }
            scramble={displayScramble}
            onRefresh={() => void loadScramble(activeList.scrambleTypeId)}
          />
        )}
      </header>

      <TimerTopNavigation isHidden={isTimerRunning} />

      {isFewestMovesList ? (
        <FewestMovesWorkspace
          copy={timerCopy}
          elapsedText={fewestMovesElapsedText}
          isArmed={timerState === 'armed'}
          isStartDisabled={isScrambleLoading || activeScramble.length === 0}
          phase={fewestMovesPhase}
          reviewDecision={fewestMovesReviewDecision}
          scramble={fewestMovesWorkspaceScramble}
          solution={fewestMovesSolution}
          svg={fewestMovesWorkspaceSvg}
          validation={displayedFewestMovesValidation}
          onDelete={openDeleteResultDialog}
          onEdit={editFewestMovesResult}
          onInverseDecision={handleFewestMovesInverseDecision}
          onSolutionChange={setFewestMovesSolution}
          onStart={() => startTimer()}
          onSubmit={submitFewestMovesAttempt}
        />
      ) : (
        <main className={styles.stage} aria-label={timerCopy.mainTimerLabel}>
          <TimerFocusSurface
            copy={timerCopy}
            elapsedText={elapsedText}
            hasStoppedSolve={stoppedSolveId !== undefined}
            isFocusMode={isTimerFocusMode}
            isMultiBlind={isMultiBlindList}
            label={timerLabel}
            placeholder={placeholder}
            stoppedPenalty={stoppedSolvePenalty}
            state={timerState}
            onDeleteStoppedSolve={openDeleteResultDialog}
            onEditMultiBlindResult={openMultiBlindResultEditor}
            onStoppedPenaltyChange={handleStoppedPenaltyChange}
          />
          <TimerRecentSolves
            label={timerCopy.recentSolvesLabel}
            solveRecords={activeListSolveRecords}
          />
        </main>
      )}
      <footer className={styles.bottomDock} aria-label={timerCopy.bottomInfoLabel}>
        <TimerSessionSummary
          copy={timerCopy}
          isFewestMoves={isFewestMovesList}
          isMultiBlind={isMultiBlindList}
          solveRecords={activeListSolveRecords}
          statistics={statistics}
        />
        {isFewestMovesList ? null : (
          <TimerScramblePreview
            eventId={activeList.scrambleTypeId}
            label={timerCopy.scrambleImageLabel}
            svg={scrambleSvg}
          />
        )}
      </footer>
      {listFormMode !== undefined ? (
        <CreateListModal
          copy={timerCopy}
          mode={listFormMode}
          name={listFormName}
          scrambleTypeId={listFormScrambleTypeId}
          onCancel={closeListFormModal}
          onNameChange={setListFormName}
          onScrambleTypeChange={setListFormScrambleTypeId}
          onSubmit={handleListFormSubmit}
        />
      ) : null}
      {isDeleteResultDialogOpen ? (
        <DeleteResultDialog
          copy={timerCopy}
          onCancel={closeDeleteResultDialog}
          onDelete={handleDeleteStoppedSolve}
        />
      ) : null}
      {isMultiBlindSettingsOpen ? (
        <MultiBlindSettingsDialog
          copy={timerCopy}
          cubeCount={multiBlindCubeCountDraft}
          onCancel={closeMultiBlindSettings}
          onCubeCountChange={setMultiBlindCubeCountDraft}
          onSubmit={handleMultiBlindSettingsSubmit}
        />
      ) : null}
      {isMultiBlindResultOpen ? (
        <MultiBlindResultDialog
          attemptedCount={multiBlindScrambleCount}
          copy={timerCopy}
          isDnf={isMultiBlindWholeDnfDraft}
          penaltyCount={multiBlindPenaltyCountDraft}
          solvedCount={multiBlindSolvedCountDraft}
          onDiscard={discardPendingMultiBlindResult}
          onDnfChange={setIsMultiBlindWholeDnfDraft}
          onPenaltyCountChange={setMultiBlindPenaltyCountDraft}
          onSolvedCountChange={setMultiBlindSolvedCountDraft}
          onSubmit={handleMultiBlindResultSubmit}
        />
      ) : null}
    </section>
  );
};
