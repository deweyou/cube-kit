import { useState, useEffect, useRef, useCallback } from 'react';
import { createTimer } from '@cubekit/timer';
import type { TimerState } from '@cubekit/timer';

export const useTimer = () => {
  const timerRef = useRef(createTimer());
  const [state, setState] = useState<TimerState>({ status: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef(0);

  const tick = useCallback(() => {
    const s = timerRef.current.getState();
    if (s.status === 'running') {
      setElapsed(performance.now() - s.startTime);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const start = useCallback(() => {
    timerRef.current.start();
    setState(timerRef.current.getState());
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const ms = timerRef.current.stop();
    setState(timerRef.current.getState());
    setElapsed(ms);
    return ms;
  }, []);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    timerRef.current.reset();
    setState({ status: 'idle' });
    setElapsed(0);
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return { state, elapsed, start, stop, reset };
};
