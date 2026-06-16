import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { Button } from '@deweyou-design/react/button';
import { Tooltip } from '@deweyou-design/react/tooltip';
import { CubeginAnimatedIcon } from '@cubegin/icons/react';
import { renderScrambleImage } from '@cubegin/scramble-image';
import type { WcaEventId } from '@cubegin/shared/wca';
import {
  CancelIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshTimerIcon,
} from '../components/timer-icons';
import { ScrambleText } from '../components/scramble-text';
import { ScrambleImage } from '../components/scramble-image';
import type { TimerReadyTrigger } from '../hooks/use-timer-gesture';
import type { TimerMessages } from '../timer-i18n';
import styles from './scramble-view.module.css';

interface ScrambleViewProps {
  eventId: WcaEventId;
  scramble: string;
  error?: string;
  isLoading?: boolean;
  isReady?: boolean;
  multiBlindCubeCount?: number;
  touchReadyOverlayPreview?: 'cancel' | 'start';
  messages: TimerMessages;
  onCancelReady: () => void;
  onMultiBlindCubeCountChange?: (count: number) => void;
  onPrepareStart: () => void;
  onRefresh: () => void;
  readyTrigger?: TimerReadyTrigger;
  onStartReady: () => void;
}

const ACTION_LONG_PRESS_DELAY_MS = 300;
const ACTION_MOVE_CANCEL_DISTANCE = 10;
const TOUCH_CANCEL_ZONE_HEIGHT = 128;
const MIN_MULTI_BLIND_CUBE_COUNT = 2;
const MAX_MULTI_BLIND_CUBE_COUNT = 99;

export const ScrambleView = ({
  eventId,
  scramble,
  error,
  isLoading = false,
  isReady = false,
  multiBlindCubeCount = 3,
  touchReadyOverlayPreview,
  messages,
  onCancelReady,
  onMultiBlindCubeCountChange,
  onPrepareStart,
  onRefresh,
  readyTrigger,
  onStartReady,
}: ScrambleViewProps) => {
  const cubeScrambles = useMemo(
    () =>
      eventId === '333mbld'
        ? scramble
            .split(/\n/u)
            .map((line) => line.trim())
            .filter(Boolean)
        : [],
    [eventId, scramble],
  );
  const isMultiBlindScramble = eventId === '333mbld' && cubeScrambles.length > 0;
  const [activeCubeIndex, setActiveCubeIndex] = useState(0);
  const firstCubeScramble = cubeScrambles[0] ?? '';
  const previousFirstCubeScrambleRef = useRef<string | undefined>(undefined);
  const [multiBlindCubeCountDraft, setMultiBlindCubeCountDraft] = useState(
    String(multiBlindCubeCount),
  );
  const parsedMultiBlindCubeCountDraft = Number(multiBlindCubeCountDraft);
  const isMultiBlindCubeCountDraftValid =
    Number.isSafeInteger(parsedMultiBlindCubeCountDraft) &&
    parsedMultiBlindCubeCountDraft >= MIN_MULTI_BLIND_CUBE_COUNT &&
    parsedMultiBlindCubeCountDraft <= MAX_MULTI_BLIND_CUBE_COUNT;
  const hasMultiBlindCubeCountPendingChange =
    multiBlindCubeCountDraft !== String(multiBlindCubeCount);
  const activeScramble = isMultiBlindScramble
    ? (cubeScrambles[activeCubeIndex] ?? cubeScrambles[0] ?? '')
    : scramble;
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
    () => (activeScramble.length > 0 ? renderScrambleImage(eventId, activeScramble) : ''),
    [activeScramble, eventId],
  );
  const scrambleText = error ?? (isLoading ? messages.scrambleLoading : activeScramble);

  const canStart = !isLoading && !error && scramble.length > 0;
  const isKeyboardReadyVisible = isReady && readyTrigger?.type === 'keyboard';
  const isReadyOverlayVisible =
    isTouchReadyOverlayVisible ||
    isKeyboardReadyVisible ||
    touchReadyOverlayPreview === 'start' ||
    touchReadyOverlayPreview === 'cancel';
  const isTouchCancelVisible = isTouchCancelTarget || touchReadyOverlayPreview === 'cancel';
  const overlayCancelText = isKeyboardReadyVisible
    ? messages.pressEscapeToCancel
    : isTouchCancelVisible
      ? messages.releaseToCancel
      : messages.slideUpToCancel;
  const overlayStartText =
    isKeyboardReadyVisible && readyTrigger?.type === 'keyboard'
      ? messages.releaseKeyToStart(readyTrigger.keyLabel)
      : messages.releaseToStart;

  const clearActionPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    actionPressRef.current = null;
    setIsTouchReadyOverlayVisible(false);
    setIsTouchCancelTarget(false);
  }, []);

  const selectNextCube = useCallback(() => {
    setActiveCubeIndex((currentIndex) => Math.min(currentIndex + 1, cubeScrambles.length - 1));
  }, [cubeScrambles.length]);

  const selectPreviousCube = useCallback(() => {
    setActiveCubeIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }, []);

  const commitMultiBlindCubeCount = useCallback(() => {
    if (!hasMultiBlindCubeCountPendingChange) return;
    if (!isMultiBlindCubeCountDraftValid) {
      setMultiBlindCubeCountDraft(String(multiBlindCubeCount));
      return;
    }

    onMultiBlindCubeCountChange?.(parsedMultiBlindCubeCountDraft);
  }, [
    hasMultiBlindCubeCountPendingChange,
    isMultiBlindCubeCountDraftValid,
    multiBlindCubeCount,
    onMultiBlindCubeCountChange,
    parsedMultiBlindCubeCountDraft,
  ]);

  const handleMultiBlindCubeCountDraftChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setMultiBlindCubeCountDraft(event.target.value.replace(/\D/gu, ''));
    },
    [],
  );

  const handleMultiBlindCubeCountKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      commitMultiBlindCubeCount();
    },
    [commitMultiBlindCubeCount],
  );

  useEffect(() => {
    setMultiBlindCubeCountDraft(String(multiBlindCubeCount));
  }, [multiBlindCubeCount]);

  useEffect(() => {
    if (!isMultiBlindScramble) {
      previousFirstCubeScrambleRef.current = undefined;
      setActiveCubeIndex(0);
      return;
    }

    if (previousFirstCubeScrambleRef.current === firstCubeScramble) return;
    previousFirstCubeScrambleRef.current = firstCubeScramble;
    setActiveCubeIndex(0);
  }, [firstCubeScramble, isMultiBlindScramble]);

  useEffect(() => {
    setActiveCubeIndex((currentIndex) =>
      Math.min(currentIndex, Math.max(cubeScrambles.length - 1, 0)),
    );
  }, [cubeScrambles.length]);

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
      if (event.pointerType !== 'touch') return;
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
        {isMultiBlindScramble && !error && !isLoading ? (
          <div className={styles.multiBlindViewer}>
            <div className={styles.multiBlindBody}>
              <span className={styles.scrambleBlock}>
                <ScrambleText scramble={activeScramble} />
              </span>
              <div className={styles.multiBlindToolbar}>
                <div className={styles.cubeStepper} aria-label="三阶多盲打乱">
                  <button
                    className={styles.cubeStepButton}
                    type="button"
                    onClick={selectPreviousCube}
                    disabled={activeCubeIndex === 0}
                    aria-label="上一颗"
                  >
                    <ChevronLeftIcon size={18} />
                  </button>
                  <span
                    className={styles.cubeCounter}
                  >{`${activeCubeIndex + 1} / ${cubeScrambles.length}`}</span>
                  <button
                    className={styles.cubeStepButton}
                    type="button"
                    onClick={selectNextCube}
                    disabled={activeCubeIndex >= cubeScrambles.length - 1}
                    aria-label="下一颗"
                  >
                    <ChevronRightIcon size={18} />
                  </button>
                </div>
                <label className={styles.multiBlindCountField}>
                  <span>{messages.multiBlindCubeCount}</span>
                  <input
                    aria-label={messages.multiBlindCubeCount}
                    className={styles.multiBlindCountInput}
                    inputMode="numeric"
                    max={MAX_MULTI_BLIND_CUBE_COUNT}
                    min={MIN_MULTI_BLIND_CUBE_COUNT}
                    pattern="[0-9]*"
                    type="text"
                    value={multiBlindCubeCountDraft}
                    onBlur={commitMultiBlindCubeCount}
                    onChange={handleMultiBlindCubeCountDraftChange}
                    onKeyDown={handleMultiBlindCubeCountKeyDown}
                  />
                  {hasMultiBlindCubeCountPendingChange && (
                    <button
                      aria-label="确认数量"
                      className={styles.multiBlindCountConfirm}
                      type="button"
                      disabled={!isMultiBlindCubeCountDraftValid}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={commitMultiBlindCubeCount}
                    >
                      <CheckIcon size={16} />
                    </button>
                  )}
                </label>
                {!isReady && (
                  <Tooltip.Root placement="bottom">
                    <Tooltip.Trigger>
                      <Button.Icon
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        className={`${styles.refreshButton} ${styles.toolbarButton}`}
                        icon={<RefreshTimerIcon />}
                        onClick={onRefresh}
                        aria-label={messages.refreshScramble}
                      />
                    </Tooltip.Trigger>
                    <Tooltip.Content>{messages.refreshScramble}</Tooltip.Content>
                  </Tooltip.Root>
                )}
              </div>
              <ScrambleImage eventId={eventId} svg={svg} />
            </div>
          </div>
        ) : (
          <>
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
            {!isLoading && !isReady && (
              <div className={styles.scrambleToolbar}>
                <Tooltip.Root placement="bottom">
                  <Tooltip.Trigger>
                    <Button.Icon
                      variant="ghost"
                      color="neutral"
                      size="sm"
                      className={`${styles.refreshButton} ${styles.toolbarButton}`}
                      icon={<RefreshTimerIcon />}
                      onClick={onRefresh}
                      aria-label={messages.refreshScramble}
                    />
                  </Tooltip.Trigger>
                  <Tooltip.Content>{messages.refreshScramble}</Tooltip.Content>
                </Tooltip.Root>
              </div>
            )}
            {!isLoading && <ScrambleImage eventId={eventId} svg={svg} />}
          </>
        )}
      </div>
      {!isLoading && (
        <div
          className={styles.actionStack}
          data-ready={isReady ? 'true' : undefined}
          data-touch-ready={isReadyOverlayVisible ? 'true' : undefined}
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
          {isReady && (
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
                    icon={<CancelIcon />}
                    onClick={onCancelReady}
                    aria-label={messages.cancelReady}
                  />
                </Tooltip.Trigger>
                <Tooltip.Content>{messages.cancelReady}</Tooltip.Content>
              </Tooltip.Root>
            </span>
          )}
        </div>
      )}
      {isReadyOverlayVisible && (
        <div
          className={styles.touchReadyOverlay}
          data-cancel-target={isTouchCancelVisible || isKeyboardReadyVisible ? 'true' : 'false'}
          aria-hidden="true"
        >
          <div className={styles.touchCancelZone}>
            <span className={styles.touchCancelText}>{overlayCancelText}</span>
          </div>
          <div className={styles.touchReleaseHint}>{overlayStartText}</div>
        </div>
      )}
    </section>
  );
};
