import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTimerGesture } from './use-timer-gesture';

// jsdom does not implement Touch — provide a minimal polyfill
if (typeof Touch === 'undefined') {
  // @ts-expect-error — polyfill for jsdom
  globalThis.Touch = class Touch {
    identifier: number;
    target: EventTarget;
    clientX: number;
    clientY: number;
    constructor(init: {
      identifier: number;
      target: EventTarget;
      clientX?: number;
      clientY?: number;
    }) {
      this.identifier = init.identifier;
      this.target = init.target;
      this.clientX = init.clientX ?? 0;
      this.clientY = init.clientY ?? 0;
    }
  };
}

describe('useTimerGesture — desktop (Space key)', () => {
  it('Space keydown when not running calls onStart', () => {
    const onStart = vi.fn();
    renderHook(() => useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    });
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('Space keydown with repeat=true does NOT call onStart', () => {
    const onStart = vi.fn();
    renderHook(() => useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }));
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Space', repeat: true, bubbles: true }),
      );
    });
    expect(onStart).not.toHaveBeenCalled();
  });

  it('Space keyup when running calls onStop', () => {
    const onStop = vi.fn();
    renderHook(() => useTimerGesture(true, { onStart: vi.fn(), onStop, onCancel: vi.fn() }));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
    });
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('Space keyup when NOT running does NOT call onStop', () => {
    const onStop = vi.fn();
    renderHook(() => useTimerGesture(false, { onStart: vi.fn(), onStop, onCancel: vi.fn() }));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
    });
    expect(onStop).not.toHaveBeenCalled();
  });
});

describe('useTimerGesture — H5 touch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const makeTouch = (clientY: number) =>
    new Touch({ identifier: 1, target: document.body, clientY, clientX: 100 });

  it('touchstart held 300ms calls onStart', () => {
    const onStart = vi.fn();
    renderHook(() => useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }));
    act(() => {
      document.dispatchEvent(
        new TouchEvent('touchstart', { touches: [makeTouch(400)], bubbles: true }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('touchend before 300ms does NOT call onStart', () => {
    const onStart = vi.fn();
    renderHook(() => useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }));
    act(() => {
      document.dispatchEvent(
        new TouchEvent('touchstart', { touches: [makeTouch(400)], bubbles: true }),
      );
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      document.dispatchEvent(
        new TouchEvent('touchend', { changedTouches: [makeTouch(400)], bubbles: true }),
      );
    });
    expect(onStart).not.toHaveBeenCalled();
  });

  it('touchend in cancel zone (Y < 80) when running calls onCancel', () => {
    const onCancel = vi.fn();
    renderHook(() => useTimerGesture(true, { onStart: vi.fn(), onStop: vi.fn(), onCancel }));
    act(() => {
      document.dispatchEvent(
        new TouchEvent('touchend', { changedTouches: [makeTouch(40)], bubbles: true }),
      );
    });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('touchend outside cancel zone (Y >= 80) when running calls onStop', () => {
    const onStop = vi.fn();
    renderHook(() => useTimerGesture(true, { onStart: vi.fn(), onStop, onCancel: vi.fn() }));
    act(() => {
      document.dispatchEvent(
        new TouchEvent('touchend', { changedTouches: [makeTouch(400)], bubbles: true }),
      );
    });
    expect(onStop).toHaveBeenCalledOnce();
  });
});
