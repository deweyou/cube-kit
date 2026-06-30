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
      type: 'generate';
      id: number;
      ok: true;
      result: ScrambleResult;
      workerDurationMs: number;
    }
  | {
      type: 'generate';
      id: number;
      ok: false;
      error: string;
      workerDurationMs: number;
    };

const generator = createDefaultScrambleGenerator({ random: createMathRandomSource() });

self.addEventListener('message', (event: MessageEvent<GenerateScrambleRequest>) => {
  const { eventId, id, options } = event.data;
  const startMs = getScramblePerformanceNow();
  logScramblePerformance('worker:generate-start', { eventId, id, options });

  generator
    .generate(eventId, options)
    .then((result) => {
      const workerDurationMs = getScrambleElapsedMs(startMs);
      logScramblePerformance('worker:generate-success', { eventId, id, workerDurationMs });
      self.postMessage({
        id,
        ok: true,
        result,
        type: 'generate',
        workerDurationMs,
      } satisfies GenerateScrambleResponse);
    })
    .catch((cause) => {
      const workerDurationMs = getScrambleElapsedMs(startMs);
      const error = cause instanceof Error ? cause.message : String(cause);
      logScramblePerformance('worker:generate-error', { error, eventId, id, workerDurationMs });
      self.postMessage({
        error,
        id,
        ok: false,
        type: 'generate',
        workerDurationMs,
      } satisfies GenerateScrambleResponse);
    });
});

self.postMessage({ type: 'ready' });
