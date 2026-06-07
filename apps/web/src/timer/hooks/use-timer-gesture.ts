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
): { cancelReady: () => void; isInCancelZone: boolean; isReady: boolean } => {
  const [isInCancelZone, setIsInCancelZone] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      e.preventDefault();
      if (isRunningRef.current) {
        onStopRef.current();
      } else if (isStartEnabledRef.current) {
        isReadyRef.current = true;
        setIsReady(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isFormControlFocused(e.target)) return;
      if (!['Enter', 'Space'].includes(e.code)) return;
      e.preventDefault();
      if (isReadyRef.current) {
        isReadyRef.current = false;
        setIsReady(false);
        if (!isRunningRef.current && isStartEnabledRef.current) {
          onStartRef.current();
        }
      }
    };

    // ── H5: touch events ──────────────────────────
    const handleTouchStart = (_e: TouchEvent) => {
      if (isRunningRef.current) return;
      longPressTimerRef.current = setTimeout(() => {
        onStartRef.current();
      }, 300);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isRunningRef.current) return;
      const touch = e.changedTouches[0];
      setIsInCancelZone(touch.clientY < cancelZoneHeight);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Cancel pending long-press
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

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
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      if (longPressTimerRef.current !== null) clearTimeout(longPressTimerRef.current);
    };
  }, [cancelZoneHeight]);

  return { cancelReady, isInCancelZone, isReady };
};
