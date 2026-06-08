import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SessionSelector } from './session-selector';
import { SolveDetail } from './solve-detail';
import { SolveList } from './solve-list';
import { TIMER_MESSAGES } from '../timer-i18n';

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

const sessions = [
  { id: 'default:333', name: '3x3x3', eventId: '333' as const, isDefault: true, createdAt: 1 },
  { id: 'custom', name: '练习', isDefault: false, createdAt: 2 },
];

const solves = [
  {
    id: 'new',
    sessionId: 'custom',
    eventId: '333' as const,
    scramble: 'R U',
    elapsedMs: 1234,
    penalty: '+2' as const,
    createdAt: 2000,
  },
  {
    id: 'old',
    sessionId: 'custom',
    eventId: '222' as const,
    scramble: 'R U R',
    elapsedMs: 1000,
    penalty: 'none' as const,
    createdAt: 1000,
  },
];

describe('session components', () => {
  const messages = TIMER_MESSAGES['zh-CN'];

  it('selects and creates sessions', async () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();
    render(
      <SessionSelector
        sessions={sessions}
        activeSessionId="default:333"
        canDeleteActiveSession={false}
        onCreateSession={onCreate}
        onDeleteActiveSession={vi.fn()}
        onSelectSession={onSelect}
      />,
    );

    await userEvent.selectOptions(screen.getByRole('combobox', { name: '成绩列表' }), 'custom');
    await userEvent.click(screen.getByRole('button', { name: '新建列表' }));

    expect(onSelect).toHaveBeenCalledWith('custom');
    expect(onCreate).toHaveBeenCalledWith('新列表');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '删除列表' }).disabled).toBe(true);
  });

  it('shows reverse sequence numbers and displayed times', () => {
    render(<SolveList emptyText={messages.noSolves} solves={solves} onSelectSolve={vi.fn()} />);

    expect(screen.queryByText('#2')).not.toBeNull();
    expect(screen.queryByText('3.234')).not.toBeNull();
    expect(screen.queryByText('+2')).toBeNull();
    expect(screen.queryByText('#1')).not.toBeNull();
  });

  it('edits penalty and deletes from detail', async () => {
    const onPenalty = vi.fn();
    const onDelete = vi.fn();
    render(
      <SolveDetail
        locale="zh-CN"
        messages={messages}
        solve={solves[0]!}
        onClose={vi.fn()}
        onDelete={onDelete}
        onPenaltyChange={onPenalty}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'DNF' }));
    await userEvent.click(screen.getByRole('button', { name: '删除成绩' }));

    expect(onPenalty).toHaveBeenCalledWith('new', 'dnf');
    expect(onDelete).toHaveBeenCalledWith('new');
  });
});
