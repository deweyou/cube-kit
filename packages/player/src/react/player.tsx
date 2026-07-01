import { useEffect, useRef, useState } from 'react';
import type { EventId } from '@cubegin/scramble-puzzle';
import {
  createPlayerController,
  type PlayerController,
  type PlayerControllerState,
  type PlayerControllerView,
  type PlayerInitialPosition,
} from '../core/player-controller.js';
import {
  getTimelinePosition,
  getTimelineProgressForCompletedStepCount,
} from '../core/timeline.js';
import { createThreePlayerView } from '../three/three-player-view.js';

export type CubeginPlayerViewFactory = (container: HTMLElement) => PlayerControllerView;

export interface CubeginPlayerProps {
  readonly eventId: EventId;
  readonly formula: string;
  readonly className?: string;
  readonly initialPosition?: PlayerInitialPosition;
  readonly viewFactory?: CubeginPlayerViewFactory;
  readonly onStateChange?: (state: PlayerControllerState) => void;
}

const PLAYBACK_RATE_OPTIONS = [0.5, 1, 1.5, 2, 3] as const;

export const CubeginPlayer = ({
  eventId,
  formula,
  className,
  initialPosition = 'start',
  viewFactory = createThreePlayerView,
  onStateChange,
}: CubeginPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<PlayerController | undefined>(undefined);
  const [state, setState] = useState<PlayerControllerState>();
  const timeline = state?.timeline;
  const hasTimeline = timeline !== undefined;
  const progressStepCount = timeline?.steps.length ?? 0;
  const completedStepCount =
    timeline === undefined
      ? 0
      : getTimelinePosition(timeline, state?.progress ?? 0).completedStepCount;

  const syncState = (nextState: PlayerControllerState) => {
    setState(nextState);
    onStateChange?.(nextState);
  };

  const runControllerAction = (action: (controller: PlayerController) => void) => {
    const controller = controllerRef.current;
    if (controller === undefined) return;

    action(controller);
    syncState(controller.getState());
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const view = viewFactory(container);
    const controller = createPlayerController(view, {
      eventId,
      formula,
      initialPosition,
      onStateChange: syncState,
    });

    controllerRef.current = controller;
    syncState(controller.getState());

    return () => {
      controllerRef.current = undefined;
      controller.dispose();
    };
  }, [eventId, formula, initialPosition, onStateChange, viewFactory]);

  return (
    <div
      className={className ? `cubegin-player ${className}` : 'cubegin-player'}
      data-status={state?.status ?? 'mounting'}
    >
      <div
        className="cubegin-player__viewport"
        data-testid="cubegin-player-viewport"
        ref={containerRef}
      />

      <div className="cubegin-player__controls" role="group" aria-label="Player controls">
        <button
          disabled={!hasTimeline}
          type="button"
          onClick={() => runControllerAction((controller) => controller.play())}
        >
          Play
        </button>
        <button
          disabled={!hasTimeline}
          type="button"
          onClick={() => runControllerAction((controller) => controller.pause())}
        >
          Pause
        </button>
        <button
          disabled={!hasTimeline}
          type="button"
          onClick={() => runControllerAction((controller) => controller.reset())}
        >
          Reset
        </button>
        <button
          disabled={!hasTimeline}
          type="button"
          onClick={() => runControllerAction((controller) => controller.jumpToEnd())}
        >
          End
        </button>
        <label className="cubegin-player__speed">
          <span>Speed</span>
          <select
            aria-label="Playback speed"
            disabled={!hasTimeline}
            value={String(state?.playbackRate ?? 1)}
            onChange={(event) =>
              runControllerAction((controller) =>
                controller.setPlaybackRate(Number(event.currentTarget.value)),
              )
            }
          >
            {PLAYBACK_RATE_OPTIONS.map((playbackRate) => (
              <option key={playbackRate} value={playbackRate}>
                {playbackRate}x
              </option>
            ))}
          </select>
        </label>
        <input
          aria-label="Player progress"
          disabled={!hasTimeline}
          max={progressStepCount}
          min={0}
          step={1}
          type="range"
          value={completedStepCount}
          onChange={(event) =>
            runControllerAction((controller) => {
              if (timeline === undefined) return;

              controller.seek(
                getTimelineProgressForCompletedStepCount(
                  timeline,
                  Number(event.currentTarget.value),
                ),
              );
            })
          }
        />
      </div>

      {state?.error ? (
        <p className="cubegin-player__error" role="alert">
          {state.error.message}
        </p>
      ) : null}
    </div>
  );
};
