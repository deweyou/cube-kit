import { useCallback, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Button } from '@deweyou-design/react/button';
import { Tooltip } from '@deweyou-design/react/tooltip';
import { CubeginAnimatedIcon } from '@cubegin/icons/react';
import { renderScrambleImage } from '@cubegin/scramble-image';
import type { WcaEventId } from '@cubegin/shared/wca';
import { CancelIcon, RefreshTimerIcon } from '../components/timer-icons';
import { ScrambleText } from '../components/scramble-text';
import { ScrambleImage } from '../components/scramble-image';
import type { TimerMessages } from '../timer-i18n';
import styles from './scramble-view.module.css';

interface ScrambleViewProps {
  eventId: WcaEventId;
  scramble: string;
  error?: string;
  isLoading?: boolean;
  isReady?: boolean;
  touchReadyOverlayPreview?: 'cancel' | 'start';
  messages: TimerMessages;
  onCancelReady: () => void;
  onPrepareStart: () => void;
  onRefresh: () => void;
  onStartReady: () => void;
}

const ACTION_LONG_PRESS_DELAY_MS = 300;
const ACTION_MOVE_CANCEL_DISTANCE = 10;
const TOUCH_CANCEL_ZONE_HEIGHT = 128;

export const ScrambleView = ({
  eventId,
  scramble,
  error,
  isLoading = false,
  isReady = false,
  touchReadyOverlayPreview,
  messages,
  onCancelReady,
  onPrepareStart,
  onRefresh,
  onStartReady,
}: ScrambleViewProps) => {
  const [isTouchReadyOverlayVisible, setIsTouchReadyOverlayVisible] = useState(false);
  const [isTouchCancelTarget, setIsTouchCancelTarget] = useState(false);
  const cancelActionRef = useRef<HTMLSpanElement>(null);
  const actionPressRef = useRef<{
    isReady: boolean;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextActionClickRef = useRef(false);
  const svg = useMemo(
    () => (scramble.length > 0 ? renderScrambleImage(eventId, scramble) : ''),
    [eventId, scramble],
  );
  const scrambleText = error ?? (isLoading ? messages.scrambleLoading : scramble);

  const canStart = !isLoading && !error && scramble.length > 0;
  const isTouchReadyVisible =
    isTouchReadyOverlayVisible ||
    touchReadyOverlayPreview === 'start' ||
    touchReadyOverlayPreview === 'cancel';
  const isTouchCancelVisible = isTouchCancelTarget || touchReadyOverlayPreview === 'cancel';

  const clearActionPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    actionPressRef.current = null;
    setIsTouchReadyOverlayVisible(false);
    setIsTouchCancelTarget(false);
  }, []);

  const cancelActionPress = useCallback(() => {
    clearActionPress();
    onCancelReady();
  }, [clearActionPress, onCancelReady]);

  const isPointInsideCancelAction = useCallback((clientX: number, clientY: number) => {
    const rect = cancelActionRef.current?.getBoundingClientRect();
    if (!rect) return false;

    return (
      clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    );
  }, []);

  const handleActionPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!canStart || event.button !== 0) return;
      if (cancelActionRef.current?.contains(event.target as Node)) return;

      event.preventDefault();
      clearActionPress();
      actionPressRef.current = {
        isReady: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        if (!actionPressRef.current || actionPressRef.current.pointerId !== event.pointerId) {
          return;
        }
        actionPressRef.current.isReady = true;
        setIsTouchReadyOverlayVisible(true);
        setIsTouchCancelTarget(event.clientY <= TOUCH_CANCEL_ZONE_HEIGHT);
        onPrepareStart();
      }, ACTION_LONG_PRESS_DELAY_MS);
    },
    [canStart, clearActionPress, onPrepareStart],
  );

  const handleActionPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const press = actionPressRef.current;
      if (!press || press.pointerId !== event.pointerId) return;

      const deltaX = Math.abs(event.clientX - press.startX);
      const deltaY = Math.abs(event.clientY - press.startY);
      if (
        !press.isReady &&
        (deltaX > ACTION_MOVE_CANCEL_DISTANCE || deltaY > ACTION_MOVE_CANCEL_DISTANCE)
      ) {
        cancelActionPress();
        return;
      }

      if (press.isReady) {
        setIsTouchCancelTarget(event.clientY <= TOUCH_CANCEL_ZONE_HEIGHT);
      }
    },
    [cancelActionPress],
  );

  const handleActionPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const press = actionPressRef.current;
      if (!press || press.pointerId !== event.pointerId) return;

      const isCancelRelease =
        event.clientY <= TOUCH_CANCEL_ZONE_HEIGHT ||
        isPointInsideCancelAction(event.clientX, event.clientY);
      const shouldStart = press.isReady && !isCancelRelease;
      const shouldCancelViaIcon =
        press.isReady && isPointInsideCancelAction(event.clientX, event.clientY);
      clearActionPress();

      if (shouldCancelViaIcon) {
        suppressNextActionClickRef.current = true;
        onCancelReady();
        return;
      }

      if (shouldStart) {
        onStartReady();
        return;
      }

      onCancelReady();
    },
    [clearActionPress, isPointInsideCancelAction, onCancelReady, onStartReady],
  );

  const handleActionPointerCancel = useCallback(() => {
    cancelActionPress();
  }, [cancelActionPress]);

  const handleCancelActionClickCapture = useCallback((event: MouseEvent<HTMLSpanElement>) => {
    if (!suppressNextActionClickRef.current) return;
    suppressNextActionClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <section
      className={styles.root}
      data-loading={isLoading ? 'true' : undefined}
      aria-label={messages.timerPage}
    >
      <div
        className={`${styles.startSurface} ${isReady ? styles.startSurfaceReady : ''}`}
        data-loading={isLoading ? 'true' : undefined}
        aria-disabled={!canStart}
      >
        <div className={styles.scrambleRow}>
          {isLoading && (
            <CubeginAnimatedIcon
              className={styles.loadingLogo}
              loading
              size={52}
              title={messages.scrambleLoading}
              trigger="loop"
            />
          )}
          <span className={styles.scrambleBlock}>
            <ScrambleText scramble={scrambleText} isLoading={isLoading} />
          </span>
        </div>
        {!isLoading && <ScrambleImage svg={svg} />}
      </div>
      {!isLoading && (
        <div
          className={styles.actionStack}
          data-touch-ready={isTouchReadyVisible ? 'true' : undefined}
          onPointerCancel={handleActionPointerCancel}
          onPointerDown={handleActionPointerDown}
          onPointerMove={handleActionPointerMove}
          onPointerUp={handleActionPointerUp}
        >
          <span className={`${styles.hint} ${isReady ? styles.hintReady : ''}`}>
            {isReady ? (
              <span className={styles.hintAction}>{messages.releaseToStart}</span>
            ) : canStart ? (
              <span className={styles.hintAction}>{messages.holdEnterToStart}</span>
            ) : (
              <span className={styles.hintAction}>{messages.waitingScramble}</span>
            )}
          </span>
          <span
            ref={cancelActionRef}
            className={styles.cancelAction}
            onClickCapture={handleCancelActionClickCapture}
          >
            <Tooltip.Root placement="bottom">
              <Tooltip.Trigger>
                <Button.Icon
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  className={styles.refreshButton}
                  icon={isReady ? <CancelIcon /> : <RefreshTimerIcon />}
                  onClick={isReady ? onCancelReady : onRefresh}
                  aria-label={isReady ? messages.cancelReady : messages.refreshScramble}
                />
              </Tooltip.Trigger>
              <Tooltip.Content>
                {isReady ? messages.cancelReady : messages.refreshScramble}
              </Tooltip.Content>
            </Tooltip.Root>
          </span>
        </div>
      )}
      {isTouchReadyVisible && (
        <div
          className={styles.touchReadyOverlay}
          data-cancel-target={isTouchCancelVisible ? 'true' : 'false'}
          aria-hidden="true"
        >
          <div className={styles.touchCancelZone}>
            <span className={styles.touchCancelText}>
              {isTouchCancelVisible ? messages.releaseToCancel : messages.slideUpToCancel}
            </span>
          </div>
          <div className={styles.touchReleaseHint}>{messages.releaseToStart}</div>
        </div>
      )}
    </section>
  );
};
