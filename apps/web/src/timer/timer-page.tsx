import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createDefaultScrambleGenerator, createMathRandomSource } from '@cubegin/scramble-core';
import type { WcaEventId } from '@cubegin/scramble-puzzle';
import { useTimer } from './hooks/use-timer';
import { useTimerGesture } from './hooks/use-timer-gesture';
import { ScrambleView } from './views/scramble-view';
import { TimingView } from './views/timing-view';
import { ResultView } from './views/result-view';

type PageState = 'scramble' | 'timing' | 'result';

const DEFAULT_MULTI_BLIND_CUBE_COUNT = 3;

const getMultiBlindCubeCount = (eventId: WcaEventId): number | undefined =>
  eventId === '333mbld' ? DEFAULT_MULTI_BLIND_CUBE_COUNT : undefined;

export const TimerPage = () => {
  const generator = useMemo(
    () => createDefaultScrambleGenerator({ random: createMathRandomSource() }),
    [],
  );
  const latestScrambleRequestId = useRef(0);
  const [eventId, setEventId] = useState<WcaEventId>('333');
  const [scramble, setScramble] = useState('');
  const [scrambleError, setScrambleError] = useState<string>();
  const [isScrambleLoading, setIsScrambleLoading] = useState(true);
  const [pageState, setPageState] = useState<PageState>('scramble');
  const [finalElapsed, setFinalElapsed] = useState(0);

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
    void loadScramble(eventId);
  }, [eventId, loadScramble]);

  const handleStart = useCallback(() => {
    start();
    setPageState('timing');
  }, [start]);

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

  const handleContinue = useCallback(() => {
    reset();
    void loadScramble(eventId);
    setPageState('scramble');
  }, [reset, eventId, loadScramble]);

  const handleDiscard = useCallback(() => {
    reset();
    void loadScramble(eventId);
    setPageState('scramble');
  }, [reset, eventId, loadScramble]);

  const handleRefresh = useCallback(() => {
    void loadScramble(eventId);
  }, [eventId, loadScramble]);

  const handleEventChange = useCallback((id: WcaEventId) => {
    setScramble('');
    setScrambleError(undefined);
    setIsScrambleLoading(true);
    setEventId(id);
  }, []);

  const { isInCancelZone, isReady } = useTimerGesture(pageState === 'timing', {
    onStart: handleStart,
    onStop: handleStop,
    onCancel: handleCancel,
  });

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {pageState === 'scramble' && (
        <ScrambleView
          eventId={eventId}
          scramble={scramble}
          error={scrambleError}
          isLoading={isScrambleLoading}
          isReady={isReady}
          onEventChange={handleEventChange}
          onRefresh={handleRefresh}
        />
      )}
      {pageState === 'timing' && <TimingView elapsed={elapsed} isInCancelZone={isInCancelZone} />}
      {pageState === 'result' && (
        <ResultView
          elapsed={finalElapsed}
          scramble={scramble}
          onContinue={handleContinue}
          onPlusTwo={handleContinue}
          onDnf={handleContinue}
          onDelete={handleDiscard}
        />
      )}
    </div>
  );
};
