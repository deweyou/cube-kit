import type { PuzzleAssistResult } from '@cubegin/solver';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSolverAssistService } from './solver-assist-worker-client';

const RESULT: PuzzleAssistResult = {
  method: 'cross',
  scramble: 'R U',
  solutions: [],
};

class MockWorker {
  static instances: MockWorker[] = [];

  readonly messages: unknown[] = [];
  readonly listeners = new Map<string, (event: MessageEvent) => void>();
  readonly terminate = vi.fn();

  constructor(
    readonly url: URL,
    readonly options: WorkerOptions,
  ) {
    MockWorker.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.set(type, listener as (event: MessageEvent) => void);
  }

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  respond(data: unknown) {
    this.listeners.get('message')?.({ data } as MessageEvent);
  }
}

afterEach(() => {
  MockWorker.instances = [];
  vi.unstubAllGlobals();
});

describe('solver assist worker client', () => {
  it('creates the worker lazily and maps 3x3 FMC to the shared solver event', async () => {
    vi.stubGlobal('Worker', MockWorker);
    const service = createSolverAssistService();

    expect(MockWorker.instances).toHaveLength(0);

    const resultPromise = service.solve('333fm', 'cross', 'R U');
    const worker = MockWorker.instances[0];
    expect(worker).toBeDefined();
    expect(worker?.options).toEqual({ type: 'module' });
    expect(worker?.messages).toEqual([{ eventId: '333', id: 1, method: 'cross', scramble: 'R U' }]);

    worker?.respond({ id: 1, ok: true, result: RESULT });
    await expect(resultPromise).resolves.toEqual(RESULT);

    service.dispose?.();
    expect(worker?.terminate).toHaveBeenCalledOnce();
  });

  it('rejects a failed worker response', async () => {
    vi.stubGlobal('Worker', MockWorker);
    const service = createSolverAssistService();

    const resultPromise = service.solve('222', '222-face', 'R U');
    MockWorker.instances[0]?.respond({ error: 'no solution', id: 1, ok: false });

    await expect(resultPromise).rejects.toThrow('no solution');
  });
});
