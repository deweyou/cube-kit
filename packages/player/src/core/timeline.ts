import type { PlayerMoveAnimation, PlayerRenderableModel } from '../puzzles/puzzle-adapter.js';

const BASE_QUARTER_TURN_DURATION_MS = 520;

export interface PlayerTimelineInput<Move = unknown> {
  readonly move: Move;
  readonly animation?: PlayerMoveAnimation<Move>;
  readonly durationMultiplier?: number;
}

export interface PlayerTimelineStep<Move = unknown> {
  readonly move: Move;
  readonly index: number;
  readonly animation: PlayerMoveAnimation<Move> | undefined;
  readonly quarterTurns: number;
  readonly durationMs: number;
}

export interface PlayerTimeline<Move = unknown> {
  readonly steps: readonly PlayerTimelineStep<Move>[];
  readonly totalDurationMs: number;
  readonly modelsByCompletedStepCount?: readonly PlayerRenderableModel[];
}

export interface PlayerTimelinePosition {
  readonly completedStepCount: number;
  readonly activeStepIndex: number | undefined;
  readonly activeStepProgress: number;
}

const isTimelineInput = <Move>(value: Move | PlayerTimelineInput<Move>): value is PlayerTimelineInput<Move> =>
  typeof value === 'object' &&
  value !== null &&
  'move' in value &&
  ('animation' in value || 'durationMultiplier' in value);

const quarterTurnsForMove = (move: unknown): number => {
  if (
    typeof move === 'object' &&
    move !== null &&
    'amount' in move &&
    typeof move.amount === 'number' &&
    Number.isFinite(move.amount)
  ) {
    return move.amount;
  }

  return 1;
};

export const createPlayerTimeline = <Move>(
  moves: readonly (Move | PlayerTimelineInput<Move>)[],
  options: { readonly modelsByCompletedStepCount?: readonly PlayerRenderableModel[] } = {},
): PlayerTimeline<Move> => {
  const steps = moves.map((input, index): PlayerTimelineStep<Move> => {
    const timelineInput = isTimelineInput(input) ? input : { move: input };
    const quarterTurns = quarterTurnsForMove(timelineInput.move);
    const durationMultiplier =
      timelineInput.durationMultiplier ??
      timelineInput.animation?.durationMultiplier ??
      (quarterTurns === 2 ? 1.45 : 1);

    return {
      animation: timelineInput.animation,
      move: timelineInput.move,
      index,
      quarterTurns,
      durationMs: BASE_QUARTER_TURN_DURATION_MS * durationMultiplier,
    };
  });

  return {
    modelsByCompletedStepCount: options.modelsByCompletedStepCount,
    steps,
    totalDurationMs: steps.reduce((duration, step) => duration + step.durationMs, 0),
  };
};

export const getTimelinePosition = (
  timeline: PlayerTimeline,
  progress: number,
): PlayerTimelinePosition => {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  if (timeline.steps.length === 0 || clampedProgress === 1) {
    return {
      completedStepCount: timeline.steps.length,
      activeStepIndex: undefined,
      activeStepProgress: 1,
    };
  }

  const targetMs = timeline.totalDurationMs * clampedProgress;
  let elapsedMs = 0;

  for (const step of timeline.steps) {
    const nextElapsedMs = elapsedMs + step.durationMs;

    if (targetMs <= nextElapsedMs) {
      return {
        completedStepCount: step.index,
        activeStepIndex: step.index,
        activeStepProgress: step.durationMs === 0 ? 1 : (targetMs - elapsedMs) / step.durationMs,
      };
    }

    elapsedMs = nextElapsedMs;
  }

  return {
    completedStepCount: timeline.steps.length,
    activeStepIndex: undefined,
    activeStepProgress: 1,
  };
};

export const getTimelineProgressForCompletedStepCount = (
  timeline: PlayerTimeline,
  completedStepCount: number,
): number => {
  if (timeline.steps.length === 0 || timeline.totalDurationMs === 0) return 1;

  const clampedStepCount = Math.min(
    Math.max(Math.round(completedStepCount), 0),
    timeline.steps.length,
  );
  const completedDurationMs = timeline.steps
    .slice(0, clampedStepCount)
    .reduce((duration, step) => duration + step.durationMs, 0);

  return completedDurationMs / timeline.totalDurationMs;
};

export const getTimelineProgressForStepPosition = (
  timeline: PlayerTimeline,
  stepPosition: number,
): number => {
  if (timeline.steps.length === 0 || timeline.totalDurationMs === 0) return 1;

  const clampedStepPosition = Math.min(Math.max(stepPosition, 0), timeline.steps.length);
  const completedStepCount = Math.floor(clampedStepPosition);
  const activeStepProgress = clampedStepPosition - completedStepCount;
  const completedDurationMs = timeline.steps
    .slice(0, completedStepCount)
    .reduce((duration, step) => duration + step.durationMs, 0);
  const activeStepDurationMs = timeline.steps[completedStepCount]?.durationMs ?? 0;

  return (
    (completedDurationMs + activeStepDurationMs * activeStepProgress) /
    timeline.totalDurationMs
  );
};
