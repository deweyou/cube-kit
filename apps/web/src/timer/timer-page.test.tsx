import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryTimerSessionRepository } from './storage/memory-timer-session-repository';
import { TimerPage } from './timer-page';

const { generate, renderScrambleImage } = vi.hoisted(() => ({
  generate: vi.fn(),
  renderScrambleImage: vi.fn((_eventId: string, scramble: string) => `<svg>${scramble}</svg>`),
}));

vi.mock('@cubegin/scramble-core', () => ({
  createDefaultScrambleGenerator: () => ({ generate }),
  createMathRandomSource: () => ({ nextInt: () => 0 }),
}));

vi.mock('@cubegin/scramble-image', () => ({
  renderScrambleImage,
}));

vi.mock('@deweyou-design/react/button', () => ({
  Button: ({
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
}));

afterEach(() => {
  cleanup();
  generate.mockReset();
  renderScrambleImage.mockClear();
});

describe('TimerPage', () => {
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

  it('starts with the start button, saves +2, and lists the solve', async () => {
    generate
      .mockResolvedValueOnce({ eventId: '333', scramble: 'R U' })
      .mockResolvedValueOnce({ eventId: '333', scramble: 'F R' });

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    await screen.findAllByText('R U');
    await userEvent.click(screen.getByRole('button', { name: '开始' }));
    await userEvent.keyboard('{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: '+2' }));

    expect(await screen.findByText('#1')).not.toBeNull();
    expect(await screen.findByText('+2')).not.toBeNull();
    expect(await screen.findAllByText('F R')).toHaveLength(2);
  });

  it('discards deleted results without adding a solve row', async () => {
    generate
      .mockResolvedValueOnce({ eventId: '333', scramble: 'R U' })
      .mockResolvedValueOnce({ eventId: '333', scramble: 'F R' });

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    await screen.findAllByText('R U');
    await userEvent.click(screen.getByRole('button', { name: '开始' }));
    await userEvent.keyboard('{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: '删除' }));

    expect(screen.queryByText('#1')).toBeNull();
    expect(await screen.findAllByText('F R')).toHaveLength(2);
  });

  it('switches event changes to the matching default list', async () => {
    generate
      .mockResolvedValueOnce({ eventId: '333', scramble: 'R U' })
      .mockResolvedValueOnce({ eventId: '222', scramble: 'R U R' });

    render(<TimerPage repository={createMemoryTimerSessionRepository()} />);

    await screen.findAllByText('R U');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '魔方类型' }), '222');

    expect(screen.getByRole<HTMLSelectElement>('combobox', { name: '成绩列表' }).value).toBe(
      'default:222',
    );
  });
});
