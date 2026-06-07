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

describe('useTimerGesture — desktop keyboard', () => {
  it('Enter keydown when not running marks ready, then keyup calls onStart', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }),
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
    });
    expect(result.current.isReady).toBe(true);
    expect(onStart).not.toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter', bubbles: true }));
    });
    expect(result.current.isReady).toBe(false);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('Enter keydown when running calls onStop', () => {
    const onStop = vi.fn();
    renderHook(() => useTimerGesture(true, { onStart: vi.fn(), onStop, onCancel: vi.fn() }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
    });

    expect(onStop).toHaveBeenCalledOnce();
  });

  it('Enter keydown inside form controls does not start timing', () => {
    const onStart = vi.fn();
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();

    renderHook(() => useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }));

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
    });

    expect(onStart).not.toHaveBeenCalled();
    input.remove();
  });

  it('Space keydown when not running marks ready, then keyup calls onStart', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }),
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    });
    expect(result.current.isReady).toBe(true);
    expect(onStart).not.toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
    });
    expect(result.current.isReady).toBe(false);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('Space keydown when start is disabled does not mark ready', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, {
        isStartEnabled: false,
        onStart,
        onStop: vi.fn(),
        onCancel: vi.fn(),
      }),
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    });
    expect(result.current.isReady).toBe(false);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
    });
    expect(onStart).not.toHaveBeenCalled();
  });

  it('Enter keydown when start is disabled does not mark ready or call onStart', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, {
        isStartEnabled: false,
        onStart,
        onStop: vi.fn(),
        onCancel: vi.fn(),
      }),
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
    });

    expect(result.current.isReady).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
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

  it('Space keydown when running calls onStop', () => {
    const onStop = vi.fn();
    renderHook(() => useTimerGesture(true, { onStart: vi.fn(), onStop, onCancel: vi.fn() }));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
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

  it('cancelReady clears Space ready state so keyup does not start', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }),
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    });
    expect(result.current.isReady).toBe(true);

    act(() => {
      result.current.cancelReady();
    });
    expect(result.current.isReady).toBe(false);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
    });
    expect(onStart).not.toHaveBeenCalled();
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
