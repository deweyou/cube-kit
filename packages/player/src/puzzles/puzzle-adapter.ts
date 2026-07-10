import type { EventId } from '@cubegin/shared/events';

export type PlayerPuzzleType =
  | 'cube'
  | 'clock'
  | 'pyraminx'
  | 'skewb'
  | 'fto'
  | 'megaminx'
  | 'square1';

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
  readonly renderSide?: 'double' | 'front';
}

export type PlayerRenderableBody =
  | {
      readonly color: string;
      readonly size: number;
      readonly type: 'box';
    }
  | {
      readonly color: string;
      readonly depth: number;
      readonly radius: number;
      readonly type: 'cylinder';
    };

export interface PlayerRenderablePiece {
  readonly id: string;
  readonly body?: PlayerRenderableBody;
  readonly position: Vector3Like;
  readonly orientation: QuaternionLike;
  readonly stickers: readonly PlayerRenderableSticker[];
}

export interface PlayerCameraOrbit {
  readonly pitch: number;
  readonly yaw: number;
}

export interface PlayerRenderableModel {
  readonly pieces: readonly PlayerRenderablePiece[];
  readonly cameraDistance: number;
  readonly cameraOrbit?: PlayerCameraOrbit;
}

export interface PlayerMoveAnimation<Move = unknown> {
  readonly move: Move;
  readonly affectedPieceIds: readonly string[];
  readonly axis: Vector3Like;
  readonly pivot: Vector3Like;
  readonly pivotByPieceId?: Readonly<Record<string, Vector3Like>>;
  readonly rotationAffectedPieceIds?: readonly string[];
  readonly angleRadians: number;
  readonly angleRadiansByPieceId?: Readonly<Record<string, number>>;
  readonly colorPulseByPieceId?: Readonly<Record<string, string>>;
  readonly colorPulseByStickerId?: Readonly<Record<string, string>>;
  readonly durationMultiplier?: number;
  readonly positionPulseByPieceId?: Readonly<Record<string, Vector3Like>>;
  readonly targetPoseBlendStart?: number;
  readonly targetOrientationByPieceId?: Readonly<Record<string, QuaternionLike>>;
  readonly targetPositionByPieceId?: Readonly<Record<string, Vector3Like>>;
  readonly rotateInPlace?: boolean;
}

export type PlayerTransformOperation =
  | PlayerAxisRotationOperation
  | PlayerColorPulseOperation
  | PlayerPositionPulseOperation;

export interface PlayerAxisRotationOperation {
  readonly type: 'axis-rotation';
  readonly affectedPieceIds: readonly string[];
  readonly axis: Vector3Like;
  readonly pivot: Vector3Like;
  readonly pivotByPieceId?: Readonly<Record<string, Vector3Like>>;
  readonly rotationAffectedPieceIds?: readonly string[];
  readonly angleRadians: number;
  readonly angleRadiansByPieceId?: Readonly<Record<string, number>>;
  readonly targetPoseBlendStart?: number;
  readonly targetOrientationByPieceId?: Readonly<Record<string, QuaternionLike>>;
  readonly targetPositionByPieceId?: Readonly<Record<string, Vector3Like>>;
  readonly rotateInPlace?: boolean;
}

export interface PlayerColorPulseOperation {
  readonly type: 'color-pulse';
  readonly colorPulseByPieceId?: Readonly<Record<string, string>>;
  readonly colorPulseByStickerId?: Readonly<Record<string, string>>;
}

export interface PlayerPositionPulseOperation {
  readonly type: 'position-pulse';
  readonly positionPulseByPieceId: Readonly<Record<string, Vector3Like>>;
}

export interface PlayerMoveTransform<Move = unknown> {
  readonly move: Move;
  readonly durationMultiplier?: number;
  readonly operations: readonly PlayerTransformOperation[];
}

export interface PlayerPuzzleAdapter<Move = unknown, State = unknown> {
  readonly type: PlayerPuzzleType;
  readonly eventIds: readonly EventId[];
  readonly shouldRebuildModelAfterEachMove?: boolean;
  parseFormula(formula: string): readonly Move[];
  createInitialState(): State;
  createRenderableModel(state: State): PlayerRenderableModel;
  describeTransform?(move: Move, state: State): PlayerMoveTransform<Move>;
  commitTransform?(state: State, transform: PlayerMoveTransform<Move>): State;
  describeMove(move: Move, state: State): PlayerMoveAnimation<Move>;
  applyMove(state: State, move: Move): State;
}
