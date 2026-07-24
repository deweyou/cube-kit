import {
  solvePuzzleAssist,
  type PuzzleAssistEventId,
  type PuzzleAssistMethod,
} from '@cubegin/solver';

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
      readonly result: ReturnType<typeof solvePuzzleAssist>[number];
    };

self.addEventListener('message', (event: MessageEvent<SolverAssistWorkerRequest>) => {
  const { eventId, id, method, scramble } = event.data;

  try {
    const result = solvePuzzleAssist(eventId, [method], scramble)[0];
    if (result === undefined) throw new Error(`No result returned for ${method}`);

    self.postMessage({ id, ok: true, result } satisfies SolverAssistWorkerResponse);
  } catch (cause) {
    self.postMessage({
      error: cause instanceof Error ? cause.message : String(cause),
      id,
      ok: false,
    } satisfies SolverAssistWorkerResponse);
  }
});
