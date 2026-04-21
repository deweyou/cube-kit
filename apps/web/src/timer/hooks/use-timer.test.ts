import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTimer } from './use-timer';

describe('useTimer', () => {
  it('initial state is idle with elapsed=0', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.state.status).toBe('idle');
    expect(result.current.elapsed).toBe(0);
  });

  it('start() transitions to running', () => {
    const { result } = renderHook(() => useTimer());
    act(() => {
      result.current.start();
    });
    expect(result.current.state.status).toBe('running');
  });

  it('stop() after start returns elapsed > 0 and state is stopped', async () => {
    const { result } = renderHook(() => useTimer());
    act(() => {
      result.current.start();
    });
    await new Promise((r) => setTimeout(r, 10));
    let returned = 0;
    act(() => {
      returned = result.current.stop();
    });
    expect(result.current.state.status).toBe('stopped');
    expect(returned).toBeGreaterThan(0);
    expect(result.current.elapsed).toBeGreaterThan(0);
  });

  it('reset() returns state to idle and elapsed to 0', () => {
    const { result } = renderHook(() => useTimer());
    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.stop();
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.state.status).toBe('idle');
    expect(result.current.elapsed).toBe(0);
  });
});
