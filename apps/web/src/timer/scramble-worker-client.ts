import { createDefaultScrambleGenerator, createMathRandomSource } from '@cubegin/scramble-core';
import type { GenerateOptions, ScrambleResult } from '@cubegin/scramble-core';
import type { EventId } from '@cubegin/shared/events';
import {
  getScrambleElapsedMs,
  getScramblePerformanceNow,
  logScramblePerformance,
} from './scramble-performance-log';

interface GenerateScrambleRequest {
  id: number;
  eventId: EventId;
  options?: GenerateOptions;
}

type GenerateScrambleResponse =
  | {
      type?: 'generate';
      id: number;
      ok: true;
      result: ScrambleResult;
      workerDurationMs?: number;
    }
  | {
      type?: 'generate';
      id: number;
      ok: false;
      error: string;
      workerDurationMs?: number;
    };

interface WorkerReadyMessage {
  type: 'ready';
}

type ScrambleWorkerMessage = GenerateScrambleResponse | WorkerReadyMessage;

export interface TimerScrambleGenerator {
  dispose?(): void;
  generate(eventId: EventId, options?: GenerateOptions): Promise<ScrambleResult>;
  preload?(): Promise<void>;
}

const createWorkerScrambleGenerator = (): TimerScrambleGenerator => {
  let nextRequestId = 0;
  let worker: Worker | undefined;
  let readyPromise: Promise<void> | undefined;
  let resolveReady: (() => void) | undefined;
  const pendingRequests = new Map<
    number,
    {
      reject: (error: Error) => void;
      eventId: EventId;
      resolve: (result: ScrambleResult) => void;
      startMs: number;
    }
  >();

  const clearWorker = (error?: Error) => {
    if (worker) {
      worker.terminate();
      worker = undefined;
    }

    if (error) {
      for (const request of pendingRequests.values()) {
        request.reject(error);
      }
    }
    pendingRequests.clear();
    readyPromise = undefined;
    resolveReady = undefined;
  };

  const ensureWorker = () => {
    if (worker) return { ready: readyPromise ?? Promise.resolve(), worker };

    const createStartMs = getScramblePerformanceNow();
    const nextWorker = new Worker(new URL('./scramble-worker.ts', import.meta.url), {
      type: 'module',
    });
    logScramblePerformance('worker:create', {});
    readyPromise = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    nextWorker.addEventListener('message', (event: MessageEvent<ScrambleWorkerMessage>) => {
      const response = event.data;
      if (response.type === 'ready') {
        logScramblePerformance('worker:ready', {
          startupMs: getScrambleElapsedMs(createStartMs),
        });
        resolveReady?.();
        resolveReady = undefined;
        return;
      }

      const request = pendingRequests.get(response.id);
      if (!request) return;

      pendingRequests.delete(response.id);
      const details = {
        eventId: request.eventId,
        id: response.id,
        pendingCount: pendingRequests.size,
        roundtripMs: getScrambleElapsedMs(request.startMs),
        workerDurationMs: response.workerDurationMs,
      };
      if (response.ok === true) {
        logScramblePerformance('worker:response', details);
        request.resolve(response.result);
      } else {
        logScramblePerformance('worker:error-response', { ...details, error: response.error });
        request.reject(new Error(response.error));
      }
    });

    nextWorker.addEventListener('error', (event) => {
      clearWorker(event.error instanceof Error ? event.error : new Error(event.message));
    });

    worker = nextWorker;
    return { ready: readyPromise, worker: nextWorker };
  };

  return {
    dispose() {
      clearWorker(new Error('@cubegin/web: scramble worker was disposed'));
    },
    generate(eventId, options) {
      const requestId = ++nextRequestId;
      const activeWorker = ensureWorker().worker;

      return new Promise<ScrambleResult>((resolve, reject) => {
        pendingRequests.set(requestId, {
          eventId,
          reject,
          resolve,
          startMs: getScramblePerformanceNow(),
        });
        logScramblePerformance('worker:request', {
          eventId,
          id: requestId,
          options,
          pendingCount: pendingRequests.size,
        });
        activeWorker.postMessage({
          eventId,
          id: requestId,
          options,
        } satisfies GenerateScrambleRequest);
      });
    },
    preload() {
      return ensureWorker().ready;
    },
  };
};

export const createTimerScrambleGenerator = (): TimerScrambleGenerator => {
  if (typeof Worker === 'undefined') {
    const generator = createDefaultScrambleGenerator({ random: createMathRandomSource() });
    return {
      dispose() {},
      generate: (eventId, options) => generator.generate(eventId, options),
      preload: () => Promise.resolve(),
    };
  }

  return createWorkerScrambleGenerator();
};
