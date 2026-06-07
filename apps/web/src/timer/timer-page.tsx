import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@deweyou-design/react/button';
import { Tooltip } from '@deweyou-design/react/tooltip';
import { createDefaultScrambleGenerator, createMathRandomSource } from '@cubegin/scramble-core';
import type { WcaEventId } from '@cubegin/scramble-puzzle';
import type { SolvePenalty, SolveRecord, TimerSessionRepository } from '@cubegin/timer-session';
import { useTimer } from './hooks/use-timer';
import { useTimerGesture } from './hooks/use-timer-gesture';
import { useTimerSessions } from './hooks/use-timer-sessions';
import { SolveDetail } from './components/solve-detail';
import { TimerSidebar } from './components/timer-sidebar';
import {
  LanguageIcon,
  SunIcon,
  ThemeMoonIcon,
} from './components/timer-icons';
import { TIMER_MESSAGES, type TimerLocale } from './timer-i18n';
import { createMemoryTimerSessionRepository } from './storage/memory-timer-session-repository';
import { createIndexedDbTimerSessionRepository } from './storage/timer-session-db';
import { ScrambleView } from './views/scramble-view';
import { TimingView } from './views/timing-view';
import { ResultView } from './views/result-view';
import styles from './timer-page.module.css';

type PageState = 'scramble' | 'timing' | 'result';
type ThemeMode = 'light' | 'dark';

const DEFAULT_MULTI_BLIND_CUBE_COUNT = 3;
const THEME_STORAGE_KEY = 'cubegin-theme';
const LANGUAGE_STORAGE_KEY = 'cubegin-language';
const SIDEBAR_MOBILE_QUERY = '(max-width: 860px)';

const getMultiBlindCubeCount = (eventId: WcaEventId): number | undefined =>
  eventId === '333mbld' ? DEFAULT_MULTI_BLIND_CUBE_COUNT : undefined;

interface TimerPageProps {
  repository?: TimerSessionRepository;
}

export const TimerPage = ({ repository: injectedRepository }: TimerPageProps = {}) => {
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

  return <TimerPageContent repository={repository} storageError={storageError} />;
};

interface TimerPageContentProps {
  repository: TimerSessionRepository;
  storageError?: string;
}

const TimerPageContent = ({ repository, storageError }: TimerPageContentProps) => {
  const generator = useMemo(
    () => createDefaultScrambleGenerator({ random: createMathRandomSource() }),
    [],
  );
  const sessionState = useTimerSessions({ repository });
  const latestScrambleRequestId = useRef(0);
  const [scramble, setScramble] = useState('');
  const [scrambleError, setScrambleError] = useState<string>();
  const [isScrambleLoading, setIsScrambleLoading] = useState(true);
  const [pageState, setPageState] = useState<PageState>('scramble');
  const [finalElapsed, setFinalElapsed] = useState(0);
  const [selectedSolveId, setSelectedSolveId] = useState<string>();
  const [runtimeStorageError, setRuntimeStorageError] = useState<string>();
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.matchMedia?.(SIDEBAR_MOBILE_QUERY).matches ?? false,
  );

  const { elapsed, start, stop, reset } = useTimer();

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(SIDEBAR_MOBILE_QUERY);
    if (!mediaQuery) return;

    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsSidebarCollapsed(true);
    };

    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en';
    localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  }, [locale]);

  const loadScramble = useCallback(
    async (nextEventId: WcaEventId) => {
      const requestId = latestScrambleRequestId.current + 1;
      latestScrambleRequestId.current = requestId;
      setIsScrambleLoading(true);
      setScrambleError(undefined);

      try {
        const result = await generator.generate(nextEventId, {
          multiBlindCubeCount: getMultiBlindCubeCount(nextEventId),
        });

        if (latestScrambleRequestId.current !== requestId) return;
        setScramble(result.scramble);
      } catch (error) {
        if (latestScrambleRequestId.current !== requestId) return;
        setScramble('');
        setScrambleError(error instanceof Error ? error.message : String(error));
      } finally {
        if (latestScrambleRequestId.current === requestId) {
          setIsScrambleLoading(false);
        }
      }
    },
    [generator],
  );

  useEffect(() => {
    if (!sessionState.isReady) return;
    void loadScramble(sessionState.eventId);
  }, [loadScramble, sessionState.eventId, sessionState.isReady]);

  const handleStart = useCallback(() => {
    if (pageState !== 'scramble' || isScrambleLoading || scrambleError || scramble.length === 0) {
      return;
    }
    start();
    setPageState('timing');
  }, [isScrambleLoading, pageState, scramble, scrambleError, start]);

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
    async (penalty?: SolvePenalty) => {
      if (penalty) {
        try {
          await sessionState.saveSolve({
            eventId: sessionState.eventId,
            scramble,
            elapsedMs: finalElapsed,
            penalty,
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
    void loadScramble(sessionState.eventId);
  }, [sessionState.eventId, loadScramble]);

  const handleEventChange = useCallback(
    async (id: WcaEventId) => {
      setScramble('');
      setScrambleError(undefined);
      setIsScrambleLoading(true);
      await sessionState.selectEvent(id);
    },
    [sessionState],
  );

  const handleSessionChange = useCallback(
    async (sessionId: string) => {
      const transition = await sessionState.selectSession(sessionId);
      if (transition?.shouldGenerateScramble) {
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

  const { cancelReady, isInCancelZone, isReady } = useTimerGesture(pageState === 'timing', {
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

  return (
    <div
      className={styles.root}
      data-state={pageState}
      data-sidebar={isSidebarCollapsed ? 'collapsed' : 'expanded'}
    >
      <TimerSidebar
        sessions={sessionState.sessions}
        activeSessionId={sessionState.activeSessionId}
        eventId={sessionState.eventId}
        error={sidebarError}
        isCollapsed={isSidebarCollapsed}
        solves={sessionState.solves}
        onCreateSession={(name) => void handleCreateSession(name)}
        onDeleteSession={(sessionId) => void sessionState.deleteSession(sessionId)}
        onEventChange={(id) => void handleEventChange(id)}
        onSelectSession={(sessionId) => void handleSessionChange(sessionId)}
        onSelectSolve={handleSelectSolve}
        onToggleSidebar={() => setIsSidebarCollapsed((isCollapsed) => !isCollapsed)}
        locale={locale}
        messages={messages}
        toggleSidebarLabel={toggleSidebarLabel}
      />
      <div className={styles.pageActions}>
        <Tooltip.Root placement="bottom">
          <Tooltip.Trigger>
            <Button.Icon
              className={styles.pageActionButton}
              variant="ghost"
              color="neutral"
              size="sm"
              icon={<LanguageIcon />}
              onClick={() =>
                setLocale((currentLocale) => (currentLocale === 'zh-CN' ? 'en-US' : 'zh-CN'))
              }
              aria-label={messages.toggleLanguage}
            />
          </Tooltip.Trigger>
          <Tooltip.Content>{messages.toggleLanguage}</Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root placement="bottom">
          <Tooltip.Trigger>
            <Button.Icon
              className={styles.pageActionButton}
              variant="ghost"
              color="neutral"
              size="sm"
              icon={themeMode === 'dark' ? <SunIcon /> : <ThemeMoonIcon />}
              onClick={() =>
                setThemeMode((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
              }
              aria-label={toggleThemeLabel}
            />
          </Tooltip.Trigger>
          <Tooltip.Content>{toggleThemeLabel}</Tooltip.Content>
        </Tooltip.Root>
      </div>
      <main className={styles.stage} aria-label={messages.timerPage}>
        {pageState === 'scramble' && (
          <ScrambleView
            eventId={sessionState.eventId}
            scramble={scramble}
            error={scrambleError}
            isLoading={isScrambleLoading}
            isReady={isReady}
            messages={messages}
            onCancelReady={cancelReady}
            onRefresh={handleRefresh}
          />
        )}
        {pageState === 'timing' && <TimingView elapsed={elapsed} isInCancelZone={isInCancelZone} />}
        {pageState === 'result' && (
          <ResultView
            elapsed={finalElapsed}
            messages={messages}
            onContinue={() => void finishResult('none')}
            onPlusTwo={() => void finishResult('+2')}
            onDnf={() => void finishResult('dnf')}
            onDelete={() => void finishResult()}
          />
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
