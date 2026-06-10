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

const generator = createDefaultScrambleGenerator({ random: createMathRandomSource() });

self.addEventListener('message', (event: MessageEvent<GenerateScrambleRequest>) => {
  const { eventId, id, options } = event.data;

  void generator
    .generate(eventId, options)
    .then((result) => {
      self.postMessage({ id, ok: true, result } satisfies GenerateScrambleResponse);
    })
    .catch((cause) => {
      self.postMessage({
        id,
        ok: false,
        error: cause instanceof Error ? cause.message : String(cause),
      } satisfies GenerateScrambleResponse);
    });
});
