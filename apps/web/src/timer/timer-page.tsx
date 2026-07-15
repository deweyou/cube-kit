import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CubeginAnimatedIcon } from '@cubegin/icons/react';
import { renderScrambleImage } from '@cubegin/scramble-image';
import { EVENT_IDS, type EventId } from '@cubegin/shared/events';
import { formatTimerDisplay, resolveWcaInspectionPenalty } from '@cubegin/shared/preferences';
import {
  calculateSolveStatistics,
  formatMilliseconds,
  getEventShortLabel,
  getSolveDisplayText,
  type RollingAverageStat,
  type SolvePenalty,
  type SolveRecord,
  type SolveStatistics,
} from '@cubegin/shared/timer-session';
import { Select } from '@deweyou-design/react/select';
import { getCubeginWordmarkSvg } from '../brand/wordmark';
import type { AppCopy } from '../preferences/app-copy';
import { useAppPreferences } from '../preferences/app-preferences';
import { useTimerSessionStore, type TimerList } from '../timer-session/timer-session-store';
import { ScrambleImage } from './components/scramble-image';
import { ScrambleText } from './components/scramble-text';
import { AddIcon, DeleteIcon, EditIcon } from './components/timer-icons';
import { useTimer } from './hooks/use-timer';
import { getTimerScrambleGenerateOptions } from './scramble-prefetcher';
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
  copy: AppCopy['timer'];
  elapsedText: string;
  isFocusMode: boolean;
  label: string;
  placeholder?: string;
  stoppedPenalty: SolvePenalty;
  state: TimerState;
  onDeleteStoppedSolve: () => void;
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

interface TimerScrambleStripProps {
  ariaLabel: string;
  eventId: EventId;
  isLoading: boolean;
  scramble: string;
}

const TimerScrambleStrip = ({
  ariaLabel,
  eventId,
  isLoading,
  scramble,
}: TimerScrambleStripProps) => (
  <section className={styles.scrambleStrip} aria-label={ariaLabel} data-scramble-event-id={eventId}>
    <div className={styles.scrambleText}>
      <ScrambleText scramble={scramble} isLoading={isLoading} />
    </div>
    <div className={styles.scrambleToolbarSlot} aria-hidden="true">
      <div className={styles.scrambleToolbarPlaceholder} data-scramble-toolbar-placeholder>
        <span className={styles.scrambleToolbarPlaceholderItem} />
        <span className={styles.scrambleToolbarPlaceholderItem} />
        <span className={styles.scrambleToolbarPlaceholderItem} />
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
  statistics: SolveStatistics;
}

const TimerSessionSummary = ({ copy, statistics }: TimerSessionSummaryProps) => {
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
              {getSolveDisplayText(solveRecord.elapsedMs, solveRecord.penalty)}
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
  copy: AppCopy['timer'];
  placeholder?: string;
  stoppedPenalty: SolvePenalty;
  state: TimerState;
  onDeleteStoppedSolve: () => void;
  onStoppedPenaltyChange: (penalty: SolvePenalty) => void;
}

interface ResultToolbarProps {
  copy: AppCopy['timer'];
  penalty: SolvePenalty;
  onDelete: () => void;
  onPenaltyChange: (penalty: SolvePenalty) => void;
}

const ResultToolbar = ({ copy, penalty, onDelete, onPenaltyChange }: ResultToolbarProps) => (
  <div className={styles.resultToolbar} role="toolbar" aria-label={copy.resultToolbarLabel}>
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
    <button
      className={`${styles.resultButton} ${styles.deleteResultButton}`}
      type="button"
      aria-label={copy.deleteResult}
      onClick={onDelete}
    >
      <DeleteIcon className={styles.deleteIcon} size={18} />
    </button>
  </div>
);

const TimerFeedbackSlot = ({
  copy,
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
    {state === 'stopped' ? (
      <ResultToolbar
        copy={copy}
        penalty={stoppedPenalty}
        onDelete={onDeleteStoppedSolve}
        onPenaltyChange={onStoppedPenaltyChange}
      />
    ) : null}
  </div>
);

interface DeleteResultDialogProps {
  copy: AppCopy['timer'];
  onCancel: () => void;
  onDelete: () => void;
}

const DeleteResultDialog = ({
  copy,
  onCancel,
  onDelete,
}: DeleteResultDialogProps) => (
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
  isFocusMode,
  label,
  placeholder,
  stoppedPenalty,
  state,
  onDeleteStoppedSolve,
  onStoppedPenaltyChange,
}: TimerFocusSurfaceProps) => {
  const displayKind = getTimerDisplayKind(elapsedText);
  const timeWidth = getTimerTimeWidth(elapsedText);

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
        className={styles.timeFace}
        aria-live={state === 'timing' ? 'off' : 'polite'}
        data-timer-display={displayKind}
        data-time-width={timeWidth}
      >
        <TimerElapsedDisplay displayKind={displayKind} elapsedText={elapsedText} />
      </span>
      <TimerFeedbackSlot
        copy={copy}
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
  const scrambleGenerator = useMemo(() => createTimerScrambleGenerator(), []);
  const { elapsed, start, stop, reset } = useTimer();

  const isActiveScrambleForList = activeScrambleEventId === activeList.scrambleTypeId;
  const scrambleSvg = useMemo(
    () =>
      isActiveScrambleForList && activeScramble.length > 0
        ? renderScrambleImage(activeList.scrambleTypeId, activeScramble)
        : '',
    [activeList.scrambleTypeId, activeScramble, isActiveScrambleForList],
  );
  const displayScramble =
    scrambleError ??
    (isScrambleLoading || !isActiveScrambleForList ? timerCopy.scrambleLoading : activeScramble);
  const statistics = useMemo(
    () => calculateSolveStatistics(activeListSolveRecords),
    [activeListSolveRecords],
  );

  const clearStoppedSolveState = useCallback(() => {
    pendingStoppedSolve.current = undefined;
    stoppedPenaltyRequestId.current += 1;
    setStoppedSolveId(undefined);
    setStoppedSolvePenalty('none');
    setIsDeleteResultDialogOpen(false);
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

    void (async () => {
      const resolvedSolveId = solveId ?? (await solvePromise)?.id;
      if (resolvedSolveId === undefined) return;

      await deleteSolve(resolvedSolveId);
    })();
  }, [deleteSolve, reset, stoppedSolveId]);

  const loadScramble = useCallback(
    async (eventId: EventId) => {
      const requestId = latestScrambleRequestId.current + 1;
      latestScrambleRequestId.current = requestId;
      setActiveScramble('');
      setActiveScrambleEventId(eventId);
      setScrambleError(undefined);
      setIsScrambleLoading(true);

      try {
        const result = await scrambleGenerator.generate(
          eventId,
          getTimerScrambleGenerateOptions(eventId),
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
    [scrambleGenerator],
  );

  useEffect(() => {
    return () => {
      scrambleGenerator.dispose?.();
    };
  }, [scrambleGenerator]);

  useEffect(() => {
    void loadScramble(activeList.scrambleTypeId);
  }, [activeList.scrambleTypeId, loadScramble]);

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
    [clearStoppedSolveState, reset, start],
  );

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
    const stoppedElapsed = stop();
    const solvePenalty = pendingSolvePenalty.current;
    const savedSolve = addSolve({
      elapsedMs: stoppedElapsed,
      eventId: activeList.scrambleTypeId,
      listId: activeListId,
      penalty: solvePenalty,
      scramble: activeScramble,
    });

    pendingStoppedSolve.current = savedSolve;
    setFinalElapsed(stoppedElapsed);
    setStoppedSolveId(undefined);
    setStoppedSolvePenalty(solvePenalty);
    setIsDeleteResultDialogOpen(false);
    void savedSolve.then((solveRecord) => {
      if (pendingStoppedSolve.current !== savedSolve) return;

      setStoppedSolveId(solveRecord.id);
      setStoppedSolvePenalty(solveRecord.penalty);
    });
    pendingSolvePenalty.current = 'none';
    pendingReadyAction.current = 'solve';
    setTimerState('stopped');
  }, [activeList.scrambleTypeId, activeListId, activeScramble, addSolve, stop]);

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

  const cancelReady = useCallback(() => {
    clearStoppedSolveState();
    reset();
    setFinalElapsed(0);
    setInspectionElapsed(0);
    pendingSolvePenalty.current = 'none';
    pendingReadyAction.current = 'solve';
    inspectionStartedAt.current = undefined;
    setTimerState('idle');
  }, [clearStoppedSolveState, reset]);

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
    if (!isActive) return undefined;

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

        if (preferences.wcaInspection) {
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

      if (preferences.wcaInspection) {
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
    preferences.wcaInspection,
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
  const elapsedText =
    timerState === 'stopped'
      ? getSolveDisplayText(finalElapsed, stoppedSolvePenalty)
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

  return (
    <section
      className={styles.root}
      aria-label={timerCopy.pageLabel}
      data-focus-mode={isTimerFocusMode ? 'true' : 'false'}
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
        <TimerScrambleStrip
          ariaLabel={timerCopy.currentScrambleLabel}
          eventId={activeList.scrambleTypeId}
          isLoading={isScrambleLoading}
          scramble={displayScramble}
        />
      </header>

      <TimerTopNavigation isHidden={isTimerRunning} />

      <main className={styles.stage} aria-label={timerCopy.mainTimerLabel}>
        <TimerFocusSurface
          copy={timerCopy}
          elapsedText={elapsedText}
          isFocusMode={isTimerFocusMode}
          label={timerLabel}
          placeholder={placeholder}
          stoppedPenalty={stoppedSolvePenalty}
          state={timerState}
          onDeleteStoppedSolve={openDeleteResultDialog}
          onStoppedPenaltyChange={handleStoppedPenaltyChange}
        />
        <TimerRecentSolves
          label={timerCopy.recentSolvesLabel}
          solveRecords={activeListSolveRecords}
        />
      </main>
      <footer className={styles.bottomDock} aria-label={timerCopy.bottomInfoLabel}>
        <TimerSessionSummary copy={timerCopy} statistics={statistics} />
        <TimerScramblePreview
          eventId={activeList.scrambleTypeId}
          label={timerCopy.scrambleImageLabel}
          svg={scrambleSvg}
        />
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
    </section>
  );
};
