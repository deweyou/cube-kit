import type { GenerateOptions, ScrambleResult } from '@cubegin/scramble-core';
import { WCA_EVENT_IDS, type WcaEventId } from '@cubegin/shared/wca';
import {
  getScrambleElapsedMs,
  getScramblePerformanceNow,
  logScramblePerformance,
} from './scramble-performance-log';
import type { TimerScrambleGenerator } from './scramble-worker-client';

const DEFAULT_MULTI_BLIND_CUBE_COUNT = 3;
const PREFETCH_QUEUE_LIMIT = 1;

const getMultiBlindCubeCount = (eventId: WcaEventId): number | undefined =>
  eventId === '333mbld' ? DEFAULT_MULTI_BLIND_CUBE_COUNT : undefined;

export const getTimerScrambleGenerateOptions = (eventId: WcaEventId): GenerateOptions => ({
  multiBlindCubeCount: getMultiBlindCubeCount(eventId),
});

const getPrefetchKey = (eventId: WcaEventId, options: GenerateOptions = {}) => {
  if (eventId !== '333mbld') return eventId;
  return `${eventId}:${options.multiBlindCubeCount ?? DEFAULT_MULTI_BLIND_CUBE_COUNT}`;
};

export interface TimerScramblePrefetcher {
  consume(eventId: WcaEventId, options?: GenerateOptions): Promise<ScrambleResult>;
  dispose(): void;
  hasReady(eventId: WcaEventId, options?: GenerateOptions): boolean;
  prefetch(eventId: WcaEventId, options?: GenerateOptions): Promise<void>;
  prefetchWarmEvents(activeEventId: WcaEventId): Promise<void>;
}

export const createTimerScramblePrefetcher = (
  generator: TimerScrambleGenerator,
  options: {
    backgroundGenerator?: TimerScrambleGenerator;
    shouldKeepWarmResult?: (eventId: WcaEventId) => boolean;
  } = {},
): TimerScramblePrefetcher => {
  const queues = new Map<string, ScrambleResult[]>();
  const inFlight = new Map<string, Promise<void>>();

  const getQueue = (key: string) => {
    const existing = queues.get(key);
    if (existing) return existing;

    const queue: ScrambleResult[] = [];
    queues.set(key, queue);
    return queue;
  };

  const prefetchWithGenerator = (
    eventId: WcaEventId,
    prefetchGenerator: TimerScrambleGenerator,
    reason: 'active' | 'warm',
    generateOptions = getTimerScrambleGenerateOptions(eventId),
  ) => {
    const key = getPrefetchKey(eventId, generateOptions);
    const queue = getQueue(key);
    if (queue.length >= PREFETCH_QUEUE_LIMIT) {
      logScramblePerformance('prefetch:skip-ready', { eventId, queueLength: queue.length, reason });
      return Promise.resolve();
    }

    const pending = inFlight.get(key);
    if (pending) {
      logScramblePerformance('prefetch:join-inflight', { eventId, reason });
      return pending;
    }

    const startMs = getScramblePerformanceNow();
    logScramblePerformance('prefetch:start', { eventId, reason });
    const request = prefetchGenerator
      .generate(eventId, generateOptions)
      .then((result) => {
        const latestQueue = getQueue(key);
        if (reason === 'warm' && options.shouldKeepWarmResult?.(eventId) === false) {
          logScramblePerformance('prefetch:drop-active-warm', {
            eventId,
            totalMs: getScrambleElapsedMs(startMs),
          });
          return;
        }

        if (latestQueue.length < PREFETCH_QUEUE_LIMIT) {
          latestQueue.push(result);
          logScramblePerformance('prefetch:ready', {
            eventId,
            queueLength: latestQueue.length,
            reason,
            totalMs: getScrambleElapsedMs(startMs),
          });
        } else {
          logScramblePerformance('prefetch:drop-full', {
            eventId,
            queueLength: latestQueue.length,
            reason,
            totalMs: getScrambleElapsedMs(startMs),
          });
        }
      })
      .catch((cause) => {
        logScramblePerformance('prefetch:error', {
          error: cause instanceof Error ? cause.message : String(cause),
          eventId,
          reason,
          totalMs: getScrambleElapsedMs(startMs),
        });
        // Background prefetch should never surface as a user-visible error.
      })
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, request);
    return request;
  };

  const prefetch = (eventId: WcaEventId, options = getTimerScrambleGenerateOptions(eventId)) =>
    prefetchWithGenerator(eventId, generator, 'active', options);

  const consume = async (
    eventId: WcaEventId,
    options = getTimerScrambleGenerateOptions(eventId),
  ) => {
    const key = getPrefetchKey(eventId, options);
    const queue = getQueue(key);
    const ready = queue.shift();
    if (ready) {
      logScramblePerformance('consume:ready-hit', { eventId, queueLength: queue.length });
      return ready;
    }

    const pending = inFlight.get(key);
    if (pending) {
      const waitStartMs = getScramblePerformanceNow();
      logScramblePerformance('consume:wait-inflight', { eventId });
      await pending;
      const prefetched = queue.shift();
      if (prefetched) {
        logScramblePerformance('consume:inflight-hit', {
          eventId,
          waitMs: getScrambleElapsedMs(waitStartMs),
        });
        return prefetched;
      }
    }

    const directStartMs = getScramblePerformanceNow();
    logScramblePerformance('consume:direct-start', { eventId });
    const generated = await generator.generate(eventId, options);
    logScramblePerformance('consume:direct-success', {
      eventId,
      totalMs: getScrambleElapsedMs(directStartMs),
    });
    return generated;
  };

  const getWarmEventIds = (activeEventId: WcaEventId) =>
    WCA_EVENT_IDS.filter((eventId) => eventId !== activeEventId);

  const prefetchWarmEvents = (activeEventId: WcaEventId) => {
    const backgroundGenerator = options.backgroundGenerator;
    if (!backgroundGenerator) return Promise.resolve();

    const eventIds = getWarmEventIds(activeEventId);

    return Promise.all(
      eventIds.map((eventId) => prefetchWithGenerator(eventId, backgroundGenerator, 'warm')),
    ).then(() => {
      backgroundGenerator.dispose?.();
      logScramblePerformance('prefetch:warm-complete', {
        eventCount: eventIds.length,
      });
    });
  };

  return {
    consume,
    dispose: () => {},
    hasReady: (eventId, options = getTimerScrambleGenerateOptions(eventId)) =>
      getQueue(getPrefetchKey(eventId, options)).length > 0,
    prefetch,
    prefetchWarmEvents,
  };
};
