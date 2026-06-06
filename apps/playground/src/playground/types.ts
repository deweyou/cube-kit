import type { WcaEventId } from '@cubegin/scramble-puzzle';
import type { PuzzleAssistEventId, PuzzleAssistMethod, PuzzleAssistResult } from '@cubegin/solver';
import type { ScrambleImageView } from '@cubegin/scramble-image';

export type PlaygroundImageView = ScrambleImageView;

export interface PlaygroundScramble {
  readonly id: string;
  readonly eventId: WcaEventId;
  readonly scramble: string;
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
  readonly eventId: WcaEventId;
  readonly count: number;
  readonly multiBlindCubeCount: number;
  readonly imageView: PlaygroundImageView;
}

export interface PlaygroundManualRenderInput {
  readonly eventId: WcaEventId;
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

export interface PlaygroundSolverScrambleResult {
  readonly eventId: PuzzleAssistEventId;
  readonly scramble: string;
  readonly error: string | undefined;
}
