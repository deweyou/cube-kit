import type { WcaEventId } from '@cubekit/scramble-puzzle';
import { generateUniqueScrambleBatch } from './batch.js';
import type { RandomSource } from './random-source.js';

const ERROR_PREFIX = '@cubekit/scramble-core';

export interface GenerateOptions {
  random?: RandomSource;
  multiBlindCubeCount?: number;
}

export interface ScrambleResult {
  eventId: WcaEventId;
  scramble: string;
}

export type EventScrambleGenerator = (options: GenerateOptions & { random: RandomSource }) => ScrambleResult;

export interface ScrambleGeneratorOptions {
  random: RandomSource;
  generators: Partial<Record<WcaEventId, EventScrambleGenerator>>;
}

export interface ScrambleGenerator {
  generate(eventId: WcaEventId, options?: GenerateOptions): Promise<ScrambleResult>;
  generateBatch(eventId: WcaEventId, count: number, options?: GenerateOptions): Promise<readonly ScrambleResult[]>;
}

export const createScrambleGenerator = ({ random, generators }: ScrambleGeneratorOptions): ScrambleGenerator => {
  const api: ScrambleGenerator = {
    async generate(eventId, options = {}) {
      const generator = generators[eventId];
      if (!generator) throw new Error(`${ERROR_PREFIX}: event '${eventId}' has no generator`);
      return generator({ ...options, random: options.random ?? random });
    },
    async generateBatch(eventId, count, options = {}) {
      return generateUniqueScrambleBatch(count, () => api.generate(eventId, options));
    },
  };

  return api;
};
