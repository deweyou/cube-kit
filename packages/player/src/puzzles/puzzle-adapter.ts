import type { EventId } from '@cubegin/shared/events';

export type PlayerPuzzleType = 'cube' | 'pyraminx' | 'skewb' | 'fto' | 'megaminx';

export interface Vector3Like {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface QuaternionLike {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface PlayerRenderableSticker {
  readonly id: string;
  readonly face: string;
  readonly color: string;
  readonly polygon: readonly Vector3Like[];
}

export interface PlayerRenderablePiece {
  readonly id: string;
  readonly body?: {
    readonly color: string;
    readonly size: number;
    readonly type: 'box';
  };
  readonly position: Vector3Like;
  readonly orientation: QuaternionLike;
  readonly stickers: readonly PlayerRenderableSticker[];
}

export interface PlayerRenderableModel {
  readonly pieces: readonly PlayerRenderablePiece[];
  readonly cameraDistance: number;
}

export interface PlayerMoveAnimation<Move = unknown> {
  readonly move: Move;
  readonly affectedPieceIds: readonly string[];
  readonly axis: Vector3Like;
  readonly pivot: Vector3Like;
  readonly angleRadians: number;
  readonly durationMultiplier?: number;
}

export interface PlayerPuzzleAdapter<Move = unknown, State = unknown> {
  readonly type: PlayerPuzzleType;
  readonly eventIds: readonly EventId[];
  parseFormula(formula: string): readonly Move[];
  createInitialState(): State;
  createRenderableModel(state: State): PlayerRenderableModel;
  describeMove(move: Move, state: State): PlayerMoveAnimation<Move>;
  applyMove(state: State, move: Move): State;
}
