import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WCA_EVENT_IDS } from '@cubegin/shared/wca';
import type { ChangeEvent, CSSProperties, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryTimerSessionRepository } from './storage/memory-timer-session-repository';
import { TimerPage } from './timer-page';
import { TIMER_MESSAGES } from './timer-i18n';

const { generate, renderScrambleImage } = vi.hoisted(() => ({
  generate: vi.fn(),
  renderScrambleImage: vi.fn((_eventId: string, scramble: string) => `<svg>${scramble}</svg>`),
}));

const setNarrowViewport = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 860px)' ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

vi.mock('@cubegin/scramble-core', () => ({
  createDefaultScrambleGenerator: () => ({ generate }),
  createMathRandomSource: () => ({ nextInt: () => 0 }),
}));

vi.mock('@cubegin/scramble-image', () => ({
  renderScrambleImage,
}));

vi.mock('@deweyou-design/react/button', () => ({
  Button: Object.assign(
    ({
      children,
      onClick,
      disabled,
      'aria-label': ariaLabel,
    }: {
      children: ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      'aria-label'?: string;
    }) => (
      <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
        {children}
      </button>
    ),
    {
      Icon: ({
        icon,
        onClick,
        disabled,
        'aria-label': ariaLabel,
      }: {
        icon: ReactNode;
        onClick?: () => void;
        disabled?: boolean;
        'aria-label'?: string;
      }) => (
        <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
          {icon}
        </button>
      ),
    },
  ),
}));

vi.mock('@deweyou-design/react/input', () => ({
  Input: ({
    label,
    value,
    onChange,
    placeholder,
    'aria-label': ariaLabel,
  }: {
    label?: string;
    value?: string;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    'aria-label'?: string;
  }) => (
    <label>
      {label}
      <input value={value} onChange={onChange} placeholder={placeholder} aria-label={ariaLabel} />
    </label>
  ),
}));

vi.mock('@deweyou-design/react/select', () => {
  const Select = {
    Root: ({
      children,
      className,
      label,
      style,
      value,
      onValueChange,
    }: {
      children: ReactNode;
      className?: string;
      label?: ReactNode;
      style?: CSSProperties;
      value?: string[];
      onValueChange?: (value: string[]) => void;
    }) => (
      <label className={className} style={style}>
        {label}
        <select
          aria-label={typeof label === 'string' ? label : undefined}
          value={value?.[0] ?? ''}
          onChange={(event) => onValueChange?.([event.target.value])}
        >
          {children}
        </select>
      </label>
    ),
    Trigger: () => null,
    Content: ({ children }: { children: ReactNode }) => <>{children}</>,
    Item: ({
      className,
      style,
      value,
      label,
    }: {
      className?: string;
      style?: CSSProperties;
      value: string;
      label: string;
    }) => (
      <option className={className} style={style} value={value}>
        {label}
      </option>
    ),
  };
  return { Select };
});

vi.mock('@deweyou-design/react/tooltip', () => ({
  Tooltip: {
    Root: ({ children }: { children: ReactNode }) => <>{children}</>,
    Trigger: ({ children }: { children: ReactNode }) => <>{children}</>,
    Content: ({ children }: { children: ReactNode }) => <>{children}</>,
  },
}));

beforeEach(() => {
  setNarrowViewport(false);
});

afterEach(() => {
  cleanup();
  generate.mockReset();
  renderScrambleImage.mockClear();
});

describe('TimerPage', () => {
  it('moves the event selector to the page actions when the sidebar is collapsed', () => {
    setNarrowViewport(true);
    generate.mockResolvedValueOnce({ eventId: '333', scramble: "R U R' U'" });

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    const sidebar = screen.getByRole('complementary', { name: '练习列表' });

    expect(within(sidebar).queryByRole('combobox', { name: '魔方类型' })).toBeNull();
    expect(screen.getByRole('combobox', { name: '魔方类型' })).not.toBeNull();
  });

  it('only marks the stage as scrolled after the timer content scrolls down', async () => {
    generate.mockResolvedValueOnce({ eventId: '333', scramble: "R U R' U'" });

    const { container } = render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    const stage = await screen.findByRole('main', { name: TIMER_MESSAGES['zh-CN'].timerPage });
    const root = container.querySelector("[data-stage-scrolled='false']");

    expect(root).not.toBeNull();

    fireEvent.scroll(stage, { target: { scrollTop: 12 } });

    expect(container.querySelector("[data-stage-scrolled='true']")).not.toBeNull();
    expect(await screen.findAllByText("R U R' U'")).toHaveLength(2);
  });

  it('loads the initial scramble and refreshes through the default scramble generator', async () => {
    generate
      .mockResolvedValueOnce({ eventId: '333', scramble: "R U R' U'" })
      .mockResolvedValueOnce({ eventId: '333', scramble: "F R U R' U' F'" });

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    expect(await screen.findAllByText("R U R' U'")).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: '换一个打乱' }));

    expect(await screen.findAllByText("F R U R' U' F'")).toHaveLength(2);
    expect(generate).toHaveBeenNthCalledWith(1, '333', { multiBlindCubeCount: undefined });
    expect(generate).toHaveBeenNthCalledWith(2, '333', { multiBlindCubeCount: undefined });
  });

  it('uses a prefetched next scramble after finishing a solve', async () => {
    const scrambles = ['R U', 'F R', 'L D'];
    generate.mockImplementation((eventId: string) =>
      Promise.resolve({
        eventId,
        scramble: eventId === '333' ? scrambles.shift() : `${eventId} idle`,
      }),
    );

    render(<TimerPage enableScramblePrefetch repository={createMemoryTimerSessionRepository()} />);

    expect(await screen.findAllByText('R U')).toHaveLength(2);
    await waitFor(() =>
      expect(generate.mock.calls.filter(([eventId]) => eventId === '333')).toHaveLength(2),
    );

    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('button', { name: TIMER_MESSAGES['zh-CN'].continue });
    await userEvent.keyboard('{Enter}');

    expect(await screen.findAllByText('F R')).toHaveLength(2);
    expect(screen.queryByText('R U')).toBeNull();
  });

  it('warms all inactive events once after the first loaded scramble', async () => {
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 50 });
      return 1;
    });
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      value: requestIdleCallback,
    });
    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      value: vi.fn(),
    });
    generate.mockImplementation((eventId: string) =>
      Promise.resolve({
        eventId,
        scramble: `${eventId} scramble`,
      }),
    );

    render(<TimerPage enableScramblePrefetch repository={createMemoryTimerSessionRepository()} />);

    expect(await screen.findAllByText('333 scramble')).toHaveLength(2);
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(WCA_EVENT_IDS.length + 1));

    expect(generate).toHaveBeenNthCalledWith(1, '333', { multiBlindCubeCount: undefined });
    expect(generate).toHaveBeenNthCalledWith(2, '333', { multiBlindCubeCount: undefined });
    expect(generate.mock.calls.map(([eventId]) => eventId)).toEqual([
      '333',
      '333',
      ...WCA_EVENT_IDS.filter((eventId) => eventId !== '333'),
    ]);

    await userEvent.click(screen.getByRole('button', { name: '换一个打乱' }));
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(WCA_EVENT_IDS.length + 2));

    expect(generate.mock.calls.map(([eventId]) => eventId)).toEqual([
      '333',
      '333',
      ...WCA_EVENT_IDS.filter((eventId) => eventId !== '333'),
      '333',
    ]);
  });

  it('clears the previous scramble before rendering a newly selected event', async () => {
    generate
      .mockResolvedValueOnce({ eventId: '333', scramble: "R U R' U'" })
      .mockResolvedValueOnce({ eventId: '222', scramble: "R U R'" });

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    expect(await screen.findAllByText("R U R' U'")).toHaveLength(2);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: '魔方类型' }), '222');

    expect(await screen.findAllByText("R U R'")).toHaveLength(2);
    expect(renderScrambleImage).not.toHaveBeenCalledWith('222', "R U R' U'");
  });

  it('optimistically switches event controls while a slow scramble is loading', async () => {
    let resolveFourByFour: (result: { eventId: '444'; scramble: string }) => void = () => {};
    generate
      .mockResolvedValueOnce({ eventId: '333', scramble: "R U R' U'" })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFourByFour = resolve;
          }),
      );

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    await screen.findAllByText("R U R' U'");
    const eventSelector = screen.getByRole('combobox', { name: '魔方类型' }) as HTMLSelectElement;
    await userEvent.selectOptions(eventSelector, '444');

    expect(eventSelector.value).toBe('444');
    expect(screen.getAllByText(TIMER_MESSAGES['zh-CN'].scrambleLoading)).not.toHaveLength(0);
    expect(screen.queryByText("R U R' U'")).toBeNull();

    resolveFourByFour({ eventId: '444', scramble: "R U R' F" });

    expect(await screen.findAllByText("R U R' F")).toHaveLength(2);
  });

  it('starts with the start button, saves +2, and lists the solve', async () => {
    generate
      .mockResolvedValueOnce({ eventId: '333', scramble: 'R U' })
      .mockResolvedValueOnce({ eventId: '333', scramble: 'F R' });

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    await screen.findAllByText('R U');
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: '+2' }));

    expect(await screen.findByText('#1')).not.toBeNull();
    expect(await screen.findAllByText((text) => /^2\.\d{3}$/.test(text))).not.toHaveLength(0);
    expect(screen.queryByText('+2')).toBeNull();
    expect(await screen.findAllByText('F R')).toHaveLength(2);
  });

  it('discards deleted results without adding a solve row', async () => {
    generate
      .mockResolvedValueOnce({ eventId: '333', scramble: 'R U' })
      .mockResolvedValueOnce({ eventId: '333', scramble: 'F R' });

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    await screen.findAllByText('R U');
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: '删除' }));

    expect(screen.queryByText('#1')).toBeNull();
    expect(await screen.findAllByText('F R')).toHaveLength(2);
  });

  it('pressing Enter on result continues with no penalty', async () => {
    generate
      .mockResolvedValueOnce({ eventId: '333', scramble: 'R U' })
      .mockResolvedValueOnce({ eventId: '333', scramble: 'F R' });

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    await screen.findAllByText('R U');
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('button', { name: TIMER_MESSAGES['zh-CN'].continue });

    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText('#1')).not.toBeNull();
    expect(await screen.findAllByText('F R')).toHaveLength(2);
  });

  it('pressing Space on result continues with no penalty', async () => {
    generate
      .mockResolvedValueOnce({ eventId: '333', scramble: 'R U' })
      .mockResolvedValueOnce({ eventId: '333', scramble: 'F R' });

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    await screen.findAllByText('R U');
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('button', { name: TIMER_MESSAGES['zh-CN'].continue });

    fireEvent.keyDown(document, { code: 'Space' });

    expect(await screen.findByText('#1')).not.toBeNull();
    expect(await screen.findAllByText('F R')).toHaveLength(2);
  });

  it('switches event changes to the matching default list', async () => {
    generate
      .mockResolvedValueOnce({ eventId: '333', scramble: 'R U' })
      .mockResolvedValueOnce({ eventId: '222', scramble: 'R U R' });

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    await screen.findAllByText('R U');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '魔方类型' }), '222');

    expect(screen.getByRole('button', { name: '成绩列表' }).textContent).toContain('默认列表');
  });
});
