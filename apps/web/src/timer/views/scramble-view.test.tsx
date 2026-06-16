import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimerReadyTrigger } from '../hooks/use-timer-gesture';
import { TIMER_MESSAGES } from '../timer-i18n';
import { ScrambleView } from './scramble-view';

const { renderScrambleImage } = vi.hoisted(() => ({
  renderScrambleImage: vi.fn(
    (_eventId: string, scramble: string) => `<svg data-scramble="${scramble}"></svg>`,
  ),
}));

vi.mock('@cubegin/scramble-image', () => ({
  renderScrambleImage,
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
    eventId: '333' | '333mbld';
    isReady: boolean;
    multiBlindCubeCount: number;
    onMultiBlindCubeCountChange: (count: number) => void;
    onCancelReady: () => void;
    onPrepareStart: () => void;
    onRefresh: () => void;
    onStartReady: () => void;
    readyTrigger: TimerReadyTrigger;
    scramble: string;
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
      eventId={props.eventId ?? '333'}
      scramble={props.scramble ?? "R U R' U'"}
      isReady={props.isReady}
      multiBlindCubeCount={props.multiBlindCubeCount ?? 3}
      messages={messages}
      onCancelReady={callbacks.onCancelReady}
      onMultiBlindCubeCountChange={props.onMultiBlindCubeCountChange}
      onPrepareStart={callbacks.onPrepareStart}
      onRefresh={callbacks.onRefresh}
      readyTrigger={props.readyTrigger}
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
    renderScrambleImage.mockClear();
    cleanup();
  });

  it('keeps the start hint as a root footer sibling of the scramble surface', () => {
    renderScrambleView();

    const root = screen.getByLabelText(messages.timerPage);
    const actionStack = getActionStack();

    expect(actionStack.parentElement).toBe(root);
    expect(root.firstElementChild?.contains(actionStack)).toBe(false);
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

  it('shows keyboard-specific ready overlay copy for Space ready state', () => {
    renderScrambleView({
      isReady: true,
      readyTrigger: { keyLabel: 'Space', type: 'keyboard' },
    });

    expect(screen.getByText('Esc 取消')).not.toBeNull();
    expect(screen.getByText('松开 Space 开始')).not.toBeNull();
    expect(screen.queryByText(messages.slideUpToCancel)).toBeNull();
  });

  it('pages through multi-blind cube scrambles one cube at a time with icon controls', () => {
    renderScrambleView({
      eventId: '333mbld',
      scramble: "R U R' U'\nF R U\nL D F",
    });

    expect(screen.getByRole('textbox', { name: '数量' })).not.toBeNull();
    expect(screen.getByText('1 / 3')).not.toBeNull();
    expect(screen.getByText("R U R' U'")).not.toBeNull();
    expect(screen.queryByText('F R U')).toBeNull();
    expect(renderScrambleImage).toHaveBeenLastCalledWith('333mbld', "R U R' U'");
    expect(screen.getByRole('button', { name: '上一颗' }).textContent).toBe('');
    expect(screen.getByRole('button', { name: '下一颗' }).textContent).toBe('');

    fireEvent.click(screen.getByRole('button', { name: '下一颗' }));

    expect(screen.getByText('2 / 3')).not.toBeNull();
    expect(screen.getByText('F R U')).not.toBeNull();
    expect(renderScrambleImage).toHaveBeenLastCalledWith('333mbld', 'F R U');
  });

  it('keeps multi-blind scramble text and image visible together', () => {
    renderScrambleView({
      eventId: '333mbld',
      scramble: "R U R' U'\nF R U",
    });

    expect(screen.getByText("R U R' U'")).not.toBeNull();
    expect(document.querySelector('svg[data-scramble]')?.getAttribute('data-scramble')).toBe(
      "R U R' U'",
    );
    expect(screen.queryByRole('button', { name: '显示打乱图' })).toBeNull();
    expect(screen.queryByRole('button', { name: '显示打乱' })).toBeNull();
  });

  it('commits multi-blind cube count changes on Enter', () => {
    const onMultiBlindCubeCountChange = vi.fn();
    renderScrambleView({
      eventId: '333mbld',
      onMultiBlindCubeCountChange,
      scramble: "R U R' U'\nF R U",
    });

    const countInput = screen.getByRole('textbox', { name: '数量' });
    fireEvent.change(countInput, {
      target: { value: '6' },
    });

    expect(onMultiBlindCubeCountChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '确认数量' })).not.toBeNull();

    fireEvent.keyDown(countInput, { key: 'Enter' });

    expect(onMultiBlindCubeCountChange).toHaveBeenCalledWith(6);
  });

  it('commits multi-blind cube count changes from the confirm button', () => {
    const onMultiBlindCubeCountChange = vi.fn();
    renderScrambleView({
      eventId: '333mbld',
      multiBlindCubeCount: 3,
      onMultiBlindCubeCountChange,
      scramble: "R U R' U'\nF R U",
    });

    const countInput = screen.getByRole('textbox', { name: '数量' }) as HTMLInputElement;
    fireEvent.change(countInput, {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: '确认数量' }));

    expect(onMultiBlindCubeCountChange).toHaveBeenCalledWith(5);
  });

  it('commits multi-blind cube count changes on blur and ignores invalid values', () => {
    const onMultiBlindCubeCountChange = vi.fn();
    renderScrambleView({
      eventId: '333mbld',
      multiBlindCubeCount: 3,
      onMultiBlindCubeCountChange,
      scramble: "R U R' U'\nF R U",
    });

    const countInput = screen.getByRole('textbox', { name: '数量' }) as HTMLInputElement;
    fireEvent.change(countInput, {
      target: { value: '1' },
    });
    fireEvent.blur(countInput);

    expect(onMultiBlindCubeCountChange).not.toHaveBeenCalled();
    expect(countInput.value).toBe('3');

    fireEvent.change(countInput, {
      target: { value: '4' },
    });
    fireEvent.blur(countInput);

    expect(onMultiBlindCubeCountChange).toHaveBeenCalledWith(4);
  });

  it('keeps the multi-blind viewer available for a one-cube attempt', () => {
    renderScrambleView({
      eventId: '333mbld',
      multiBlindCubeCount: 1,
      scramble: "R U R' U'",
    });

    expect(screen.getByRole('textbox', { name: '数量' })).not.toBeNull();
    expect(screen.getByText('1 / 1')).not.toBeNull();
  });

  it('keeps the current cube when the multi-blind scramble grows and clamps it when it shrinks', () => {
    const { rerender } = render(
      <ScrambleView
        eventId="333mbld"
        multiBlindCubeCount={5}
        scramble={'cube 1\ncube 2\ncube 3\ncube 4\ncube 5'}
        messages={messages}
        onCancelReady={vi.fn()}
        onPrepareStart={vi.fn()}
        onRefresh={vi.fn()}
        onStartReady={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '下一颗' }));
    fireEvent.click(screen.getByRole('button', { name: '下一颗' }));
    fireEvent.click(screen.getByRole('button', { name: '下一颗' }));
    fireEvent.click(screen.getByRole('button', { name: '下一颗' }));

    expect(screen.getByText('5 / 5')).not.toBeNull();

    rerender(
      <ScrambleView
        eventId="333mbld"
        multiBlindCubeCount={7}
        scramble={'cube 1\ncube 2\ncube 3\ncube 4\ncube 5\ncube 6\ncube 7'}
        messages={messages}
        onCancelReady={vi.fn()}
        onPrepareStart={vi.fn()}
        onRefresh={vi.fn()}
        onStartReady={vi.fn()}
      />,
    );

    expect(screen.getByText('5 / 7')).not.toBeNull();

    rerender(
      <ScrambleView
        eventId="333mbld"
        multiBlindCubeCount={3}
        scramble={'cube 1\ncube 2\ncube 3'}
        messages={messages}
        onCancelReady={vi.fn()}
        onPrepareStart={vi.fn()}
        onRefresh={vi.fn()}
        onStartReady={vi.fn()}
      />,
    );

    expect(screen.getByText('3 / 3')).not.toBeNull();
  });
});
