import type { PuzzleAssistResult, PuzzleAssistSolution } from '@cubegin/solver';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAppCopy } from '../preferences/app-copy';
import { SolverAssistDialog } from './solver-assist-dialog';
import type { SolverAssistService } from './solver-assist-worker-client';

vi.mock('@deweyou-design/react/dialog', () => ({
  Dialog: {
    Root: ({ children, open }: { children: ReactNode; open?: boolean }) =>
      open ? <>{children}</> : null,
    Content: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div>,
    Title: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
    Description: ({ children }: { children: ReactNode }) => <p>{children}</p>,
    CloseButton: ({ 'aria-label': ariaLabel }: { 'aria-label'?: string }) => (
      <button aria-label={ariaLabel} type="button" />
    ),
  },
}));

vi.mock('@deweyou-design/react/select', () => {
  const Trigger = () => null;
  const Content = ({ children }: { children: ReactNode }) => <>{children}</>;
  const Item = ({ label, value }: { label: string; value: string }) => (
    <option value={value}>{label}</option>
  );

  return {
    Select: {
      Root: ({
        children,
        label,
        onValueChange,
        value,
      }: {
        children: ReactNode;
        label?: ReactNode;
        onValueChange?: (value: string[]) => void;
        value?: string[];
      }) => {
        const items: ReactNode[] = [];
        Children.forEach(children, (child) => {
          if (!isValidElement(child) || child.type !== Content) return;
          Children.forEach(
            (child as ReactElement<{ children?: ReactNode }>).props.children,
            (item) => {
              if (isValidElement(item) && item.type === Item) items.push(item);
            },
          );
        });

        return (
          <label>
            {label}
            <select
              aria-label={typeof label === 'string' ? label : undefined}
              value={value?.[0]}
              onChange={(event) => onValueChange?.([event.currentTarget.value])}
            >
              {items}
            </select>
          </label>
        );
      },
      Trigger,
      Content,
      Item,
    },
  };
});

vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({
    handleRef: vi.fn(),
    isDragSource: false,
    isDropTarget: false,
    ref: vi.fn(),
  }),
}));

const copy = getAppCopy('zh-CN').timer;

const createSolution = (
  target: string,
  ftm: number,
  overrides: Partial<PuzzleAssistSolution> = {},
): PuzzleAssistSolution => ({
  method: 'cross',
  target,
  targetLabel: `Cross(${target})`,
  setupRotation: '',
  solution: 'R U',
  depth: ftm,
  metric: { ftm, qtm: ftm },
  ...overrides,
});

const createService = (result: PuzzleAssistResult) => {
  const solve = vi.fn().mockResolvedValue(result);
  return {
    service: { solve: (...args) => solve(...args) } satisfies SolverAssistService,
    solve,
  };
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('SolverAssistDialog', () => {
  it('merges setup rotations into formulas and keeps tied shortest badges beside targets', async () => {
    const { service } = createService({
      method: 'cross',
      scramble: 'R U',
      solutions: [
        createSolution('D', 6, { setupRotation: 'x2', solution: "R U R'" }),
        createSolution('U', 4, { solution: 'F U' }),
        createSolution('L', 4, { setupRotation: 'z', solution: 'L F' }),
      ],
    });

    render(
      <SolverAssistDialog
        copy={copy}
        eventId="333"
        open
        scramble="R U"
        service={service}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText('辅助求解公式')).toBeTruthy();
    expect(screen.queryByText('基于当前打乱生成，仅用于查看和练习。')).toBeNull();
    expect(await screen.findByText('D')).toBeTruthy();
    expect(screen.getByText('U')).toBeTruthy();
    expect(screen.getByText('L')).toBeTruthy();
    expect(screen.getByText("x2 R U R'")).toBeTruthy();
    expect(screen.getAllByText('最短')).toHaveLength(2);
    expect(screen.getByText('U').parentElement?.textContent).toContain('最短');
    expect(screen.queryByText('本组最短 · 4 FTM')).toBeNull();
    expect(screen.queryByText('观察')).toBeNull();
    expect(screen.getByRole('button', { name: '调整 D 的显示顺序' })).toBeTruthy();
  });

  it('applies the remembered method-level target order and appends unknown targets', async () => {
    localStorage.setItem(
      'cubegin-solver-assist-target-orders',
      JSON.stringify({ cross: ['L', 'D'] }),
    );
    const { service } = createService({
      method: 'cross',
      scramble: 'R U',
      solutions: [createSolution('D', 6), createSolution('U', 4), createSolution('L', 5)],
    });

    render(
      <SolverAssistDialog
        copy={copy}
        eventId="333"
        open
        scramble="R U"
        service={service}
        onOpenChange={vi.fn()}
      />,
    );

    await screen.findByText('L');
    expect(
      screen.getAllByRole('listitem').map((row) => row.querySelector('strong')?.textContent),
    ).toEqual(['L', 'D', 'U']);
  });

  it('renders sequential methods as numbered stages without a shortest badge', async () => {
    localStorage.setItem('cubegin-solver-assist-methods', JSON.stringify({ '333fm': 'eo-dr' }));
    const { service } = createService({
      method: 'eo-dr',
      scramble: 'R U',
      solutions: [
        createSolution('EO', 4, {
          method: 'eo-dr',
          targetLabel: 'EO',
        }),
        createSolution('DR', 7, {
          method: 'eo-dr',
          targetLabel: 'DR',
        }),
      ],
    });

    render(
      <SolverAssistDialog
        copy={copy}
        eventId="333fm"
        open
        scramble="R U"
        service={service}
        onOpenChange={vi.fn()}
      />,
    );

    expect(await screen.findByText('阶段 1')).toBeTruthy();
    expect(screen.getByText('阶段 2')).toBeTruthy();
    expect(screen.getByText('EO')).toBeTruthy();
    expect(screen.getByText('DR')).toBeTruthy();
    expect(screen.queryByText('最短')).toBeNull();
    expect(screen.queryByRole('button', { name: /调整/u })).toBeNull();
  });

  it('renders a static method title when the event has only one method', async () => {
    const { service } = createService({
      method: 'skewb-face',
      scramble: "R U R'",
      solutions: [
        createSolution('U', 4, {
          method: 'skewb-face',
          targetLabel: 'U',
        }),
      ],
    });

    render(
      <SolverAssistDialog
        copy={copy}
        eventId="skewb"
        open
        scramble="R U R'"
        service={service}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Face' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: copy.solverAssistMethodLabel })).toBeNull();
    expect(await screen.findByText('U')).toBeTruthy();
  });

  it('loads only the remembered method and stores a new per-event selection', async () => {
    localStorage.setItem('cubegin-solver-assist-methods', JSON.stringify({ '333': 'xcross' }));
    const { service, solve } = createService({
      method: 'xcross',
      scramble: 'R U',
      solutions: [createSolution('D', 5, { method: 'xcross' })],
    });

    render(
      <SolverAssistDialog
        copy={copy}
        eventId="333"
        open
        scramble="R U"
        service={service}
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(solve).toHaveBeenCalledWith('333', 'xcross', 'R U');
    });
    expect(solve).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole('combobox', { name: copy.solverAssistMethodLabel }), {
      target: { value: 'cfop-f2l' },
    });

    await waitFor(() => {
      expect(solve).toHaveBeenLastCalledWith('333', 'cfop-f2l', 'R U');
    });
    expect(JSON.parse(localStorage.getItem('cubegin-solver-assist-methods')!)).toMatchObject({
      '333': 'cfop-f2l',
    });
  });
});
