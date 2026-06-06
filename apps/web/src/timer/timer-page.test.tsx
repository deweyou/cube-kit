import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

    render(<TimerPage />);

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

    render(<TimerPage />);

    expect(await screen.findAllByText("R U R' U'")).toHaveLength(2);

    await userEvent.selectOptions(screen.getByRole('combobox'), '222');

    expect(await screen.findAllByText("R U R'")).toHaveLength(2);
    expect(renderScrambleImage).not.toHaveBeenCalledWith('222', "R U R' U'");
  });
});
