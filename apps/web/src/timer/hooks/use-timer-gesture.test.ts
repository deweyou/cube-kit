import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useTimerGesture } from './use-timer-gesture';

afterEach(() => {
  cleanup();
});

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
  it('Enter keydown when not running does not mark ready or start', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }),
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
    });
    expect(result.current.isReady).toBe(false);
    expect(result.current.readyTrigger).toBeUndefined();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('Escape cancels keyboard ready so Space keyup does not start', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }),
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    });
    expect(result.current.isReady).toBe(true);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    });
    expect(result.current.isReady).toBe(false);
    expect(result.current.readyTrigger).toBeUndefined();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
    });
    expect(onStart).not.toHaveBeenCalled();
  });

  it('Enter keyup does not start a Space ready state', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }),
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter', bubbles: true }));
    });

    expect(result.current.isReady).toBe(true);
    expect(onStart).not.toHaveBeenCalled();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
    });
    expect(result.current.isReady).toBe(false);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('Enter keydown when running does not call onStop', () => {
    const onStop = vi.fn();
    renderHook(() => useTimerGesture(true, { onStart: vi.fn(), onStop, onCancel: vi.fn() }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true }));
    });

    expect(onStop).not.toHaveBeenCalled();
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

  it('Space keydown inside interactive controls does not start timing or prevent default', () => {
    const onStart = vi.fn();
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();

    renderHook(() => useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }));

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'Space',
    });
    act(() => {
      button.dispatchEvent(event);
    });

    expect(onStart).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    button.remove();
  });

  it('Space keydown inside an open listbox does not start timing or prevent default', () => {
    const onStart = vi.fn();
    const listbox = document.createElement('div');
    listbox.setAttribute('role', 'listbox');
    listbox.tabIndex = -1;
    document.body.append(listbox);
    listbox.focus();

    renderHook(() => useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }));

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'Space',
    });
    act(() => {
      listbox.dispatchEvent(event);
    });

    expect(onStart).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    listbox.remove();
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
    expect(result.current.readyTrigger).toEqual({ keyLabel: 'Space', type: 'keyboard' });
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

  it('Space keydown when start is disabled does not prevent default', () => {
    renderHook(() =>
      useTimerGesture(false, {
        isStartEnabled: false,
        onStart: vi.fn(),
        onStop: vi.fn(),
        onCancel: vi.fn(),
      }),
    );

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'Space',
    });
    act(() => {
      document.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(false);
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
  const makeTouch = (clientY: number) =>
    new Touch({ identifier: 1, target: document.body, clientY, clientX: 100 });

  it('global touchstart does not mark ready or start timing', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }),
    );
    act(() => {
      document.dispatchEvent(
        new TouchEvent('touchstart', { touches: [makeTouch(400)], bubbles: true }),
      );
    });
    expect(result.current.isReady).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('explicit prepareStart marks ready and startReady starts on release', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }),
    );

    act(() => {
      result.current.prepareStart();
    });
    expect(result.current.isReady).toBe(true);
    expect(result.current.readyTrigger).toEqual({ type: 'touch' });
    expect(onStart).not.toHaveBeenCalled();

    act(() => {
      result.current.startReady();
    });
    expect(result.current.isReady).toBe(false);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('startReady without prepareStart does not call onStart', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }),
    );

    act(() => {
      result.current.startReady();
    });
    expect(result.current.isReady).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('cancelReady clears explicit ready state so startReady does not start', () => {
    const onStart = vi.fn();
    const { result } = renderHook(() =>
      useTimerGesture(false, { onStart, onStop: vi.fn(), onCancel: vi.fn() }),
    );

    act(() => {
      result.current.prepareStart();
    });
    expect(result.current.isReady).toBe(true);

    act(() => {
      result.current.cancelReady();
    });
    expect(result.current.isReady).toBe(false);

    act(() => {
      result.current.startReady();
    });
    expect(onStart).not.toHaveBeenCalled();
  });

  it('prepareStart when start is disabled does not mark ready or call onStart', () => {
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
      result.current.prepareStart();
    });
    expect(result.current.isReady).toBe(false);

    act(() => {
      result.current.startReady();
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

  it('idle touchend does not cancel or start timing', () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() => useTimerGesture(false, { onStart, onStop, onCancel }));

    act(() => {
      document.dispatchEvent(
        new TouchEvent('touchend', { changedTouches: [makeTouch(400)], bubbles: true }),
      );
    });

    expect(result.current.isReady).toBe(false);
    expect(onStart).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
