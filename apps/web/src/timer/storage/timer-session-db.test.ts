import { describe, expect, it } from 'vitest';
import { createMemoryTimerSessionRepository } from './memory-timer-session-repository';

describe('timer session repository contract', () => {
  it('creates sessions and lists solves newest first', async () => {
    const repository = createMemoryTimerSessionRepository();
    await repository.initializeDefaultSessions(100);
    const custom = await repository.createSession('练习', 1000);

    await repository.addSolve({
      id: 'old',
      sessionId: custom.id,
      eventId: '333',
      scramble: 'R U',
      elapsedMs: 1100,
      penalty: 'none',
      createdAt: 10,
    });
    await repository.addSolve({
      id: 'new',
      sessionId: custom.id,
      eventId: '222',
      scramble: 'R U R',
      elapsedMs: 900,
      penalty: '+2',
      createdAt: 20,
    });

    expect((await repository.listSolves(custom.id)).map((solve) => solve.id)).toEqual([
      'new',
      'old',
    ]);
  });

  it('updates penalties and deletes solves', async () => {
    const repository = createMemoryTimerSessionRepository();
    const custom = await repository.createSession('练习', 1000);
    await repository.addSolve({
      id: 'solve',
      sessionId: custom.id,
      eventId: '333',
      scramble: 'R U',
      elapsedMs: 1100,
      penalty: 'none',
      createdAt: 10,
    });

    expect((await repository.updateSolvePenalty('solve', 'dnf')).penalty).toBe('dnf');
    await repository.deleteSolve('solve');
    expect(await repository.listSolves(custom.id)).toEqual([]);
  });
});
