import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResultView } from './result-view';
import { TIMER_MESSAGES } from '../timer-i18n';

vi.mock('@deweyou-design/react/button', () => ({
  Button: Object.assign(
    ({
      children,
      disabled,
      ...props
    }: {
      children: ReactNode;
      disabled?: boolean;
    } & ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" disabled={disabled} {...props}>
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

afterEach(() => {
  cleanup();
});

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

    await userEvent.click(screen.getByRole('button', { name: TIMER_MESSAGES['zh-CN'].continue }));
    await userEvent.click(screen.getByRole('button', { name: '+2' }));
    await userEvent.click(screen.getByRole('button', { name: 'DNF' }));
    await userEvent.click(screen.getByRole('button', { name: '删除' }));

    expect(onContinue).toHaveBeenCalledOnce();
    expect(onPlusTwo).toHaveBeenCalledOnce();
    expect(onDnf).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('continues when tapping the blank result area', () => {
    const onContinue = vi.fn();
    const { container } = render(
      <ResultView
        elapsed={1234}
        messages={TIMER_MESSAGES['zh-CN']}
        onContinue={onContinue}
        onPlusTwo={vi.fn()}
        onDnf={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(container.firstElementChild!);

    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('does not continue when tapping a result action', async () => {
    const onContinue = vi.fn();
    const onPlusTwo = vi.fn();

    render(
      <ResultView
        elapsed={1234}
        messages={TIMER_MESSAGES['zh-CN']}
        onContinue={onContinue}
        onPlusTwo={onPlusTwo}
        onDnf={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '+2' }));

    expect(onPlusTwo).toHaveBeenCalledOnce();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('captures multi-blind solved count before continuing', async () => {
    const onContinue = vi.fn();

    render(
      <ResultView
        elapsed={1234}
        messages={TIMER_MESSAGES['zh-CN']}
        multiBlindAttemptedCount={10}
        onContinue={onContinue}
        onPlusTwo={vi.fn()}
        onDnf={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const solvedInput = screen.getByRole('textbox', { name: '成功数量' });
    fireEvent.change(solvedInput, { target: { value: '8' } });

    await userEvent.click(screen.getByRole('button', { name: TIMER_MESSAGES['zh-CN'].continue }));

    expect(onContinue).toHaveBeenCalledWith(8);
    expect(screen.queryByRole('button', { name: '+2' })).toBeNull();
  });

  it('blocks multi-blind solved counts above the attempted count', async () => {
    const onContinue = vi.fn();
    const onDnf = vi.fn();

    render(
      <ResultView
        elapsed={3_600_001}
        isAutoDnf
        messages={TIMER_MESSAGES['zh-CN']}
        multiBlindAttemptedCount={3}
        onContinue={onContinue}
        onPlusTwo={vi.fn()}
        onDnf={onDnf}
        onDelete={vi.fn()}
      />,
    );

    const solvedInput = screen.getByRole('textbox', { name: '成功数量' });
    fireEvent.change(solvedInput, { target: { value: '9' } });

    await userEvent.click(screen.getByRole('button', { name: TIMER_MESSAGES['zh-CN'].continue }));
    await userEvent.click(screen.getByRole('button', { name: 'DNF' }));

    expect(screen.getByText('超过 1 小时，保存时会自动记为 DNF')).not.toBeNull();
    expect(screen.getByText('请输入 0 到 3 的整数')).not.toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: TIMER_MESSAGES['zh-CN'].continue,
      }).disabled,
    ).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'DNF' }).disabled).toBe(true);
    expect(onContinue).not.toHaveBeenCalled();
    expect(onDnf).not.toHaveBeenCalled();
  });

  it('passes the multi-blind solved count when saving DNF', async () => {
    const onDnf = vi.fn();

    render(
      <ResultView
        elapsed={1234}
        messages={TIMER_MESSAGES['zh-CN']}
        multiBlindAttemptedCount={10}
        onContinue={vi.fn()}
        onPlusTwo={vi.fn()}
        onDnf={onDnf}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: '成功数量' }), {
      target: { value: '6' },
    });

    await userEvent.click(screen.getByRole('button', { name: 'DNF' }));

    expect(onDnf).toHaveBeenCalledWith(6);
  });

  it('fires result actions from touch pointerup without waiting for synthetic click', () => {
    const onPlusTwo = vi.fn();

    render(
      <ResultView
        elapsed={1234}
        messages={TIMER_MESSAGES['zh-CN']}
        onContinue={vi.fn()}
        onPlusTwo={onPlusTwo}
        onDnf={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const plusTwoButton = screen.getByRole('button', { name: '+2' });
    fireEvent.pointerUp(plusTwoButton, { pointerType: 'touch' });
    fireEvent.click(plusTwoButton);

    expect(onPlusTwo).toHaveBeenCalledOnce();
  });

  it('fires result actions from touchend when pointer events are unavailable', () => {
    const onDnf = vi.fn();

    render(
      <ResultView
        elapsed={1234}
        messages={TIMER_MESSAGES['zh-CN']}
        onContinue={vi.fn()}
        onPlusTwo={vi.fn()}
        onDnf={onDnf}
        onDelete={vi.fn()}
      />,
    );

    const dnfButton = screen.getByRole('button', { name: 'DNF' });
    fireEvent.touchStart(dnfButton);
    fireEvent.touchEnd(dnfButton);
    fireEvent.click(dnfButton);

    expect(onDnf).toHaveBeenCalledOnce();
  });

  it('keeps the result time visually above center without moving bottom actions', () => {
    expect(resultViewCss).toContain('transform: translateY(clamp(-72px, -8vh, -32px));');
    expect(resultViewCss).toContain('position: absolute;');
    expect(resultViewCss).toContain('white-space: nowrap;');
    expect(resultViewCss).toContain('z-index: 20;');
    expect(resultActionsCss).toContain('min-height: 44px;');
    expect(resultActionsCss).toContain('display: inline-flex;');
    expect(resultActionsCss).toContain('white-space: nowrap;');
  });
});

const resultViewCss = readFileSync(
  resolve(process.cwd(), 'src/timer/views/result-view.module.css'),
  'utf8',
);

const resultActionsCss = readFileSync(
  resolve(process.cwd(), 'src/timer/components/result-actions.module.css'),
  'utf8',
);
