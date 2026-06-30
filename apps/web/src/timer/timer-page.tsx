import { useState, useCallback, useEffect, useMemo, useRef, type UIEvent } from 'react';
import type { EventId } from '@cubegin/shared/events';
import type {
  SolvePenalty,
  SolveRecord,
  TimerSessionRepository,
} from '@cubegin/shared/timer-session';
import { useTimer } from './hooks/use-timer';
import { useTimerGesture } from './hooks/use-timer-gesture';
import { useTimerSessions } from './hooks/use-timer-sessions';
import { SolveList } from './components/solve-list';
import { SolveDetail } from './components/solve-detail';
import { SolveStatisticsPanel } from './components/solve-statistics-panel';
import { StorageAlert } from './components/storage-alert';
import { TimerHeader } from './components/timer-header';
import { TimerSidebar, type TimerNavItemId } from './components/timer-sidebar';
import { TIMER_MESSAGES, type TimerLocale } from './timer-i18n';
import { createMemoryTimerSessionRepository } from './storage/memory-timer-session-repository';
import { createIndexedDbTimerSessionRepository } from './storage/timer-session-db';
import { ScrambleView } from './views/scramble-view';
import { TimingView } from './views/timing-view';
import { ResultView } from './views/result-view';
import { createTimerScrambleGenerator } from './scramble-worker-client';
import {
  createTimerScramblePrefetcher,
  getTimerScrambleGenerateOptions,
} from './scramble-prefetcher';
import {
  getScrambleElapsedMs,
  getScramblePerformanceNow,
  logScramblePerformance,
} from './scramble-performance-log';
import styles from './timer-page.module.css';

type PageState = 'scramble' | 'timing' | 'result';
type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'cubegin-theme';
const LANGUAGE_STORAGE_KEY = 'cubegin-language';
const MULTI_BLIND_CUBE_COUNT_STORAGE_KEY = 'cubegin-multi-blind-cube-count';
const SIDEBAR_MOBILE_QUERY = '(max-width: 860px)';
const SCRAMBLE_LOADING_PREVIEW_PARAM = 'scrambleLoading';
const TOUCH_READY_OVERLAY_PREVIEW_PARAM = 'touchReadyOverlay';
const DEFAULT_MULTI_BLIND_CUBE_COUNT = 3;
const MIN_MULTI_BLIND_CUBE_COUNT = 2;
const MAX_MULTI_BLIND_CUBE_COUNT = 99;
const MULTI_BLIND_DNF_LIMIT_MS = 60 * 60 * 1000;

const waitForLoadingPaint = () =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });

const logBackgroundError = (event: string, cause: unknown) => {
  logScramblePerformance(event, {
    error: cause instanceof Error ? cause.message : String(cause),
  });
};

const isScrambleLoadingPreviewEnabled = () =>
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has(SCRAMBLE_LOADING_PREVIEW_PARAM);

const getTouchReadyOverlayPreview = (): 'cancel' | 'start' | undefined => {
  if (!import.meta.env.DEV) return undefined;

  const value = new URLSearchParams(window.location.search).get(TOUCH_READY_OVERLAY_PREVIEW_PARAM);
  if (value === 'cancel') return 'cancel';
  if (value !== null) return 'start';
  return undefined;
};

const sanitizeMultiBlindCubeCount = (count: number) =>
  Math.min(MAX_MULTI_BLIND_CUBE_COUNT, Math.max(MIN_MULTI_BLIND_CUBE_COUNT, count));

const readStoredMultiBlindCubeCount = () => {
  const storedValue = localStorage.getItem(MULTI_BLIND_CUBE_COUNT_STORAGE_KEY);
  if (storedValue === null) return DEFAULT_MULTI_BLIND_CUBE_COUNT;

  const storedCount = Number(storedValue);
  if (!Number.isSafeInteger(storedCount)) return DEFAULT_MULTI_BLIND_CUBE_COUNT;
  return sanitizeMultiBlindCubeCount(storedCount);
};

const getMultiBlindScrambleLines = (value: string) =>
  value
    .split(/\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

interface TimerPageProps {
  enableScramblePrefetch?: boolean;
  repository?: TimerSessionRepository;
}

export const TimerPage = ({
  enableScramblePrefetch = import.meta.env.MODE !== 'test' && !import.meta.env.VITEST,
  repository: injectedRepository,
}: TimerPageProps = {}) => {
  const [repository, setRepository] = useState<TimerSessionRepository | null>(
    injectedRepository ?? null,
  );
  const [storageError, setStorageError] = useState<string>();

  useEffect(() => {
    if (injectedRepository) return;

    let cancelled = false;
    void createIndexedDbTimerSessionRepository()
      .then((dbRepository) => {
        if (!cancelled) setRepository(dbRepository);
      })
      .catch((cause) => {
        if (cancelled) return;
        setStorageError(cause instanceof Error ? cause.message : String(cause));
        setRepository(createMemoryTimerSessionRepository());
      });

    return () => {
      cancelled = true;
    };
  }, [injectedRepository]);

  if (!repository) {
    return <div className={styles.loading}>{TIMER_MESSAGES['zh-CN'].loading}</div>;
  }

  return (
    <TimerPageContent
      enableScramblePrefetch={enableScramblePrefetch}
      repository={repository}
      storageError={storageError}
    />
  );
};

interface TimerPageContentProps {
  enableScramblePrefetch: boolean;
  repository: TimerSessionRepository;
  storageError?: string;
}

const TimerPageContent = ({
  enableScramblePrefetch,
  repository,
  storageError,
}: TimerPageContentProps) => {
  const sessionState = useTimerSessions({ repository });
  const hasStartedInitialWarmPrefetch = useRef(false);
  const latestScrambleRequestId = useRef(0);
  const [scramble, setScramble] = useState('');
  const [scrambleError, setScrambleError] = useState<string>();
  const [isScrambleLoading, setIsScrambleLoading] = useState(true);
  const [pageState, setPageState] = useState<PageState>('scramble');
  const [finalElapsed, setFinalElapsed] = useState(0);
  const [selectedSolveId, setSelectedSolveId] = useState<string>();
  const [runtimeStorageError, setRuntimeStorageError] = useState<string>();
  const [displayEventId, setDisplayEventId] = useState<EventId>('333');
  const [multiBlindCubeCount, setMultiBlindCubeCount] = useState(readStoredMultiBlindCubeCount);
  const multiBlindCubeCountRef = useRef(multiBlindCubeCount);
  multiBlindCubeCountRef.current = multiBlindCubeCount;
  const activeEventIdRef = useRef<EventId>(displayEventId);
  activeEventIdRef.current = displayEventId;
  const generator = useMemo(() => createTimerScrambleGenerator(), []);
  const backgroundGenerator = useMemo(() => createTimerScrambleGenerator(), []);
  const scramblePrefetcher = useMemo(
    () =>
      createTimerScramblePrefetcher(generator, {
        backgroundGenerator,
        shouldKeepWarmResult: (eventId) => eventId !== activeEventIdRef.current,
      }),
    [backgroundGenerator, generator],
  );
  const [isEventTransitionPending, setIsEventTransitionPending] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [locale, setLocale] = useState<TimerLocale>(() => {
    const storedLocale = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLocale === 'zh-CN' || storedLocale === 'en-US') return storedLocale;
    return 'zh-CN';
  });
  const [isStageScrolled, setIsStageScrolled] = useState(false);
  const stageRef = useRef<HTMLElement | null>(null);
  const [isMobileShell, setIsMobileShell] = useState(
    () => window.matchMedia?.(SIDEBAR_MOBILE_QUERY).matches ?? false,
  );
  const [activeNavItem, setActiveNavItem] = useState<TimerNavItemId>('timer');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.matchMedia?.(SIDEBAR_MOBILE_QUERY).matches ?? false,
  );
  const isScrambleLoadingPreview = isScrambleLoadingPreviewEnabled();
  const touchReadyOverlayPreview = getTouchReadyOverlayPreview();

  const { elapsed, start, stop, reset } = useTimer();

  const getDisplayGenerateOptions = useCallback(
    (eventId: EventId) =>
      eventId === '333mbld'
        ? { multiBlindCubeCount: multiBlindCubeCountRef.current }
        : getTimerScrambleGenerateOptions(eventId),
    [],
  );

  useEffect(() => {
    return () => {
      scramblePrefetcher.dispose();
      backgroundGenerator.dispose?.();
      generator.dispose?.();
    };
  }, [backgroundGenerator, generator, scramblePrefetcher]);

  useEffect(() => {
    generator.preload?.().catch((cause) => logBackgroundError('worker:preload-error', cause));
  }, [generator]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(SIDEBAR_MOBILE_QUERY);
    if (!mediaQuery) return;

    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobileShell(event.matches);
      if (event.matches) setIsSidebarCollapsed(true);
      if (!event.matches && activeNavItem === 'results') setActiveNavItem('timer');
    };

    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, [activeNavItem]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en';
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    setIsStageScrolled(stage.scrollTop > 0);
  }, []);

  const loadScramble = useCallback(
    async (nextEventId: EventId) => {
      const requestId = latestScrambleRequestId.current + 1;
      const loadStartMs = getScramblePerformanceNow();
      latestScrambleRequestId.current = requestId;
      const generateOptions = getDisplayGenerateOptions(nextEventId);
      const hasReadyScramble =
        enableScramblePrefetch && scramblePrefetcher.hasReady(nextEventId, generateOptions);
      logScramblePerformance('load:start', {
        eventId: nextEventId,
        hasReadyScramble,
        prefetchEnabled: enableScramblePrefetch,
        requestId,
      });
      setIsScrambleLoading(!hasReadyScramble);
      setScrambleError(undefined);
      if (!hasReadyScramble) {
        await waitForLoadingPaint();
        if (latestScrambleRequestId.current !== requestId) {
          logScramblePerformance('load:stale-after-paint', {
            eventId: nextEventId,
            requestId,
            totalMs: getScrambleElapsedMs(loadStartMs),
          });
          return;
        }
      }

      try {
        const result = enableScramblePrefetch
          ? await scramblePrefetcher.consume(nextEventId, generateOptions)
          : await generator.generate(nextEventId, generateOptions);

        if (latestScrambleRequestId.current !== requestId) {
          logScramblePerformance('load:stale-after-generate', {
            eventId: nextEventId,
            requestId,
            totalMs: getScrambleElapsedMs(loadStartMs),
          });
          return;
        }
        setScramble(result.scramble);
        logScramblePerformance('load:success', {
          eventId: nextEventId,
          requestId,
          scrambleLength: result.scramble.length,
          totalMs: getScrambleElapsedMs(loadStartMs),
        });
        if (enableScramblePrefetch) {
          scramblePrefetcher
            .prefetch(nextEventId, generateOptions)
            .catch((cause) => logBackgroundError('prefetch:active-unhandled-error', cause));
          if (!hasStartedInitialWarmPrefetch.current) {
            hasStartedInitialWarmPrefetch.current = true;
            scramblePrefetcher
              .prefetchWarmEvents(nextEventId)
              .catch((cause) => logBackgroundError('prefetch:warm-unhandled-error', cause));
          }
        }
      } catch (error) {
        if (latestScrambleRequestId.current !== requestId) {
          logScramblePerformance('load:stale-error', {
            eventId: nextEventId,
            requestId,
            totalMs: getScrambleElapsedMs(loadStartMs),
          });
          return;
        }
        setScramble('');
        setScrambleError(error instanceof Error ? error.message : String(error));
        logScramblePerformance('load:error', {
          error: error instanceof Error ? error.message : String(error),
          eventId: nextEventId,
          requestId,
          totalMs: getScrambleElapsedMs(loadStartMs),
        });
      } finally {
        if (latestScrambleRequestId.current === requestId) {
          setIsScrambleLoading(false);
        }
      }
    },
    [enableScramblePrefetch, generator, getDisplayGenerateOptions, scramblePrefetcher],
  );

  useEffect(() => {
    if (!sessionState.isReady) return;
    void loadScramble(displayEventId);
  }, [displayEventId, loadScramble, sessionState.isReady]);

  useEffect(() => {
    if (isEventTransitionPending) return;
    setDisplayEventId(sessionState.eventId);
  }, [isEventTransitionPending, sessionState.eventId]);

  const handleStart = useCallback(() => {
    if (
      pageState !== 'scramble' ||
      isScrambleLoading ||
      isEventTransitionPending ||
      scrambleError ||
      scramble.length === 0
    ) {
      return;
    }
    start();
    setPageState('timing');
  }, [isEventTransitionPending, isScrambleLoading, pageState, scramble, scrambleError, start]);

  const handleStop = useCallback(() => {
    const ms = stop();
    setFinalElapsed(ms);
    setPageState('result');
  }, [stop]);

  const handleCancel = useCallback(() => {
    reset();
    setPageState('scramble');
    // Same scramble — user returns to review it
  }, [reset]);

  const finishResult = useCallback(
    async (penalty?: SolvePenalty, multiBlindSolvedCount?: number) => {
      if (penalty) {
        const isMultiBlindResult = sessionState.eventId === '333mbld';
        const multiBlindScrambles = isMultiBlindResult ? getMultiBlindScrambleLines(scramble) : [];
        const attemptedCount = multiBlindScrambles.length;
        const solvedCount =
          typeof multiBlindSolvedCount === 'number'
            ? Math.min(Math.max(multiBlindSolvedCount, 0), attemptedCount)
            : attemptedCount;
        const resolvedPenalty =
          isMultiBlindResult && finalElapsed > MULTI_BLIND_DNF_LIMIT_MS ? 'dnf' : penalty;

        try {
          await sessionState.saveSolve({
            eventId: sessionState.eventId,
            scramble: isMultiBlindResult ? multiBlindScrambles : scramble,
            elapsedMs: finalElapsed,
            multiBlind: isMultiBlindResult
              ? {
                  attemptedCount,
                  solvedCount,
                }
              : undefined,
            penalty: resolvedPenalty,
          });
          setRuntimeStorageError(undefined);
        } catch (cause) {
          setRuntimeStorageError(cause instanceof Error ? cause.message : String(cause));
          return;
        }
      }

      reset();
      setPageState('scramble');
      void loadScramble(sessionState.eventId);
    },
    [finalElapsed, loadScramble, reset, scramble, sessionState],
  );

  const handleRefresh = useCallback(() => {
    void loadScramble(displayEventId);
  }, [displayEventId, loadScramble]);

  const handleMultiBlindCubeCountChange = useCallback(
    (nextCount: number) => {
      const committedCount = sanitizeMultiBlindCubeCount(nextCount);
      setMultiBlindCubeCount(committedCount);
      multiBlindCubeCountRef.current = committedCount;
      localStorage.setItem(MULTI_BLIND_CUBE_COUNT_STORAGE_KEY, String(committedCount));

      if (displayEventId !== '333mbld') return;

      const currentScrambleLines = getMultiBlindScrambleLines(scramble);
      if (currentScrambleLines.length === 0 || currentScrambleLines.length === committedCount) {
        return;
      }

      if (currentScrambleLines.length > committedCount) {
        setScramble(currentScrambleLines.slice(0, committedCount).join('\n'));
        setScrambleError(undefined);
        return;
      }

      const requestId = latestScrambleRequestId.current + 1;
      latestScrambleRequestId.current = requestId;
      setScrambleError(undefined);
      void generator
        .generate('333mbld', {
          multiBlindCubeCount: committedCount - currentScrambleLines.length,
        })
        .then((result) => {
          if (latestScrambleRequestId.current !== requestId) return;
          const appendedLines = getMultiBlindScrambleLines(result.scramble);
          setScramble(
            [...currentScrambleLines, ...appendedLines].slice(0, committedCount).join('\n'),
          );
        })
        .catch((cause) => {
          if (latestScrambleRequestId.current !== requestId) return;
          setScrambleError(cause instanceof Error ? cause.message : String(cause));
        });
    },
    [displayEventId, generator, scramble],
  );

  const handleStageScroll = useCallback((event: UIEvent<HTMLElement>) => {
    setIsStageScrolled(event.currentTarget.scrollTop > 0);
  }, []);

  const handleEventChange = useCallback(
    async (id: EventId) => {
      setPageState('scramble');
      setSelectedSolveId(undefined);
      setDisplayEventId(id);
      setScramble('');
      setScrambleError(undefined);
      setIsScrambleLoading(true);
      setIsEventTransitionPending(true);
      try {
        await sessionState.selectEvent(id);
        setRuntimeStorageError(undefined);
      } catch (cause) {
        setRuntimeStorageError(cause instanceof Error ? cause.message : String(cause));
        setDisplayEventId(sessionState.eventId);
      } finally {
        setIsEventTransitionPending(false);
      }
    },
    [sessionState],
  );

  const handleSessionChange = useCallback(
    async (sessionId: string) => {
      const transition = await sessionState.selectSession(sessionId);
      if (transition?.shouldGenerateScramble) {
        setPageState('scramble');
        setSelectedSolveId(undefined);
        setDisplayEventId(transition.eventId);
        setScramble('');
        setScrambleError(undefined);
        setIsScrambleLoading(true);
      }
    },
    [sessionState],
  );

  const handleCreateSession = useCallback(
    async (name: string) => {
      await sessionState.createSession(name);
    },
    [sessionState],
  );

  const handleSelectSolve = useCallback((solve: SolveRecord) => {
    setSelectedSolveId(solve.id);
  }, []);

  useEffect(() => {
    if (pageState !== 'result') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!['Enter', 'Space'].includes(event.code) || event.repeat) return;
      if (event.target instanceof HTMLElement) {
        if (event.target.isContentEditable) return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      }
      event.preventDefault();
      void finishResult('none');
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [finishResult, pageState]);

  const handlePenaltyChange = useCallback(
    async (solveId: string, penalty: SolvePenalty) => {
      await sessionState.updateSolvePenalty(solveId, penalty);
    },
    [sessionState],
  );

  const handleDeleteSolve = useCallback(
    async (solveId: string) => {
      await sessionState.deleteSolve(solveId);
      setSelectedSolveId(undefined);
    },
    [sessionState],
  );

  const { cancelReady, isInCancelZone, isReady, prepareStart, readyTrigger, startReady } =
    useTimerGesture(pageState === 'timing', {
      isStartEnabled: pageState === 'scramble',
      onStart: handleStart,
      onStop: handleStop,
      onCancel: handleCancel,
    });

  const selectedSolve = sessionState.solves.find((solve) => solve.id === selectedSolveId);
  const sidebarError = storageError ?? runtimeStorageError ?? sessionState.error;
  const messages = TIMER_MESSAGES[locale];
  const toggleThemeLabel =
    themeMode === 'dark' ? messages.toggleThemeLight : messages.toggleThemeDark;
  const toggleSidebarLabel = isSidebarCollapsed ? messages.sidebarExpand : messages.sidebarCollapse;
  const visibleNavItem = activeNavItem;
  const shouldShowTimerStage =
    activeNavItem === 'timer' || (!isMobileShell && activeNavItem === 'results');

  return (
    <div
      className={styles.root}
      data-state={pageState}
      data-sidebar={isSidebarCollapsed ? 'collapsed' : 'expanded'}
      data-stage-scrolled={isStageScrolled ? 'true' : 'false'}
    >
      <TimerSidebar
        sessions={sessionState.sessions}
        activeSessionId={sessionState.activeSessionId}
        activeNavItem={visibleNavItem}
        eventId={displayEventId}
        error={sidebarError}
        isCollapsed={isSidebarCollapsed}
        isMobileShell={isMobileShell}
        solves={sessionState.solves}
        themeMode={themeMode}
        onCreateSession={(name) => void handleCreateSession(name)}
        onDeleteSession={(sessionId) => void sessionState.deleteSession(sessionId)}
        onEventChange={(id) => void handleEventChange(id)}
        onLocaleToggle={() =>
          setLocale((currentLocale) => (currentLocale === 'zh-CN' ? 'en-US' : 'zh-CN'))
        }
        onNavItemChange={setActiveNavItem}
        onSelectSession={(sessionId) => void handleSessionChange(sessionId)}
        onSelectSolve={handleSelectSolve}
        onThemeToggle={() =>
          setThemeMode((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
        }
        onToggleSidebar={() => setIsSidebarCollapsed((isCollapsed) => !isCollapsed)}
        locale={locale}
        messages={messages}
        toggleSidebarLabel={toggleSidebarLabel}
        toggleThemeLabel={toggleThemeLabel}
      />
      {!isSidebarCollapsed && isMobileShell && (
        <button
          type="button"
          className={styles.sidebarBackdrop}
          onClick={() => setIsSidebarCollapsed(true)}
          aria-label={messages.sidebarBackdrop}
        />
      )}
      <TimerHeader
        eventId={displayEventId}
        isScrolled={isStageScrolled}
        isSidebarCollapsed={isSidebarCollapsed}
        locale={locale}
        messages={messages}
        themeMode={themeMode}
        toggleThemeLabel={toggleThemeLabel}
        onEventChange={(id) => void handleEventChange(id)}
        onLocaleToggle={() =>
          setLocale((currentLocale) => (currentLocale === 'zh-CN' ? 'en-US' : 'zh-CN'))
        }
        onThemeToggle={() =>
          setThemeMode((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
        }
      />
      <main
        ref={stageRef}
        className={styles.stage}
        aria-label={messages.timerPage}
        onScroll={handleStageScroll}
      >
        {shouldShowTimerStage && pageState === 'scramble' && (
          <ScrambleView
            eventId={displayEventId}
            scramble={isScrambleLoadingPreview ? '' : scramble}
            error={isScrambleLoadingPreview ? undefined : scrambleError}
            isLoading={isScrambleLoadingPreview || isScrambleLoading || isEventTransitionPending}
            isReady={isReady}
            multiBlindCubeCount={multiBlindCubeCount}
            touchReadyOverlayPreview={touchReadyOverlayPreview}
            messages={messages}
            onCancelReady={cancelReady}
            onMultiBlindCubeCountChange={handleMultiBlindCubeCountChange}
            onPrepareStart={prepareStart}
            onRefresh={handleRefresh}
            readyTrigger={readyTrigger}
            onStartReady={startReady}
          />
        )}
        {shouldShowTimerStage && pageState === 'timing' && (
          <TimingView elapsed={elapsed} isInCancelZone={isInCancelZone} />
        )}
        {shouldShowTimerStage && pageState === 'result' && (
          <ResultView
            elapsed={finalElapsed}
            isAutoDnf={
              sessionState.eventId === '333mbld' && finalElapsed > MULTI_BLIND_DNF_LIMIT_MS
            }
            messages={messages}
            multiBlindAttemptedCount={
              sessionState.eventId === '333mbld'
                ? getMultiBlindScrambleLines(scramble).length
                : undefined
            }
            onContinue={(multiBlindSolvedCount) => void finishResult('none', multiBlindSolvedCount)}
            onPlusTwo={() => void finishResult('+2')}
            onDnf={(multiBlindSolvedCount) => void finishResult('dnf', multiBlindSolvedCount)}
            onDelete={() => void finishResult()}
          />
        )}
        {!shouldShowTimerStage && activeNavItem === 'results' && (
          <section className={styles.secondaryPage} aria-label={messages.solves}>
            <header className={styles.secondaryHeader}>
              <div>
                <span className={styles.secondaryKicker}>{messages.sessionList}</span>
                <h1>{messages.solves}</h1>
              </div>
              <span className={styles.secondaryCount}>{sessionState.solves.length}</span>
            </header>
            {sidebarError && (
              <StorageAlert message={sidebarError} formatMessage={messages.storageError} />
            )}
            <div className={styles.mobileResultsLayout}>
              <section className={styles.mobileSolveList} aria-label={messages.solves}>
                <SolveList
                  solves={sessionState.solves}
                  emptyText={messages.noSolves}
                  onSelectSolve={handleSelectSolve}
                />
              </section>
              <SolveStatisticsPanel messages={messages} solves={sessionState.solves} />
            </div>
          </section>
        )}
        {!shouldShowTimerStage && activeNavItem !== 'results' && (
          <section className={styles.secondaryPage} aria-label={messages.timerPage}>
            <header className={styles.secondaryHeader}>
              <div>
                <span className={styles.secondaryKicker}>{messages.mobilePageUnavailable}</span>
                <h1>{activeNavItem === 'formula' ? messages.formulaLibrary : messages.settings}</h1>
              </div>
            </header>
          </section>
        )}
        {selectedSolve && (
          <SolveDetail
            locale={locale}
            messages={messages}
            solve={selectedSolve}
            onClose={() => setSelectedSolveId(undefined)}
            onDelete={(solveId) => void handleDeleteSolve(solveId)}
            onPenaltyChange={(solveId, penalty) => void handlePenaltyChange(solveId, penalty)}
          />
        )}
      </main>
    </div>
  );
};
