import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimerGestureOptions {
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  cancelZoneHeight?: number;
  isStartEnabled?: boolean;
}

export type TimerReadyTrigger =
  | {
      keyLabel: 'Space';
      type: 'keyboard';
    }
  | {
      type: 'touch';
    };

export const useTimerGesture = (
  isRunning: boolean,
  { onStart, onStop, onCancel, cancelZoneHeight = 80, isStartEnabled = true }: TimerGestureOptions,
): {
  cancelReady: () => void;
  isInCancelZone: boolean;
  isReady: boolean;
  prepareStart: () => void;
  readyTrigger?: TimerReadyTrigger;
  startReady: () => void;
} => {
  const [isInCancelZone, setIsInCancelZone] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [readyTrigger, setReadyTrigger] = useState<TimerReadyTrigger>();
  const isRunningRef = useRef(isRunning);
  const isStartEnabledRef = useRef(isStartEnabled);
  const isReadyRef = useRef(false);
  const readyKeyCodeRef = useRef<'Space' | null>(null);
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
    readyKeyCodeRef.current = null;
    setIsReady(false);
    setReadyTrigger(undefined);
  }, []);

  const prepareStart = useCallback(() => {
    if (isRunningRef.current || !isStartEnabledRef.current) return;
    isReadyRef.current = true;
    readyKeyCodeRef.current = null;
    setIsReady(true);
    setReadyTrigger({ type: 'touch' });
  }, []);

  const startReady = useCallback(() => {
    if (!isReadyRef.current) return;
    isReadyRef.current = false;
    readyKeyCodeRef.current = null;
    setIsReady(false);
    setReadyTrigger(undefined);
    if (!isRunningRef.current && isStartEnabledRef.current) {
      onStartRef.current();
    }
  }, []);

  useEffect(() => {
    const isInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const interactiveElement = target.closest(
        'input, textarea, select, button, a[href], [contenteditable="true"], [role="button"], [role="combobox"], [role="listbox"], [role="option"], [data-timer-ignore-space]',
      );
      return interactiveElement !== null;
    };

    const isInteractiveFocused = (target: EventTarget | null) => {
      if (isInteractiveTarget(target)) return true;
      return isInteractiveTarget(document.activeElement);
    };

    // ── Desktop: keyboard ───────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && isReadyRef.current) {
        e.preventDefault();
        cancelReady();
        return;
      }

      if (isInteractiveFocused(e.target)) return;
      if (e.code !== 'Space' || e.repeat) return;
      if (!isRunningRef.current && !isStartEnabledRef.current) return;
      e.preventDefault();
      if (isRunningRef.current) {
        onStopRef.current();
      } else {
        const keyCode = e.code as 'Space';
        isReadyRef.current = true;
        readyKeyCodeRef.current = keyCode;
        setIsReady(true);
        setReadyTrigger({
          keyLabel: 'Space',
          type: 'keyboard',
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isInteractiveFocused(e.target)) return;
      if (e.code !== 'Space') return;
      if (!isReadyRef.current) return;
      if (readyKeyCodeRef.current !== e.code) return;
      e.preventDefault();
      isReadyRef.current = false;
      readyKeyCodeRef.current = null;
      setIsReady(false);
      setReadyTrigger(undefined);
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

  return { cancelReady, isInCancelZone, isReady, prepareStart, readyTrigger, startReady };
};
