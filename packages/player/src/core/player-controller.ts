import type { EventId } from '@cubegin/shared/events';
import {
  InvalidPlayerFormulaError,
  UnsupportedPlayerPuzzleError,
  type CubeginPlayerError,
} from './errors.js';
import { getPlayerPuzzleSupport, type PlayerPuzzleSupport } from '../events/event-map.js';
import { createPlayerTimeline, type PlayerTimeline } from './timeline.js';
import type { PlayerRenderableModel } from '../puzzles/puzzle-adapter.js';
import { getPlayerPuzzleAdapter } from '../puzzles/puzzle-registry.js';

export type PlayerInitialPosition = 'start' | 'end';
export type PlayerControllerStatus = 'ready' | 'playing' | 'paused' | 'error';

export interface PlayerControllerPlayOptions {
  readonly playbackRate: number;
  readonly onProgress: (progress: number) => void;
}

export interface PlayerControllerView {
  renderModel(model: PlayerRenderableModel): void;
  setTimeline(timeline: PlayerTimeline): void;
  play(options: PlayerControllerPlayOptions): void;
  pause(): void;
  seek(progress: number): void;
  resetCameraOrbit(): void;
  dispose(): void;
}

export interface CreatePlayerControllerOptions {
  readonly eventId: EventId;
  readonly formula: string;
  readonly initialPosition?: PlayerInitialPosition;
  readonly onStateChange?: (state: PlayerControllerState) => void;
}

export interface LoadPlayerFormulaOptions {
  readonly eventId?: EventId;
  readonly formula?: string;
}

export interface PlayerControllerState {
  readonly status: PlayerControllerStatus;
  readonly eventId: EventId;
  readonly formula: string;
  readonly progress: number;
  readonly playbackRate: number;
  readonly puzzle: PlayerPuzzleSupport | undefined;
  readonly timeline: PlayerTimeline | undefined;
  readonly error: CubeginPlayerError | undefined;
}

export interface PlayerController {
  getState(): PlayerControllerState;
  loadFormula(options: LoadPlayerFormulaOptions): boolean;
  play(): boolean;
  pause(): boolean;
  seek(progress: number): boolean;
  resetView(): boolean;
  reset(): boolean;
  jumpToEnd(): boolean;
  setPlaybackRate(playbackRate: number): boolean;
  dispose(): void;
}

const clampProgress = (progress: number): number => Math.min(Math.max(progress, 0), 1);

const clampPlaybackRate = (playbackRate: number): number => {
  if (!Number.isFinite(playbackRate)) return 1;

  return Math.min(Math.max(playbackRate, 0.25), 4);
};

const initialProgressForPosition = (position: PlayerInitialPosition | undefined): number =>
  position === 'end' ? 1 : 0;

export const createPlayerController = (
  view: PlayerControllerView,
  options: CreatePlayerControllerOptions,
): PlayerController => {
  let state: PlayerControllerState = {
    status: 'ready',
    eventId: options.eventId,
    formula: options.formula,
    progress: 0,
    playbackRate: 1,
    puzzle: undefined,
    timeline: undefined,
    error: undefined,
  };

  const setState = (nextState: PlayerControllerState): void => {
    state = nextState;
    options.onStateChange?.(state);
  };

  const setError = (error: CubeginPlayerError): boolean => {
    setState({
      ...state,
      status: 'error',
      error,
    });

    return false;
  };

  const handlePlaybackProgress = (progress: number): void => {
    const nextProgress = clampProgress(progress);

    setState({
      ...state,
      status: nextProgress >= 1 ? 'paused' : 'playing',
      progress: nextProgress,
      error: undefined,
    });
  };

  const loadFormula = (
    loadOptions: LoadPlayerFormulaOptions,
    initialPosition?: PlayerInitialPosition,
  ): boolean => {
    const nextEventId = loadOptions.eventId ?? state.eventId;
    const nextFormula = loadOptions.formula ?? state.formula;
    const puzzle = getPlayerPuzzleSupport(nextEventId);
    const adapter = getPlayerPuzzleAdapter(nextEventId);

    if (puzzle.type === 'unsupported' || adapter === undefined) {
      return setError(new UnsupportedPlayerPuzzleError(nextEventId));
    }

    let timeline: PlayerTimeline;
    let model: PlayerRenderableModel;

    try {
      const initialAdapterState = adapter.createInitialState();
      let nextAdapterState = initialAdapterState;
      const moves = adapter.parseFormula(nextFormula);
      model = adapter.createRenderableModel(initialAdapterState);
      const modelsByCompletedStepCount = adapter.shouldRebuildModelAfterEachMove
        ? [model]
        : undefined;
      const timelineInputs = moves.map((move) => {
        const animation = adapter.describeMove(move, nextAdapterState);

        nextAdapterState = adapter.applyMove(nextAdapterState, move);
        modelsByCompletedStepCount?.push(adapter.createRenderableModel(nextAdapterState));

        return {
          animation,
          durationMultiplier: animation.durationMultiplier,
          move,
        };
      });

      timeline = createPlayerTimeline(timelineInputs, { modelsByCompletedStepCount });
    } catch (cause) {
      return setError(new InvalidPlayerFormulaError(nextFormula, cause));
    }

    const progress = initialProgressForPosition(initialPosition);

    view.renderModel(model);
    view.setTimeline(timeline);
    view.seek(progress);

    setState({
      status: 'ready',
      eventId: nextEventId,
      formula: nextFormula,
      progress,
      playbackRate: state.playbackRate,
      puzzle,
      timeline,
      error: undefined,
    });

    return true;
  };

  loadFormula({ eventId: options.eventId, formula: options.formula }, options.initialPosition);

  return {
    getState: () => state,
    loadFormula: (loadOptions) => loadFormula(loadOptions),
    play: () => {
      if (state.timeline === undefined) return false;

      view.play({
        playbackRate: state.playbackRate,
        onProgress: handlePlaybackProgress,
      });
      setState({ ...state, status: 'playing', error: undefined });

      return true;
    },
    pause: () => {
      if (state.timeline === undefined) return false;

      view.pause();
      setState({ ...state, status: 'paused', error: undefined });

      return true;
    },
    seek: (progress) => {
      if (state.timeline === undefined) return false;

      const nextProgress = clampProgress(progress);

      view.seek(nextProgress);
      setState({ ...state, progress: nextProgress, error: undefined });

      return true;
    },
    resetView: () => {
      if (state.timeline === undefined) return false;

      view.resetCameraOrbit();
      setState({ ...state, error: undefined });

      return true;
    },
    reset: () => {
      return (
        state.timeline !== undefined &&
        loadFormula({ eventId: state.eventId, formula: state.formula })
      );
    },
    jumpToEnd: () => {
      if (state.timeline === undefined) return false;

      const progress = 1;

      view.seek(progress);
      setState({ ...state, progress, error: undefined });

      return true;
    },
    setPlaybackRate: (playbackRate) => {
      if (state.timeline === undefined) return false;

      const nextPlaybackRate = clampPlaybackRate(playbackRate);

      setState({ ...state, playbackRate: nextPlaybackRate, error: undefined });
      if (state.status === 'playing') {
        view.play({
          playbackRate: nextPlaybackRate,
          onProgress: handlePlaybackProgress,
        });
      }

      return true;
    },
    dispose: () => {
      view.dispose();
    },
  };
};
