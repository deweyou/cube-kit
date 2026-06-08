import type { WcaEventId } from '../wca';

export type SolvePenalty = 'none' | '+2' | 'dnf';

export interface SolveRecord {
  id: string;
  sessionId: string;
  eventId: WcaEventId;
  scramble: string;
  elapsedMs: number;
  penalty: SolvePenalty;
  createdAt: number;
}

export interface SolveSession {
  id: string;
  name: string;
  eventId?: WcaEventId;
  isDefault: boolean;
  createdAt: number;
}

export interface TimerSessionRepository {
  initializeDefaultSessions(now: number): Promise<SolveSession[]>;
  listSessions(): Promise<SolveSession[]>;
  createSession(name: string, now: number, eventId?: WcaEventId): Promise<SolveSession>;
  deleteSession(sessionId: string): Promise<void>;
  listSolves(sessionId: string): Promise<SolveRecord[]>;
  addSolve(record: SolveRecord): Promise<SolveRecord>;
  updateSolvePenalty(solveId: string, penalty: SolvePenalty): Promise<SolveRecord>;
  deleteSolve(solveId: string): Promise<void>;
}

export interface SessionTransition {
  eventId: WcaEventId;
  sessionId: string;
  shouldGenerateScramble: boolean;
}
