import type { PuzzleAssistEventId, PuzzleAssistMethod, PuzzleAssistResult } from '@cubegin/solver';
import { getPuzzleAssistEventId, type SolverAssistEventId } from './solver-assist-config';

interface SolverAssistWorkerRequest {
  readonly eventId: PuzzleAssistEventId;
  readonly id: number;
  readonly method: PuzzleAssistMethod;
  readonly scramble: string;
}

type SolverAssistWorkerResponse =
  | {
      readonly error: string;
      readonly id: number;
      readonly ok: false;
    }
  | {
      readonly id: number;
      readonly ok: true;
      readonly result: PuzzleAssistResult;
    };

export interface SolverAssistService {
  dispose?(): void;
  solve(
    eventId: SolverAssistEventId,
    method: PuzzleAssistMethod,
    scramble: string,
  ): Promise<PuzzleAssistResult>;
}

const createWorkerSolverAssistService = (): SolverAssistService => {
  let nextRequestId = 0;
  let worker: Worker | undefined;
  const pendingRequests = new Map<
    number,
    {
      reject: (error: Error) => void;
      resolve: (result: PuzzleAssistResult) => void;
    }
  >();

  const clearWorker = (error?: Error) => {
    worker?.terminate();
    worker = undefined;

    if (error) {
      for (const request of pendingRequests.values()) request.reject(error);
    }
    pendingRequests.clear();
  };

  const ensureWorker = () => {
    if (worker) return worker;

    const nextWorker = new Worker(new URL('./solver-assist-worker.ts', import.meta.url), {
      type: 'module',
    });
    nextWorker.addEventListener('message', (event: MessageEvent<SolverAssistWorkerResponse>) => {
      const response = event.data;
      const request = pendingRequests.get(response.id);
      if (!request) return;

      pendingRequests.delete(response.id);
      if (response.ok === true) {
        request.resolve(response.result);
      } else {
        request.reject(new Error(response.error));
      }
    });
    nextWorker.addEventListener('error', (event) => {
      clearWorker(event.error instanceof Error ? event.error : new Error(event.message));
    });
    worker = nextWorker;
    return nextWorker;
  };

  return {
    dispose() {
      clearWorker(new Error('@cubegin/web: solver assist worker was disposed'));
    },
    solve(eventId, method, scramble) {
      const requestId = ++nextRequestId;
      const activeWorker = ensureWorker();

      return new Promise<PuzzleAssistResult>((resolve, reject) => {
        pendingRequests.set(requestId, { reject, resolve });
        activeWorker.postMessage({
          eventId: getPuzzleAssistEventId(eventId),
          id: requestId,
          method,
          scramble,
        } satisfies SolverAssistWorkerRequest);
      });
    },
  };
};

const createMainThreadSolverAssistService = (): SolverAssistService => ({
  async solve(eventId, method, scramble) {
    const { solvePuzzleAssist } = await import('@cubegin/solver');
    const result = solvePuzzleAssist(getPuzzleAssistEventId(eventId), [method], scramble)[0];
    if (result === undefined) throw new Error(`No result returned for ${method}`);
    return result;
  },
});

export const createSolverAssistService = (): SolverAssistService =>
  typeof Worker === 'undefined'
    ? createMainThreadSolverAssistService()
    : createWorkerSolverAssistService();
