import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getDefaultSessionId } from '@cubegin/timer-session';
import { createMemoryTimerSessionRepository } from '../storage/memory-timer-session-repository';
import { useTimerSessions } from './use-timer-sessions';

describe('useTimerSessions', () => {
  it('initializes default sessions and starts on 333', async () => {
    const repository = createMemoryTimerSessionRepository();
    const { result } = renderHook(() => useTimerSessions({ repository }));

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.eventId).toBe('333');
    expect(result.current.activeSessionId).toBe(getDefaultSessionId('333'));
    expect(
      result.current.sessions.some((session) => session.id === getDefaultSessionId('222')),
    ).toBe(true);
  });

  it('switches event changes to default sessions', async () => {
    const repository = createMemoryTimerSessionRepository();
    const { result } = renderHook(() => useTimerSessions({ repository }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => result.current.selectEvent('222'));

    expect(result.current.eventId).toBe('222');
    expect(result.current.activeSessionId).toBe(getDefaultSessionId('222'));
  });

  it('keeps an empty custom session on the current event', async () => {
    const repository = createMemoryTimerSessionRepository();
    const { result } = renderHook(() => useTimerSessions({ repository }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => result.current.createSession('练习'));
    const custom = result.current.sessions.find((session) => session.name === '练习');

    await act(async () => result.current.selectSession(custom!.id));

    expect(result.current.eventId).toBe('333');
    expect(result.current.activeSessionId).toBe(custom!.id);
  });

  it('saves solves and switches custom sessions by newest solve event', async () => {
    const repository = createMemoryTimerSessionRepository();
    const { result } = renderHook(() => useTimerSessions({ repository }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () => result.current.createSession('练习'));
    const custom = result.current.sessions.find((session) => session.name === '练习')!;
    await act(async () => result.current.selectSession(custom.id));
    await act(async () =>
      result.current.saveSolve({
        eventId: '555',
        scramble: 'R U F',
        elapsedMs: 1234,
        penalty: '+2',
      }),
    );
    await act(async () => result.current.selectEvent('333'));
    await act(async () => result.current.selectSession(custom.id));

    expect(result.current.eventId).toBe('555');
    expect(result.current.solves[0]?.penalty).toBe('+2');
  });

  it('updates penalties and deletes solves', async () => {
    const repository = createMemoryTimerSessionRepository();
    const { result } = renderHook(() => useTimerSessions({ repository }));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    await act(async () =>
      result.current.saveSolve({
        eventId: '333',
        scramble: 'R U',
        elapsedMs: 1000,
        penalty: 'none',
      }),
    );
    const solveId = result.current.solves[0]!.id;

    await act(async () => result.current.updateSolvePenalty(solveId, 'dnf'));
    expect(result.current.solves[0]?.penalty).toBe('dnf');

    await act(async () => result.current.deleteSolve(solveId));
    expect(result.current.solves).toEqual([]);
  });
});
