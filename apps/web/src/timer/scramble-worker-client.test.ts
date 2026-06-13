import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTimerScrambleGenerator } from './scramble-worker-client';

class MockWorker {
  static instances: MockWorker[] = [];

  readonly messages: unknown[] = [];
  readonly terminate = vi.fn();
  private readonly listeners = new Map<
    string,
    Set<(event: { data?: unknown; message?: string }) => void>
  >();

  constructor() {
    MockWorker.instances.push(this);
  }

  addEventListener(type: string, listener: (event: { data?: unknown; message?: string }) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  emitMessage(data: unknown) {
    for (const listener of this.listeners.get('message') ?? []) {
      listener({ data });
    }
  }
}

describe('createTimerScrambleGenerator', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    MockWorker.instances = [];
  });

  it('reuses one browser worker across scramble requests', async () => {
    vi.stubGlobal('Worker', MockWorker);
    const generator = createTimerScrambleGenerator();

    const first = generator.generate('333');
    expect(MockWorker.instances).toHaveLength(1);
    MockWorker.instances[0].emitMessage({
      id: 1,
      ok: true,
      result: { eventId: '333', scramble: 'R U' },
    });
    await expect(first).resolves.toEqual({ eventId: '333', scramble: 'R U' });

    const second = generator.generate('222');
    expect(MockWorker.instances).toHaveLength(1);
    MockWorker.instances[0].emitMessage({
      id: 2,
      ok: true,
      result: { eventId: '222', scramble: "R U R'" },
    });
    await expect(second).resolves.toEqual({ eventId: '222', scramble: "R U R'" });

    generator.dispose?.();
    expect(MockWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });
});
