import { describe, expect, it } from 'vitest';
import {
  canDeleteSession,
  createDefaultSession,
  getDefaultSessionId,
  resolveEventChange,
  resolveSessionChange,
  sortSessionsByCreatedDesc,
} from './session-rules';
import type { SolveRecord, SolveSession } from './types';

const customSession: SolveSession = {
  id: 'custom-1',
  name: '练习',
  isDefault: false,
  createdAt: 30,
};

describe('session rules', () => {
  it('creates deterministic default sessions for events', () => {
    const session = createDefaultSession('333', 100);
    expect(session).toEqual({
      id: 'default:333',
      name: '三阶速拧',
      eventId: '333',
      isDefault: true,
      createdAt: 100,
    });
    expect(getDefaultSessionId('222')).toBe('default:222');
  });

  it('protects default sessions and allows custom sessions to be deleted', () => {
    expect(canDeleteSession(createDefaultSession('333', 100))).toBe(false);
    expect(canDeleteSession(customSession)).toBe(true);
  });

  it('sorts sessions by creation time descending', () => {
    const oldDefault = createDefaultSession('333', 10);
    expect(sortSessionsByCreatedDesc([oldDefault, customSession])).toEqual([
      customSession,
      oldDefault,
    ]);
  });

  it('switches event changes to the matching default session', () => {
    expect(resolveEventChange('222')).toEqual({
      eventId: '222',
      sessionId: 'default:222',
      shouldGenerateScramble: true,
    });
  });

  it('keeps event unchanged for an empty custom session', () => {
    expect(resolveSessionChange(customSession, [], '333')).toEqual({
      eventId: '333',
      sessionId: 'custom-1',
      shouldGenerateScramble: false,
    });
  });

  it('uses default session event when the selected default session is empty', () => {
    expect(resolveSessionChange(createDefaultSession('444', 10), [], '333')).toEqual({
      eventId: '444',
      sessionId: 'default:444',
      shouldGenerateScramble: true,
    });
  });

  it('uses the newest solve event when a session has solves', () => {
    const solves: SolveRecord[] = [
      {
        id: 'old',
        sessionId: 'custom-1',
        eventId: '222',
        scramble: 'R U',
        elapsedMs: 1000,
        penalty: 'none',
        createdAt: 10,
      },
      {
        id: 'new',
        sessionId: 'custom-1',
        eventId: '555',
        scramble: 'R U F',
        elapsedMs: 2000,
        penalty: '+2',
        createdAt: 20,
      },
    ];

    expect(resolveSessionChange(customSession, solves, '333')).toEqual({
      eventId: '555',
      sessionId: 'custom-1',
      shouldGenerateScramble: true,
    });
  });
});
