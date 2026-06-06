import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ResultView } from './result-view';

vi.mock('@deweyou-design/react/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

describe('ResultView', () => {
  it('exposes continue, +2, DNF, and delete actions', async () => {
    const onContinue = vi.fn();
    const onPlusTwo = vi.fn();
    const onDnf = vi.fn();
    const onDelete = vi.fn();

    render(
      <ResultView
        elapsed={1234}
        scramble="R U"
        onContinue={onContinue}
        onPlusTwo={onPlusTwo}
        onDnf={onDnf}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '继续' }));
    await userEvent.click(screen.getByRole('button', { name: '+2' }));
    await userEvent.click(screen.getByRole('button', { name: 'DNF' }));
    await userEvent.click(screen.getByRole('button', { name: '删除' }));

    expect(onContinue).toHaveBeenCalledOnce();
    expect(onPlusTwo).toHaveBeenCalledOnce();
    expect(onDnf).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
