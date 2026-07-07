import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { BRAND_ICON_SVGS } from '@cubegin/icons/brand';
import { CubeginAnimatedIcon } from '@cubegin/icons/react';
import { renderScrambleImage } from '@cubegin/scramble-image';
import { EVENT_IDS, type EventId } from '@cubegin/shared/events';
import { formatElapsedClock } from '@cubegin/shared/timer';
import {
  calculateSolveStatistics,
  formatMilliseconds,
  getEventShortLabel,
  type RollingAverageStat,
  type SolveRecord,
  type SolveStatistics,
} from '@cubegin/shared/timer-session';
import { Select } from '@deweyou-design/react/select';
import { ScrambleImage } from '../timer/components/scramble-image';
import { ScrambleText } from '../timer/components/scramble-text';
import { AddIcon, EditIcon } from '../timer/components/timer-icons';
import { useTimer } from '../timer/hooks/use-timer';
import { getTimerScrambleGenerateOptions } from '../timer/scramble-prefetcher';
import { createTimerScrambleGenerator } from '../timer/scramble-worker-client';
import { TimerV2TopNavigation } from './timer-v2-navigation';
import styles from './timer-v2-page.module.css';

type TimerV2State = 'idle' | 'armed' | 'timing' | 'stopped';
type TimerV2TimeWidth = 'wide' | 'max';

interface TimerV2ScrambleType {
  id: EventId;
  label: string;
}

interface TimerV2List {
  id: string;
  name: string;
  scrambleTypeId: EventId;
}

const TIMER_V2_SCRAMBLE_TYPES: TimerV2ScrambleType[] = EVENT_IDS.map((eventId) => ({
  id: eventId,
  label: getEventShortLabel(eventId),
}));

const INITIAL_TIMER_V2_LISTS: TimerV2List[] = EVENT_IDS.map((eventId) => ({
  id: `main-${eventId}`,
  name: getEventShortLabel(eventId),
  scrambleTypeId: eventId,
}));

const TIMER_V2_ROLLING_STAT_SIZES = [3, 5, 12, 50, 100] as const;
const TIMER_V2_ALWAYS_VISIBLE_ROLLING_STAT_LIMIT = 5;
const TIMER_V2_RECENT_SOLVE_LIMIT = 12;

const EMPTY_TIMER_V2_SOLVE_RECORDS: SolveRecord[] = [];

type TimerV2ListFormMode = 'create' | 'edit';

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
  resetFirst?: boolean;
}

interface TimerFocusSurfaceProps {
  elapsed: number;
  isFocusMode: boolean;
  label: string;
  placeholder?: string;
  state: TimerV2State;
}

interface TimerV2ElapsedDisplayProps {
  elapsedText: string;
}

const wordmarkSvg = BRAND_ICON_SVGS['cubegin-wordmark'];

const formatSummaryStat = (elapsedMs: number | null, isAvailable: boolean) => {
  if (!isAvailable) return '--';
  if (elapsedMs === null) return 'DNF';
  return formatMilliseconds(elapsedMs);
};

const getTimerV2TimeWidth = (elapsedText: string): TimerV2TimeWidth => {
  if (elapsedText.length >= 9) return 'max';
  return 'wide';
};

const splitTimerV2ElapsedText = (elapsedText: string) => {
  const fractionStart = elapsedText.indexOf('.');

  if (fractionStart === -1) {
    return { fraction: '', whole: elapsedText };
  }

  return {
    fraction: elapsedText.slice(fractionStart),
    whole: elapsedText.slice(0, fractionStart),
  };
};

const getTimerV2GlyphKind = (glyph: string) =>
  glyph === '.' || glyph === ':' ? 'separator' : 'digit';

const getRollingAverageStat = (
  rollingAverages: readonly RollingAverageStat[],
  size: number,
): RollingAverageStat | undefined =>
  rollingAverages.find((rollingAverage) => rollingAverage.size === size);

const createTimerV2SolveRecord = ({
  createdAt,
  elapsedMs,
  eventId,
  listId,
  scramble,
  solveIndex,
}: {
  createdAt: number;
  elapsedMs: number;
  eventId: EventId;
  listId: string;
  scramble: string;
  solveIndex: number;
}): SolveRecord => ({
  id: `${listId}:${solveIndex}`,
  sessionId: listId,
  eventId,
  scramble,
  elapsedMs,
  penalty: 'none',
  createdAt,
});

interface TimerV2ListSelectorProps {
  activeListId: string;
  lists: TimerV2List[];
  isHidden: boolean;
  onChange: (listId: string) => void;
  onCreateList: () => void;
  onEditList: () => void;
}

const TimerV2ListSelector = ({
  activeListId,
  isHidden,
  lists,
  onChange,
  onCreateList,
  onEditList,
}: TimerV2ListSelectorProps) => (
  <Select.Root
    className={styles.listControl}
    aria-hidden={isHidden ? 'true' : undefined}
    data-hidden={isHidden ? 'true' : undefined}
    label={<span className={styles.visuallyHidden}>切换列表</span>}
    value={[activeListId]}
    onValueChange={(nextValue) => {
      const nextListId = nextValue[0];
      if (nextListId) onChange(nextListId);
    }}
  >
    <Select.Trigger className={styles.listTrigger} />
    <Select.Content className={styles.listContent}>
      <div className={styles.listToolbar} role="toolbar" aria-label="列表操作">
        <span className={styles.listToolbarLabel}>列表</span>
        <div className={styles.listToolbarActions}>
          <button
            className={styles.listToolbarButton}
            type="button"
            aria-label="新增列表"
            title="新增列表"
            onClick={onCreateList}
          >
            <AddIcon size={15} />
          </button>
          <button
            className={styles.listToolbarButton}
            type="button"
            aria-label="编辑列表"
            title="编辑列表"
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
  mode: TimerV2ListFormMode;
  name: string;
  scrambleTypeId: EventId;
  onCancel: () => void;
  onNameChange: (name: string) => void;
  onScrambleTypeChange: (scrambleTypeId: EventId) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const CreateListModal = ({
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
      aria-labelledby="timer-v2-create-list-title"
    >
      <form
        className={styles.createListForm}
        aria-label={mode === 'create' ? '新增列表表单' : '编辑列表表单'}
        onSubmit={onSubmit}
      >
        <h2 className={styles.modalTitle} id="timer-v2-create-list-title">
          {mode === 'create' ? '新增列表' : '编辑列表'}
        </h2>
        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>列表名称</span>
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
            label={<span className={styles.fieldLabel}>项目</span>}
            value={[scrambleTypeId]}
            onValueChange={(nextValue) => {
              const nextScrambleTypeId = nextValue[0] as EventId | undefined;
              if (nextScrambleTypeId) onScrambleTypeChange(nextScrambleTypeId);
            }}
          >
            <Select.Trigger className={styles.fieldSelectTrigger} />
            <Select.Content className={styles.fieldSelectContent}>
              {TIMER_V2_SCRAMBLE_TYPES.map((scrambleType) => (
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
            取消
          </button>
          <button className={styles.primaryButton} type="submit">
            {mode === 'create' ? '创建' : '保存'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

interface TimerV2ScrambleStripProps {
  eventId: EventId;
  isLoading: boolean;
  scramble: string;
}

const TimerV2ScrambleStrip = ({ eventId, isLoading, scramble }: TimerV2ScrambleStripProps) => (
  <section className={styles.scrambleStrip} aria-label="当前打乱" data-scramble-event-id={eventId}>
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
  value: string;
}

const SummaryCountMetric = ({ value }: SummaryCountMetricProps) => (
  <div className={styles.summaryMetric} role="group" aria-label="有效成绩次数 / 总次数">
    <strong className={styles.summaryValue}>{value}</strong>
  </div>
);

interface TimerV2SessionSummaryProps {
  statistics: SolveStatistics;
}

const TimerV2SessionSummary = ({ statistics }: TimerV2SessionSummaryProps) => {
  const rollingStats = TIMER_V2_ROLLING_STAT_SIZES.filter(
    (size) => size <= TIMER_V2_ALWAYS_VISIBLE_ROLLING_STAT_LIMIT || statistics.totalCount >= size,
  ).map((size) => ({
    label: size === 3 ? 'mo3' : `ao${size}`,
    stat: getRollingAverageStat(statistics.rollingAverages, size),
  }));

  return (
    <section className={styles.sessionSummary} aria-label="成绩概要">
      <SummaryCountMetric value={`${statistics.validCount}/${statistics.totalCount}`} />
      <SummaryMetric
        label="mean"
        value={formatSummaryStat(statistics.averageMs, statistics.totalCount > 0)}
      />
      <SummaryMetric
        label="best"
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

interface TimerV2RecentSolvesProps {
  solveRecords: readonly SolveRecord[];
}

const TimerV2RecentSolves = ({ solveRecords }: TimerV2RecentSolvesProps) => {
  const recentSolves = solveRecords.slice(0, TIMER_V2_RECENT_SOLVE_LIMIT).reverse();

  if (recentSolves.length <= 1) return null;

  return (
    <section className={styles.recentRail} aria-label="最近成绩">
      <ol className={styles.recentRailList}>
        {recentSolves.map((solveRecord) => (
          <li className={styles.recentRailItem} key={solveRecord.id}>
            <strong className={styles.recentRailTime}>
              {formatMilliseconds(solveRecord.elapsedMs)}
            </strong>
          </li>
        ))}
      </ol>
    </section>
  );
};

interface TimerV2ScramblePreviewProps {
  eventId: EventId;
  svg: string;
}

const TimerV2ScramblePreview = ({ eventId, svg }: TimerV2ScramblePreviewProps) => (
  <aside className={styles.scramblePreview} aria-label="打乱图">
    {svg.length > 0 ? <ScrambleImage eventId={eventId} svg={svg} /> : null}
  </aside>
);

interface TimerFeedbackSlotProps {
  placeholder?: string;
  state: TimerV2State;
}

const ResultToolbar = () => (
  <div className={styles.resultToolbar} role="toolbar" aria-label="成绩操作">
    <button className={styles.resultButton} type="button">
      +2
    </button>
    <button className={styles.resultButton} type="button">
      DNF
    </button>
    <button
      className={`${styles.resultButton} ${styles.deleteResultButton}`}
      type="button"
      aria-label="删除"
    >
      <svg
        className={styles.deleteIcon}
        aria-hidden="true"
        fill="none"
        focusable="false"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path d="M3 6h18" />
        <path d="M8 6V4.8A1.8 1.8 0 0 1 9.8 3h4.4A1.8 1.8 0 0 1 16 4.8V6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 1.9H8a2 2 0 0 1-2-1.9L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    </button>
  </div>
);

const TimerFeedbackSlot = ({ placeholder, state }: TimerFeedbackSlotProps) => (
  <div className={styles.feedbackSlot} data-feedback-slot="true" data-state={state}>
    {placeholder === undefined ? null : (
      <span className={styles.placeholder} aria-hidden="true">
        {placeholder}
      </span>
    )}
    {state === 'stopped' ? <ResultToolbar /> : null}
  </div>
);

const TimerV2ElapsedDisplay = ({ elapsedText }: TimerV2ElapsedDisplayProps) => {
  const { fraction, whole } = splitTimerV2ElapsedText(elapsedText);
  const renderGlyphs = (part: 'fraction' | 'whole', text: string) =>
    Array.from(text).map((glyph, index) => (
      <span
        className={styles.timerGlyph}
        data-timer-glyph={getTimerV2GlyphKind(glyph)}
        key={`${part}-${index}`}
      >
        {glyph}
      </span>
    ));

  return (
    <span className={styles.timerText} data-timer-text="true">
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
  elapsed,
  isFocusMode,
  label,
  placeholder,
  state,
}: TimerFocusSurfaceProps) => {
  const decimals = state === 'timing' ? 2 : 3;
  const elapsedText = formatElapsedClock(elapsed, decimals);
  const timeWidth = getTimerV2TimeWidth(elapsedText);

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
        data-time-width={timeWidth}
      >
        <TimerV2ElapsedDisplay elapsedText={elapsedText} />
      </span>
      <TimerFeedbackSlot placeholder={placeholder} state={state} />
    </div>
  );
};

export const TimerV2Page = () => {
  const [timerState, setTimerState] = useState<TimerV2State>('idle');
  const [finalElapsed, setFinalElapsed] = useState(0);
  const [isBrandHovering, setIsBrandHovering] = useState(false);
  const [lists, setLists] = useState(INITIAL_TIMER_V2_LISTS);
  const [activeListId, setActiveListId] = useState(INITIAL_TIMER_V2_LISTS[0].id);
  const [listFormMode, setListFormMode] = useState<TimerV2ListFormMode>();
  const [editingListId, setEditingListId] = useState<string>();
  const [listFormName, setListFormName] = useState('');
  const [listFormScrambleTypeId, setListFormScrambleTypeId] = useState(
    TIMER_V2_SCRAMBLE_TYPES[0].id,
  );
  const [solveRecordsByListId, setSolveRecordsByListId] = useState<Record<string, SolveRecord[]>>({
    [INITIAL_TIMER_V2_LISTS[0].id]: [],
  });
  const latestScrambleRequestId = useRef(0);
  const keyboardClickSuppressionTarget = useRef<EventTarget | null>(null);
  const keyboardClickSuppressionTimeout = useRef<number | undefined>(undefined);
  const [activeScramble, setActiveScramble] = useState('');
  const [activeScrambleEventId, setActiveScrambleEventId] = useState<EventId>(
    INITIAL_TIMER_V2_LISTS[0].scrambleTypeId,
  );
  const [scrambleError, setScrambleError] = useState<string>();
  const [isScrambleLoading, setIsScrambleLoading] = useState(true);
  const scrambleGenerator = useMemo(() => createTimerScrambleGenerator(), []);
  const { elapsed, start, stop, reset } = useTimer();

  const activeList = useMemo(
    () => lists.find((list) => list.id === activeListId) ?? lists[0],
    [activeListId, lists],
  );
  const activeListSolveRecords =
    solveRecordsByListId[activeList.id] ?? EMPTY_TIMER_V2_SOLVE_RECORDS;
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
    (isScrambleLoading || !isActiveScrambleForList ? '生成打乱中...' : activeScramble);
  const statistics = useMemo(
    () => calculateSolveStatistics(activeListSolveRecords),
    [activeListSolveRecords],
  );

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
    const previousTheme = document.documentElement.dataset.theme;

    document.documentElement.dataset.theme = 'light';

    return () => {
      if (previousTheme === undefined) {
        delete document.documentElement.dataset.theme;
        return;
      }

      document.documentElement.dataset.theme = previousTheme;
    };
  }, []);

  useEffect(() => {
    return () => {
      scrambleGenerator.dispose?.();
    };
  }, [scrambleGenerator]);

  useEffect(() => {
    void loadScramble(activeList.scrambleTypeId);
  }, [activeList.scrambleTypeId, loadScramble]);

  const startTimer = useCallback(
    ({ resetFirst = true }: StartTimerOptions = {}) => {
      if (resetFirst) {
        reset();
        setFinalElapsed(0);
      }

      start();
      setTimerState('timing');
    },
    [reset, start],
  );

  const stopTimer = useCallback(() => {
    const stoppedElapsed = stop();

    setFinalElapsed(stoppedElapsed);
    setSolveRecordsByListId((currentSolveRecordsByListId) => {
      const currentSolveRecords = currentSolveRecordsByListId[activeListId] ?? [];
      const solveRecord = createTimerV2SolveRecord({
        createdAt: Date.now(),
        elapsedMs: stoppedElapsed,
        eventId: activeList.scrambleTypeId,
        listId: activeListId,
        scramble: activeScramble,
        solveIndex: currentSolveRecords.length + 1,
      });

      return {
        ...currentSolveRecordsByListId,
        [activeListId]: [solveRecord, ...currentSolveRecords],
      };
    });
    setTimerState('stopped');
  }, [activeList.scrambleTypeId, activeListId, activeScramble, stop]);

  const armTimer = useCallback(() => {
    reset();
    setFinalElapsed(0);
    setTimerState('armed');
  }, [reset]);

  const cancelReady = useCallback(() => {
    reset();
    setFinalElapsed(0);
    setTimerState('idle');
  }, [reset]);

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

  const handleListChange = useCallback((nextListId: string) => {
    setActiveListId(nextListId);
  }, []);

  const handleListFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const name = listFormName.trim();
      if (name.length === 0) return;

      if (listFormMode === 'edit') {
        const listId = editingListId;
        if (listId === undefined) return;

        setLists((currentLists) =>
          currentLists.map((list) =>
            list.id === listId ? { ...list, name, scrambleTypeId: listFormScrambleTypeId } : list,
          ),
        );
        setActiveListId(listId);
        setListFormMode(undefined);
        setEditingListId(undefined);
        setListFormName('');
        setListFormScrambleTypeId(listFormScrambleTypeId);
        return;
      }

      const list: TimerV2List = {
        id: `custom:${lists.length + 1}`,
        name,
        scrambleTypeId: listFormScrambleTypeId,
      };

      setLists((currentLists) => [...currentLists, list]);
      setSolveRecordsByListId((currentSolveRecordsByListId) => ({
        ...currentSolveRecordsByListId,
        [list.id]: [],
      }));
      setActiveListId(list.id);
      setListFormMode(undefined);
      setEditingListId(undefined);
      setListFormName('');
      setListFormScrambleTypeId(list.scrambleTypeId);
    },
    [editingListId, listFormMode, listFormName, listFormScrambleTypeId, lists.length],
  );

  useEffect(() => {
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

      startTimer({ resetFirst: timerState !== 'armed' });
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isSpaceShortcut(event) || isTextEntryTarget(event.target)) {
        return;
      }

      claimTimerShortcutEvent(event);

      if (timerState === 'armed') {
        startTimer({ resetFirst: false });
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
  }, [armTimer, cancelReady, startTimer, stopTimer, timerState]);

  useEffect(
    () => () => {
      if (keyboardClickSuppressionTimeout.current !== undefined) {
        window.clearTimeout(keyboardClickSuppressionTimeout.current);
      }
    },
    [],
  );

  const displayElapsed = timerState === 'stopped' ? finalElapsed : elapsed;
  const isTimerFocusMode = timerState === 'armed' || timerState === 'timing';
  const isTimerRunning = timerState === 'timing';
  const timerLabel =
    timerState === 'timing'
      ? '计时中，按 Space 或 Enter 结束'
      : timerState === 'armed'
        ? '松开 Space 开始计时，按 Esc 取消'
        : '按 Space 或 Enter 开始计时';
  const placeholder = timerState === 'armed' ? 'Esc 取消' : undefined;

  return (
    <section
      className={styles.root}
      aria-label="新版计时器"
      data-focus-mode={isTimerFocusMode ? 'true' : 'false'}
      data-timer-running={isTimerRunning ? 'true' : 'false'}
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
          <TimerV2ListSelector
            activeListId={activeListId}
            isHidden={isTimerRunning}
            lists={lists}
            onChange={handleListChange}
            onCreateList={openCreateListModal}
            onEditList={openEditListModal}
          />
        </div>
        <TimerV2ScrambleStrip
          eventId={activeList.scrambleTypeId}
          isLoading={isScrambleLoading}
          scramble={displayScramble}
        />
      </header>

      <TimerV2TopNavigation activeRoute="timer" isHidden={isTimerRunning} />

      <main className={styles.stage} aria-label="主题计时器">
        <TimerFocusSurface
          elapsed={displayElapsed}
          isFocusMode={isTimerFocusMode}
          label={timerLabel}
          placeholder={placeholder}
          state={timerState}
        />
        <TimerV2RecentSolves solveRecords={activeListSolveRecords} />
      </main>
      <footer className={styles.bottomDock} aria-label="计时器底部信息">
        <TimerV2SessionSummary statistics={statistics} />
        <TimerV2ScramblePreview eventId={activeList.scrambleTypeId} svg={scrambleSvg} />
      </footer>
      {listFormMode !== undefined ? (
        <CreateListModal
          mode={listFormMode}
          name={listFormName}
          scrambleTypeId={listFormScrambleTypeId}
          onCancel={closeListFormModal}
          onNameChange={setListFormName}
          onScrambleTypeChange={setListFormScrambleTypeId}
          onSubmit={handleListFormSubmit}
        />
      ) : null}
    </section>
  );
};
