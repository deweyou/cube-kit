import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ResultView } from './result-view';
import { TIMER_MESSAGES } from '../timer-i18n';

vi.mock('@deweyou-design/react/button', () => ({
  Button: Object.assign(
    ({
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
    {
      Icon: ({
        'aria-label': ariaLabel,
        onClick,
      }: {
        'aria-label': string;
        onClick?: () => void;
      }) => (
        <button type="button" aria-label={ariaLabel} onClick={onClick}>
          {ariaLabel}
        </button>
      ),
    },
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
        messages={TIMER_MESSAGES['zh-CN']}
        onContinue={onContinue}
        onPlusTwo={onPlusTwo}
        onDnf={onDnf}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: TIMER_MESSAGES['zh-CN'].enterToContinue }),
    );
    await userEvent.click(screen.getByRole('button', { name: '+2' }));
    await userEvent.click(screen.getByRole('button', { name: 'DNF' }));
    await userEvent.click(screen.getByRole('button', { name: '删除' }));

    expect(onContinue).toHaveBeenCalledOnce();
    expect(onPlusTwo).toHaveBeenCalledOnce();
    expect(onDnf).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
