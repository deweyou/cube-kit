import { WCA_EVENT_IDS } from '@cubegin/scramble-puzzle';
import {
  createDefaultSession,
  sortSessionsByCreatedDesc,
  sortSolvesByCreatedDesc,
  type SolvePenalty,
  type SolveRecord,
  type SolveSession,
  type TimerSessionRepository,
} from '@cubegin/timer-session';

export const createMemoryTimerSessionRepository = (): TimerSessionRepository => {
  const sessions = new Map<string, SolveSession>();
  const solves = new Map<string, SolveRecord>();

  return {
    async initializeDefaultSessions(now) {
      WCA_EVENT_IDS.forEach((eventId, index) => {
        const session = createDefaultSession(eventId, now + index);
        if (!sessions.has(session.id)) sessions.set(session.id, session);
      });
      return sortSessionsByCreatedDesc([...sessions.values()]);
    },
    async listSessions() {
      return sortSessionsByCreatedDesc([...sessions.values()]);
    },
    async createSession(name, now) {
      const session: SolveSession = {
        id: crypto.randomUUID(),
        name,
        isDefault: false,
        createdAt: now,
      };
      sessions.set(session.id, session);
      return session;
    },
    async deleteSession(sessionId) {
      sessions.delete(sessionId);
      [...solves.values()].forEach((solve) => {
        if (solve.sessionId === sessionId) solves.delete(solve.id);
      });
    },
    async listSolves(sessionId) {
      return sortSolvesByCreatedDesc(
        [...solves.values()].filter((solve) => solve.sessionId === sessionId),
      );
    },
    async addSolve(record) {
      solves.set(record.id, record);
      return record;
    },
    async updateSolvePenalty(solveId, penalty: SolvePenalty) {
      const solve = solves.get(solveId);
      if (!solve) throw new Error(`Solve not found: ${solveId}`);
      const updated = { ...solve, penalty };
      solves.set(solveId, updated);
      return updated;
    },
    async deleteSolve(solveId) {
      solves.delete(solveId);
    },
  };
};
