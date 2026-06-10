import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimerGestureOptions {
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  cancelZoneHeight?: number;
  isStartEnabled?: boolean;
}

export const useTimerGesture = (
  isRunning: boolean,
  { onStart, onStop, onCancel, cancelZoneHeight = 80, isStartEnabled = true }: TimerGestureOptions,
): {
  cancelReady: () => void;
  isInCancelZone: boolean;
  isReady: boolean;
  prepareStart: () => void;
  startReady: () => void;
} => {
  const [isInCancelZone, setIsInCancelZone] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const isRunningRef = useRef(isRunning);
  const isStartEnabledRef = useRef(isStartEnabled);
  const isReadyRef = useRef(false);
  const onStartRef = useRef(onStart);
  const onStopRef = useRef(onStop);
  const onCancelRef = useRef(onCancel);

  // Keep refs current so event listeners don't capture stale closures
  isRunningRef.current = isRunning;
  isStartEnabledRef.current = isStartEnabled;
  onStartRef.current = onStart;
  onStopRef.current = onStop;
  onCancelRef.current = onCancel;

  const cancelReady = useCallback(() => {
    isReadyRef.current = false;
    setIsReady(false);
  }, []);

  const prepareStart = useCallback(() => {
    if (isRunningRef.current || !isStartEnabledRef.current) return;
    isReadyRef.current = true;
    setIsReady(true);
  }, []);

  const startReady = useCallback(() => {
    if (!isReadyRef.current) return;
    isReadyRef.current = false;
    setIsReady(false);
    if (!isRunningRef.current && isStartEnabledRef.current) {
      onStartRef.current();
    }
  }, []);

  useEffect(() => {
    const isFormControlFocused = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    };

    // ── Desktop: keyboard ───────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFormControlFocused(e.target)) return;
      if (!['Enter', 'Space'].includes(e.code) || e.repeat) return;
      if (!isRunningRef.current && !isStartEnabledRef.current) return;
      e.preventDefault();
      if (isRunningRef.current) {
        onStopRef.current();
      } else {
        isReadyRef.current = true;
        setIsReady(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isFormControlFocused(e.target)) return;
      if (!['Enter', 'Space'].includes(e.code)) return;
      if (!isReadyRef.current) return;
      e.preventDefault();
      isReadyRef.current = false;
      setIsReady(false);
      if (!isRunningRef.current && isStartEnabledRef.current) {
        onStartRef.current();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isRunningRef.current) return;
      const touch = e.changedTouches[0];
      setIsInCancelZone(touch.clientY < cancelZoneHeight);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isReadyRef.current) cancelReady();

      if (!isRunningRef.current) return;

      const touch = e.changedTouches[0];
      setIsInCancelZone(false);
      if (touch.clientY < cancelZoneHeight) {
        onCancelRef.current();
      } else {
        onStopRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', cancelReady);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', cancelReady);
    };
  }, [cancelReady, cancelZoneHeight]);

  return { cancelReady, isInCancelZone, isReady, prepareStart, startReady };
};
