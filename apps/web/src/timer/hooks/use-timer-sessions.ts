import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WcaEventId } from '@cubegin/shared/wca';
import {
  canDeleteSession,
  getDefaultSessionId,
  resolveEventChange,
  resolveSessionChange,
  type SessionTransition,
  type SolvePenalty,
  type SolveRecord,
  type SolveSession,
  type TimerSessionRepository,
} from '@cubegin/shared/timer-session';
import { createClientId } from '../storage/client-id';

interface SaveSolveInput {
  eventId: WcaEventId;
  scramble: SolveRecord['scramble'];
  elapsedMs: number;
  multiBlind?: SolveRecord['multiBlind'];
  penalty: SolvePenalty;
}

interface UseTimerSessionsOptions {
  repository: TimerSessionRepository;
  now?: () => number;
  createId?: (createdAt: number) => string;
}

const defaultNow = () => Date.now();
const defaultCreateId = () => createClientId();

export const useTimerSessions = ({
  repository,
  now = defaultNow,
  createId = defaultCreateId,
}: UseTimerSessionsOptions) => {
  const [sessions, setSessions] = useState<SolveSession[]>([]);
  const [solves, setSolves] = useState<SolveRecord[]>([]);
  const [eventId, setEventId] = useState<WcaEventId>('333');
  const [activeSessionId, setActiveSessionId] = useState(getDefaultSessionId('333'));
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>();

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions],
  );

  const refreshSessions = useCallback(async () => {
    setSessions(await repository.listSessions());
  }, [repository]);

  const refreshSolves = useCallback(
    async (sessionId = activeSessionId) => {
      setSolves(await repository.listSolves(sessionId));
    },
    [activeSessionId, repository],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const initialized = await repository.initializeDefaultSessions(now());
        if (cancelled) return;
        const initialSessionId = getDefaultSessionId('333');
        setSessions(initialized);
        setActiveSessionId(initialSessionId);
        setSolves(await repository.listSolves(initialSessionId));
        setIsReady(true);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [now, repository]);

  const selectEvent = useCallback(
    async (nextEventId: WcaEventId): Promise<SessionTransition> => {
      const transition = resolveEventChange(nextEventId);
      setEventId(transition.eventId);
      setActiveSessionId(transition.sessionId);
      await refreshSessions();
      await refreshSolves(transition.sessionId);
      return transition;
    },
    [refreshSessions, refreshSolves],
  );

  const selectSession = useCallback(
    async (sessionId: string): Promise<SessionTransition | undefined> => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) return undefined;

      const sessionSolves = await repository.listSolves(sessionId);
      const transition = resolveSessionChange(session, sessionSolves, eventId);
      setActiveSessionId(sessionId);
      setSolves(sessionSolves);
      setEventId(transition.eventId);
      return transition;
    },
    [eventId, repository, sessions],
  );

  const createSession = useCallback(
    async (name: string) => {
      const session = await repository.createSession(name, now(), eventId);
      await refreshSessions();
      setActiveSessionId(session.id);
      setSolves([]);
      return session;
    },
    [eventId, now, refreshSessions, repository],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (!session || !canDeleteSession(session)) return;

      await repository.deleteSession(sessionId);
      await refreshSessions();
      const fallbackSessionId = getDefaultSessionId(eventId);
      setActiveSessionId(fallbackSessionId);
      setSolves(await repository.listSolves(fallbackSessionId));
    },
    [eventId, refreshSessions, repository, sessions],
  );

  const saveSolve = useCallback(
    async (input: SaveSolveInput) => {
      const createdAt = now();
      const record = await repository.addSolve({
        id: createId(createdAt),
        sessionId: activeSessionId,
        createdAt,
        ...input,
      });
      await refreshSolves(activeSessionId);
      return record;
    },
    [activeSessionId, createId, now, refreshSolves, repository],
  );

  const updateSolvePenalty = useCallback(
    async (solveId: string, penalty: SolvePenalty) => {
      const updated = await repository.updateSolvePenalty(solveId, penalty);
      await refreshSolves(activeSessionId);
      return updated;
    },
    [activeSessionId, refreshSolves, repository],
  );

  const deleteSolve = useCallback(
    async (solveId: string) => {
      await repository.deleteSolve(solveId);
      await refreshSolves(activeSessionId);
    },
    [activeSessionId, refreshSolves, repository],
  );

  return {
    activeSession,
    activeSessionId,
    canDeleteActiveSession: activeSession ? canDeleteSession(activeSession) : false,
    createSession,
    deleteSession,
    deleteSolve,
    error,
    eventId,
    isReady,
    saveSolve,
    selectEvent,
    selectSession,
    sessions,
    solves,
    updateSolvePenalty,
  };
};
