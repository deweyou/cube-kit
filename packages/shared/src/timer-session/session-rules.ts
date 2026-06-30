import type { EventId } from '../events';
import { getEventLabel } from './event-labels';
import type { SessionTransition, SolveRecord, SolveSession } from './types';

export const getDefaultSessionId = (eventId: EventId): string => `default:${eventId}`;

export const createDefaultSession = (eventId: EventId, createdAt: number): SolveSession => ({
  id: getDefaultSessionId(eventId),
  name: getEventLabel(eventId),
  eventId,
  isDefault: true,
  createdAt,
});

export const canDeleteSession = (session: SolveSession): boolean => !session.isDefault;

export const sortSessionsByCreatedDesc = (sessions: SolveSession[]): SolveSession[] =>
  [...sessions].sort((a, b) => b.createdAt - a.createdAt || a.name.localeCompare(b.name));

export const sortSolvesByCreatedDesc = (solves: SolveRecord[]): SolveRecord[] =>
  [...solves].sort((a, b) => b.createdAt - a.createdAt);

export const resolveEventChange = (eventId: EventId): SessionTransition => ({
  eventId,
  sessionId: getDefaultSessionId(eventId),
  shouldGenerateScramble: true,
});

export const resolveSessionChange = (
  session: SolveSession,
  sessionSolves: SolveRecord[],
  currentEventId: EventId,
): SessionTransition => {
  const newestSolve = sortSolvesByCreatedDesc(sessionSolves)[0];
  const nextEventId = newestSolve?.eventId ?? session.eventId ?? currentEventId;

  return {
    eventId: nextEventId,
    sessionId: session.id,
    shouldGenerateScramble: nextEventId !== currentEventId,
  };
};
