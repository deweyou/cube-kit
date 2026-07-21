import type { EventId } from '../events';

export type SolvePenalty = 'none' | '+2' | 'dnf';

export interface MultiBlindSolveResult {
  attemptedCount: number;
  solvedCount: number;
  timePenaltyCount: number;
}

export type FewestMovesValidationReason =
  | 'syntax'
  | 'unsolved'
  | 'over-80-etm'
  | 'inverse-scramble'
  | 'manual'
  | null;

export interface FewestMovesSolveResult {
  rawSolution: string;
  normalizedSolution: string | null;
  moveCount: number | null;
  executionMoveCount: number | null;
  attemptDurationMs: number;
  validationStatus: 'valid' | 'dnf';
  validationReason: FewestMovesValidationReason;
  inverseScrambleReview: 'not-suspected' | 'confirmed' | 'dismissed';
  rulesVersion: 'wca-2026-04-01';
}

export interface SolveRecord {
  id: string;
  sessionId: string;
  eventId: EventId;
  scramble: string | string[];
  elapsedMs: number;
  penalty: SolvePenalty;
  fewestMoves?: FewestMovesSolveResult;
  multiBlind?: MultiBlindSolveResult;
  createdAt: number;
}

export interface SolveSession {
  id: string;
  name: string;
  eventId?: EventId;
  isDefault: boolean;
  createdAt: number;
}

export interface TimerSessionRepository {
  initializeDefaultSessions(now: number): Promise<SolveSession[]>;
  listSessions(): Promise<SolveSession[]>;
  createSession(name: string, now: number, eventId?: EventId): Promise<SolveSession>;
  deleteSession(sessionId: string): Promise<void>;
  listSolves(sessionId: string): Promise<SolveRecord[]>;
  addSolve(record: SolveRecord): Promise<SolveRecord>;
  updateSolveMultiBlind(
    solveId: string,
    multiBlind: MultiBlindSolveResult,
    penalty: Extract<SolvePenalty, 'none' | 'dnf'>,
  ): Promise<SolveRecord>;
  updateSolvePenalty(solveId: string, penalty: SolvePenalty): Promise<SolveRecord>;
  deleteSolve(solveId: string): Promise<void>;
}

export interface SessionTransition {
  eventId: EventId;
  sessionId: string;
  shouldGenerateScramble: boolean;
}
