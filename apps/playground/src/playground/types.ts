import type { EventId } from '@cubegin/shared/events';
import type { CaseSelectionOptions, ScrambleTypeId } from '@cubegin/scramble-core';
import type {
  PuzzleAssistEventId,
  PuzzleAssistMethod,
  PuzzleAssistResult,
  PuzzleFullEventId,
  PuzzleFullResult,
} from '@cubegin/solver';
import type { ScrambleImageView } from '@cubegin/scramble-image';

export type PlaygroundImageView = ScrambleImageView;

export interface PlaygroundScramble {
  readonly id: string;
  readonly eventId: EventId;
  readonly scrambleTypeId: ScrambleTypeId;
  readonly scramble: string;
  readonly caseId?: string;
}

export interface PlaygroundGenerationDiagnostics {
  readonly durationMs: number;
  readonly count: number;
}

export interface PlaygroundRenderDiagnostics {
  readonly durationMs: number;
  readonly scrambleLength: number;
  readonly svgBytes: number;
}

export interface PlaygroundGenerateInput {
  readonly scrambleTypeId: ScrambleTypeId;
  readonly count: number;
  readonly multiBlindCubeCount: number;
  readonly imageView: PlaygroundImageView;
  readonly enabledCaseIds?: readonly string[];
  readonly mode?: CaseSelectionOptions['mode'];
}

export interface PlaygroundManualRenderInput {
  readonly eventId: EventId;
  readonly scramble: string;
  readonly imageView: PlaygroundImageView;
}

export interface PlaygroundGenerateResult {
  readonly scrambles: readonly PlaygroundScramble[];
  readonly selectedScramble: PlaygroundScramble | undefined;
  readonly svg: string;
  readonly generation: PlaygroundGenerationDiagnostics;
  readonly render: PlaygroundRenderDiagnostics;
}

export interface PlaygroundManualRenderResult {
  readonly svg: string;
  readonly render: PlaygroundRenderDiagnostics;
  readonly error: string | undefined;
}

export interface PlaygroundSolverDiagnostics {
  readonly durationMs: number;
  readonly resultCount: number;
}

export interface PlaygroundSolverInput {
  readonly eventId: PuzzleAssistEventId;
  readonly scramble: string;
  readonly methods: readonly PuzzleAssistMethod[];
  readonly targets?: readonly string[];
}

export interface PlaygroundSolverResult {
  readonly results: readonly PuzzleAssistResult[];
  readonly diagnostics: PlaygroundSolverDiagnostics;
  readonly error: string | undefined;
}

export interface PlaygroundFullSolverInput {
  readonly eventId: PuzzleFullEventId;
  readonly scramble: string;
}

export interface PlaygroundFullSolverResult {
  readonly result: PuzzleFullResult | undefined;
  readonly diagnostics: PlaygroundSolverDiagnostics;
  readonly error: string | undefined;
}

export interface PlaygroundSolverComparisonInput {
  readonly eventId: PuzzleFullEventId;
  readonly scramble: string;
  readonly setupRotation?: string;
  readonly solution: string;
  readonly imageView: PlaygroundImageView;
}

export interface PlaygroundSolverComparison {
  readonly scrambleSvg: string;
  readonly solutionSvg: string;
  readonly solutionFormula: string;
  readonly error: string | undefined;
}

export interface PlaygroundSolverScrambleResult {
  readonly eventId: PuzzleAssistEventId | PuzzleFullEventId;
  readonly scramble: string;
  readonly error: string | undefined;
}

export interface PlaygroundPlayerScrambleResult {
  readonly eventId: EventId;
  readonly scramble: string;
  readonly svg: string;
  readonly render: PlaygroundRenderDiagnostics;
  readonly error: string | undefined;
}
