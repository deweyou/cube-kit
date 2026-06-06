import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createDefaultScrambleGenerator, createMathRandomSource } from '@cubegin/scramble-core';
import type { WcaEventId } from '@cubegin/scramble-puzzle';
import type { SolvePenalty, SolveRecord, TimerSessionRepository } from '@cubegin/timer-session';
import { useTimer } from './hooks/use-timer';
import { useTimerGesture } from './hooks/use-timer-gesture';
import { useTimerSessions } from './hooks/use-timer-sessions';
import { SessionSelector } from './components/session-selector';
import { SolveDetail } from './components/solve-detail';
import { SolveList } from './components/solve-list';
import { StorageAlert } from './components/storage-alert';
import { createMemoryTimerSessionRepository } from './storage/memory-timer-session-repository';
import { createIndexedDbTimerSessionRepository } from './storage/timer-session-db';
import { ScrambleView } from './views/scramble-view';
import { TimingView } from './views/timing-view';
import { ResultView } from './views/result-view';
import styles from './timer-page.module.css';

type PageState = 'scramble' | 'timing' | 'result';

const DEFAULT_MULTI_BLIND_CUBE_COUNT = 3;

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
    return <div className={styles.loading}>载入成绩中...</div>;
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

  const { elapsed, start, stop, reset } = useTimer();

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

  const handleDeleteActiveSession = useCallback(async () => {
    await sessionState.deleteSession(sessionState.activeSessionId);
  }, [sessionState]);

  const handleSelectSolve = useCallback((solve: SolveRecord) => {
    setSelectedSolveId(solve.id);
  }, []);

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

  const { isInCancelZone, isReady } = useTimerGesture(pageState === 'timing', {
    onStart: handleStart,
    onStop: handleStop,
    onCancel: handleCancel,
  });

  const selectedSolve = sessionState.solves.find((solve) => solve.id === selectedSolveId);

  const sessionPanel = (
    <aside className={styles.sessionPanel} aria-label="成绩面板">
      <StorageAlert message={storageError ?? runtimeStorageError ?? sessionState.error} />
      <SessionSelector
        sessions={sessionState.sessions}
        activeSessionId={sessionState.activeSessionId}
        canDeleteActiveSession={sessionState.canDeleteActiveSession}
        onCreateSession={(name) => void handleCreateSession(name)}
        onDeleteActiveSession={() => void handleDeleteActiveSession()}
        onSelectSession={(sessionId) => void handleSessionChange(sessionId)}
      />
      <SolveList solves={sessionState.solves} onSelectSolve={handleSelectSolve} />
    </aside>
  );

  return (
    <div className={styles.root}>
      {pageState === 'scramble' && (
        <ScrambleView
          eventId={sessionState.eventId}
          scramble={scramble}
          error={scrambleError}
          isLoading={isScrambleLoading}
          isReady={isReady}
          sessionPanel={sessionPanel}
          onEventChange={(id) => void handleEventChange(id)}
          onRefresh={handleRefresh}
          onStart={handleStart}
        />
      )}
      {pageState === 'timing' && <TimingView elapsed={elapsed} isInCancelZone={isInCancelZone} />}
      {pageState === 'result' && (
        <ResultView
          elapsed={finalElapsed}
          scramble={scramble}
          onContinue={() => void finishResult('none')}
          onPlusTwo={() => void finishResult('+2')}
          onDnf={() => void finishResult('dnf')}
          onDelete={() => void finishResult()}
        />
      )}
      {selectedSolve && (
        <SolveDetail
          solve={selectedSolve}
          onClose={() => setSelectedSolveId(undefined)}
          onDelete={(solveId) => void handleDeleteSolve(solveId)}
          onPenaltyChange={(solveId, penalty) => void handlePenaltyChange(solveId, penalty)}
        />
      )}
    </div>
  );
};
