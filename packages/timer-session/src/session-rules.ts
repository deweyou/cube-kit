import type { WcaEventId } from '@cubegin/scramble-puzzle';
import { getWcaEventLabel } from './event-labels';
import type { SessionTransition, SolveRecord, SolveSession } from './types';

export const getDefaultSessionId = (eventId: WcaEventId): string => `default:${eventId}`;

export const createDefaultSession = (eventId: WcaEventId, createdAt: number): SolveSession => ({
  id: getDefaultSessionId(eventId),
  name: getWcaEventLabel(eventId),
  eventId,
  isDefault: true,
  createdAt,
});

export const canDeleteSession = (session: SolveSession): boolean => !session.isDefault;

export const sortSessionsByCreatedDesc = (sessions: SolveSession[]): SolveSession[] =>
  [...sessions].sort((a, b) => b.createdAt - a.createdAt || a.name.localeCompare(b.name));

export const sortSolvesByCreatedDesc = (solves: SolveRecord[]): SolveRecord[] =>
  [...solves].sort((a, b) => b.createdAt - a.createdAt);

export const resolveEventChange = (eventId: WcaEventId): SessionTransition => ({
  eventId,
  sessionId: getDefaultSessionId(eventId),
  shouldGenerateScramble: true,
});

export const resolveSessionChange = (
  session: SolveSession,
  sessionSolves: SolveRecord[],
  currentEventId: WcaEventId,
): SessionTransition => {
  const newestSolve = sortSolvesByCreatedDesc(sessionSolves)[0];
  const nextEventId = newestSolve?.eventId ?? session.eventId ?? currentEventId;

  return {
    eventId: nextEventId,
    sessionId: session.id,
    shouldGenerateScramble: nextEventId !== currentEventId,
  };
};
