import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TIMER_MESSAGES } from '../timer-i18n';
import { ScrambleView } from './scramble-view';

vi.mock('@cubegin/scramble-image', () => ({
  renderScrambleImage: (_eventId: string, scramble: string) => `<svg>${scramble}</svg>`,
}));

vi.mock('@deweyou-design/react/button', () => ({
  Button: {
    Icon: ({
      'aria-label': ariaLabel,
      className,
      icon,
      onClick,
    }: {
      'aria-label': string;
      className?: string;
      icon: ReactNode;
      onClick?: () => void;
    }) => (
      <button type="button" aria-label={ariaLabel} className={className} onClick={onClick}>
        {icon}
      </button>
    ),
  },
}));

vi.mock('@deweyou-design/react/tooltip', () => ({
  Tooltip: {
    Root: ({ children }: { children: ReactNode }) => <>{children}</>,
    Trigger: ({ children }: { children: ReactNode }) => <>{children}</>,
    Content: ({ children }: { children: ReactNode }) => <>{children}</>,
  },
}));

const messages = TIMER_MESSAGES['zh-CN'];

const getActionStack = () => {
  const actionStack = screen.getByText(messages.holdEnterToStart).closest('div');
  if (!actionStack) {
    throw new Error('Expected timer action stack to be rendered');
  }
  return actionStack;
};

const renderScrambleView = (
  props: Partial<{
    isReady: boolean;
    onCancelReady: () => void;
    onPrepareStart: () => void;
    onRefresh: () => void;
    onStartReady: () => void;
  }> = {},
) => {
  const callbacks = {
    onCancelReady: vi.fn(),
    onPrepareStart: vi.fn(),
    onRefresh: vi.fn(),
    onStartReady: vi.fn(),
    ...props,
  };

  render(
    <ScrambleView
      eventId="333"
      scramble="R U R' U'"
      isReady={props.isReady}
      messages={messages}
      onCancelReady={callbacks.onCancelReady}
      onPrepareStart={callbacks.onPrepareStart}
      onRefresh={callbacks.onRefresh}
      onStartReady={callbacks.onStartReady}
    />,
  );

  return callbacks;
};

const renderStatefulScrambleView = () => {
  const callbacks = {
    onCancelReady: vi.fn(),
    onPrepareStart: vi.fn(),
    onRefresh: vi.fn(),
    onStartReady: vi.fn(),
  };

  const StatefulScrambleView = () => {
    const [isReady, setIsReady] = useState(false);

    return (
      <ScrambleView
        eventId="333"
        scramble="R U R' U'"
        isReady={isReady}
        messages={messages}
        onCancelReady={() => {
          setIsReady(false);
          callbacks.onCancelReady();
        }}
        onPrepareStart={() => {
          setIsReady(true);
          callbacks.onPrepareStart();
        }}
        onRefresh={callbacks.onRefresh}
        onStartReady={callbacks.onStartReady}
      />
    );
  };

  render(<StatefulScrambleView />);

  return callbacks;
};

describe('ScrambleView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it('does not start when the action pill is released before the long-press threshold', () => {
    const callbacks = renderScrambleView();
    const actionStack = getActionStack();

    fireEvent.pointerDown(actionStack, {
      button: 0,
      clientX: 100,
      clientY: 600,
      pointerId: 1,
      pointerType: 'touch',
    });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    fireEvent.pointerUp(actionStack, {
      button: 0,
      clientX: 100,
      clientY: 600,
      pointerId: 1,
      pointerType: 'touch',
    });

    expect(callbacks.onPrepareStart).not.toHaveBeenCalled();
    expect(callbacks.onStartReady).not.toHaveBeenCalled();
    expect(callbacks.onCancelReady).toHaveBeenCalledOnce();
  });

  it('does not show the touch overlay from a mouse long press', () => {
    const callbacks = renderScrambleView();
    const actionStack = getActionStack();

    fireEvent.pointerDown(actionStack, {
      button: 0,
      clientX: 100,
      clientY: 600,
      pointerId: 1,
      pointerType: 'mouse',
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callbacks.onPrepareStart).not.toHaveBeenCalled();
    expect(screen.queryByText(messages.releaseToStart)).toBeNull();
  });

  it('prepares on long press and starts only after releasing the action pill', () => {
    const callbacks = renderScrambleView();
    const actionStack = getActionStack();

    fireEvent.pointerDown(actionStack, {
      button: 0,
      clientX: 100,
      clientY: 600,
      pointerId: 1,
      pointerType: 'touch',
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callbacks.onPrepareStart).toHaveBeenCalledOnce();
    expect(callbacks.onStartReady).not.toHaveBeenCalled();
    expect(screen.getByText(messages.releaseToStart)).not.toBeNull();

    fireEvent.pointerUp(actionStack, {
      button: 0,
      clientX: 100,
      clientY: 600,
      pointerId: 1,
    });

    expect(callbacks.onStartReady).toHaveBeenCalledOnce();
  });

  it('cancels the pending action when the pointer moves like a scroll gesture', () => {
    const callbacks = renderScrambleView();
    const actionStack = getActionStack();

    fireEvent.pointerDown(actionStack, {
      button: 0,
      clientX: 100,
      clientY: 600,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent.pointerMove(actionStack, {
      clientX: 100,
      clientY: 616,
      pointerId: 1,
      pointerType: 'touch',
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.pointerUp(actionStack, {
      button: 0,
      clientX: 100,
      clientY: 616,
      pointerId: 1,
      pointerType: 'touch',
    });

    expect(callbacks.onPrepareStart).not.toHaveBeenCalled();
    expect(callbacks.onStartReady).not.toHaveBeenCalled();
    expect(callbacks.onCancelReady).toHaveBeenCalledOnce();
  });

  it('cancels instead of starting when released in the touch cancel zone', () => {
    const callbacks = renderStatefulScrambleView();
    const actionStack = getActionStack();

    fireEvent.pointerDown(actionStack, {
      button: 0,
      clientX: 100,
      clientY: 600,
      pointerId: 1,
      pointerType: 'touch',
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.pointerMove(actionStack, {
      clientX: 100,
      clientY: 60,
      pointerId: 1,
      pointerType: 'touch',
    });

    expect(screen.getByText(messages.releaseToCancel)).not.toBeNull();

    fireEvent.pointerUp(actionStack, {
      button: 0,
      clientX: 100,
      clientY: 60,
      pointerId: 1,
      pointerType: 'touch',
    });

    expect(callbacks.onPrepareStart).toHaveBeenCalledOnce();
    expect(callbacks.onStartReady).not.toHaveBeenCalled();
    expect(callbacks.onCancelReady).toHaveBeenCalledOnce();
  });
});
