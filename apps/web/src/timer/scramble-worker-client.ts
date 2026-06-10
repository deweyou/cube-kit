import { createDefaultScrambleGenerator, createMathRandomSource } from '@cubegin/scramble-core';
import type { GenerateOptions, ScrambleResult } from '@cubegin/scramble-core';
import type { WcaEventId } from '@cubegin/shared/wca';

interface GenerateScrambleRequest {
  id: number;
  eventId: WcaEventId;
  options?: GenerateOptions;
}

type GenerateScrambleResponse =
  | {
      id: number;
      ok: true;
      result: ScrambleResult;
    }
  | {
      id: number;
      ok: false;
      error: string;
    };

export interface TimerScrambleGenerator {
  generate(eventId: WcaEventId, options?: GenerateOptions): Promise<ScrambleResult>;
}

const createWorkerScrambleGenerator = (): TimerScrambleGenerator => {
  let nextRequestId = 0;

  return {
    generate(eventId, options) {
      const requestId = ++nextRequestId;
      const worker = new Worker(new URL('./scramble-worker.ts', import.meta.url), {
        type: 'module',
      });

      return new Promise<ScrambleResult>((resolve, reject) => {
        const finish = () => worker.terminate();

        worker.addEventListener('message', (event: MessageEvent<GenerateScrambleResponse>) => {
          const response = event.data;
          if (response.id !== requestId) return;

          finish();
          if (response.ok === true) {
            resolve(response.result);
          } else {
            reject(new Error(response.error));
          }
        });

        worker.addEventListener('error', (event) => {
          finish();
          reject(event.error instanceof Error ? event.error : new Error(event.message));
        });

        worker.postMessage({
          eventId,
          id: requestId,
          options,
        } satisfies GenerateScrambleRequest);
      });
    },
  };
};

export const createTimerScrambleGenerator = (): TimerScrambleGenerator => {
  if (typeof Worker === 'undefined') {
    return createDefaultScrambleGenerator({ random: createMathRandomSource() });
  }

  return createWorkerScrambleGenerator();
};
