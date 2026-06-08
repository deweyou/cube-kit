import { describe, it, expect } from 'vitest';
import { createTimer } from './timer';

describe('createTimer', () => {
  it('initial state is idle', () => {
    const timer = createTimer();
    expect(timer.getState().status).toBe('idle');
  });

  it('start() transitions idle → running', () => {
    const timer = createTimer();
    timer.start();
    expect(timer.getState().status).toBe('running');
  });

  it('stop() transitions running → stopped and returns elapsed ms > 0', async () => {
    const timer = createTimer();
    timer.start();
    await new Promise((r) => setTimeout(r, 10));
    const elapsed = timer.stop();
    expect(timer.getState().status).toBe('stopped');
    expect(elapsed).toBeGreaterThan(0);
  });

  it('reset() from idle stays idle', () => {
    const timer = createTimer();
    timer.reset();
    expect(timer.getState().status).toBe('idle');
  });

  it('reset() from running returns to idle', () => {
    const timer = createTimer();
    timer.start();
    timer.reset();
    expect(timer.getState().status).toBe('idle');
  });

  it('reset() from stopped returns to idle', () => {
    const timer = createTimer();
    timer.start();
    timer.stop();
    timer.reset();
    expect(timer.getState().status).toBe('idle');
  });

  it('stop() when idle is a no-op and returns 0', () => {
    const timer = createTimer();
    expect(() => timer.stop()).not.toThrow();
    expect(timer.stop()).toBe(0);
  });

  it('start() when already running is a no-op (startTime unchanged)', async () => {
    const timer = createTimer();
    timer.start();
    const state1 = timer.getState();
    await new Promise((r) => setTimeout(r, 5));
    timer.start();
    const state2 = timer.getState();
    expect(state1).toEqual(state2);
  });
});
