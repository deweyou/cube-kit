import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAppCopy } from '../../preferences/app-copy';
import {
  FewestMovesWorkspace,
  applyFewestMovesEditorAction,
  appendFewestMovesKey,
  getFewestMovesCellCount,
} from './fewest-moves-workspace';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('appendFewestMovesKey', () => {
  it('appends complete move tokens', () => {
    expect(appendFewestMovesKey('', 'R')).toBe('R');
    expect(appendFewestMovesKey('R', 'U')).toBe('R U');
    expect(appendFewestMovesKey('R U', "F'")).toBe("R U F'");
    expect(appendFewestMovesKey("R U F'", 'D2')).toBe("R U F' D2");
  });
});

describe('getFewestMovesCellCount', () => {
  it('starts with two ten-cell rows and adds a row after input reaches the last row', () => {
    expect(getFewestMovesCellCount('')).toBe(20);
    expect(getFewestMovesCellCount('R '.repeat(10))).toBe(20);
    expect(getFewestMovesCellCount('R '.repeat(11))).toBe(30);
  });
});

describe('applyFewestMovesEditorAction', () => {
  it('inserts at the cursor and replaces an explicitly selected token', () => {
    expect(
      applyFewestMovesEditorAction(
        'R U',
        { cursorIndex: 1, selectedTokenIndex: null },
        {
          type: 'base',
          token: 'F',
        },
      ),
    ).toEqual({
      solution: 'R F U',
      state: { cursorIndex: 2, selectedTokenIndex: null },
    });

    expect(
      applyFewestMovesEditorAction(
        'R U',
        { cursorIndex: 1, selectedTokenIndex: 0 },
        {
          type: 'base',
          token: 'F',
        },
      ),
    ).toEqual({
      solution: 'F U',
      state: { cursorIndex: 1, selectedTokenIndex: null },
    });
  });

  it('toggles shared modifiers on the selected or preceding token', () => {
    const initialState = { cursorIndex: 1, selectedTokenIndex: null };
    const prime = applyFewestMovesEditorAction('U', initialState, {
      type: 'modifier',
      suffix: "'",
    });
    expect(prime.solution).toBe("U'");
    expect(
      applyFewestMovesEditorAction(prime.solution, prime.state, {
        type: 'modifier',
        suffix: "'",
      }).solution,
    ).toBe('U');
    expect(
      applyFewestMovesEditorAction('U', initialState, { type: 'modifier', suffix: '2' }).solution,
    ).toBe('U2');
  });

  it('moves the cursor and deletes selected, preceding, or following tokens', () => {
    expect(
      applyFewestMovesEditorAction(
        'R U F',
        { cursorIndex: 2, selectedTokenIndex: 1 },
        {
          type: 'delete-backward',
        },
      ),
    ).toEqual({
      solution: 'R F',
      state: { cursorIndex: 1, selectedTokenIndex: null },
    });
    expect(
      applyFewestMovesEditorAction(
        'R U F',
        { cursorIndex: 1, selectedTokenIndex: null },
        {
          type: 'delete-forward',
        },
      ).solution,
    ).toBe('R F');
    expect(
      applyFewestMovesEditorAction(
        'R U F',
        { cursorIndex: 2, selectedTokenIndex: null },
        {
          type: 'move-cursor',
          direction: 'left',
        },
      ).state.cursorIndex,
    ).toBe(1);
  });
});

describe('FewestMovesWorkspace', () => {
  const copy = getAppCopy('zh-CN').timer;

  it('keeps scramble, image, and editor out of the sealed DOM', () => {
    render(
      <FewestMovesWorkspace
        copy={copy}
        elapsedText="60:00"
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onInverseDecision={vi.fn()}
        onSolutionChange={vi.fn()}
        onStart={vi.fn()}
        onSubmit={vi.fn()}
        phase="sealed"
        reviewDecision={null}
        scramble="SECRET SCRAMBLE"
        solution=""
        svg="<svg />"
        validation={null}
      />,
    );

    expect(screen.getByText('60:00')).toBeTruthy();
    expect(screen.queryByText(copy.fewestMovesTitle)).toBeNull();
    expect(screen.queryByText(copy.fewestMovesStart)).toBeNull();
    expect(screen.queryByText('SECRET SCRAMBLE')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByLabelText(copy.scrambleImageLabel)).toBeNull();
  });

  it('exposes the shared ready state on the sealed countdown', () => {
    render(
      <FewestMovesWorkspace
        copy={copy}
        elapsedText="60:00"
        isArmed
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onInverseDecision={vi.fn()}
        onSolutionChange={vi.fn()}
        onStart={vi.fn()}
        onSubmit={vi.fn()}
        phase="sealed"
        reviewDecision={null}
        scramble="SECRET SCRAMBLE"
        solution=""
        svg="<svg />"
        validation={null}
      />,
    );

    expect(screen.getByRole('button', { name: copy.fewestMovesStart }).dataset.armed).toBe('true');
  });

  it('supports editable tokens and keeps the compact move keyboard available during an attempt', () => {
    const onSubmit = vi.fn();
    const onOpenSolverAssist = vi.fn();
    const Harness = () => {
      const [solution, setSolution] = useState('R');
      return (
        <FewestMovesWorkspace
          copy={copy}
          elapsedText="59:58"
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onInverseDecision={vi.fn()}
          onOpenSolverAssist={onOpenSolverAssist}
          onSolutionChange={setSolution}
          onStart={vi.fn()}
          onSubmit={onSubmit}
          phase="attempt"
          reviewDecision={null}
          scramble="R U"
          solution={solution}
          svg="<svg />"
          validation={null}
        />
      );
    };
    render(<Harness />);

    expect(screen.getByText('R U')).toBeTruthy();
    expect(
      screen.getAllByRole('textbox', { name: new RegExp(copy.fewestMovesSolutionLabel, 'u') }),
    ).toHaveLength(1);
    const activeCell = screen.getByRole('textbox', { name: copy.fewestMovesSolutionLabel });
    expect(activeCell).toBeTruthy();
    expect(activeCell.tagName).toBe('DIV');
    expect(activeCell.getAttribute('contenteditable')).toBeNull();
    expect(activeCell.getAttribute('inputmode')).toBe('none');
    expect(screen.getByText(copy.fewestMovesSolutionLabel)).toBeTruthy();
    expect(screen.getByText(`${copy.fewestMovesTotalMoves} --`)).toBeTruthy();
    expect(screen.queryByText(copy.fewestMovesRemaining)).toBeNull();
    expect(screen.queryByText(/OBTM|ETM/u)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: copy.solverAssistOpen }));
    expect(onOpenSolverAssist).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('button', {
        name: `${copy.fewestMovesCollapseScramble} ${copy.currentScrambleLabel}`,
      }),
    ).toBeTruthy();
    expect(screen.queryByText(copy.fewestMovesExpandScramble)).toBeNull();
    expect(screen.getByRole('button', { name: /^U$/u })).toBeTruthy();
    expect(screen.queryByText('DNF')).toBeNull();
    expect(screen.getByRole('button', { name: /^'$/u })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^2$/u })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^U'$/u })).toBeNull();
    expect(screen.queryByRole('button', { name: /^U2$/u })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Uw' })).toBeNull();
    const keyboard = screen.getByRole('region', { name: copy.fewestMovesSolutionLabel });
    const submitButton = screen.getByRole('button', { name: copy.fewestMovesSubmit });
    expect(keyboard.contains(submitButton)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /^U$/u }));
    expect(
      screen.getByRole('button', { name: `${copy.fewestMovesSolutionLabel} 2 U` }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^'$/u }));
    expect(
      screen.getByRole('button', { name: `${copy.fewestMovesSolutionLabel} 2 U'` }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: `${copy.fewestMovesSolutionLabel} 1 R` }));
    fireEvent.click(screen.getByRole('button', { name: /^F$/u }));
    expect(
      screen.getByRole('button', { name: `${copy.fewestMovesSolutionLabel} 1 F` }),
    ).toBeTruthy();
    fireEvent.click(submitButton);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('keeps the compact move keyboard visible on a coarse mobile viewport', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        media: '(max-width: 700px), (pointer: coarse)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    render(
      <FewestMovesWorkspace
        copy={copy}
        elapsedText="59:58"
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onInverseDecision={vi.fn()}
        onSolutionChange={vi.fn()}
        onStart={vi.fn()}
        onSubmit={vi.fn()}
        phase="attempt"
        reviewDecision={null}
        scramble="R U"
        solution=""
        svg="<svg />"
        validation={null}
      />,
    );

    expect(screen.getByRole('button', { name: /^U$/u })).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: `${copy.fewestMovesCollapseScramble} ${copy.currentScrambleLabel}`,
      }),
    ).toBeTruthy();
  });

  it('collapses the scramble text and image while keeping the countdown visible', () => {
    render(
      <FewestMovesWorkspace
        copy={copy}
        elapsedText="59:58"
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onInverseDecision={vi.fn()}
        onSolutionChange={vi.fn()}
        onStart={vi.fn()}
        onSubmit={vi.fn()}
        phase="attempt"
        reviewDecision={null}
        scramble="R U"
        solution=""
        svg="<svg />"
        validation={null}
      />,
    );

    const collapseButton = screen.getByRole('button', {
      name: `${copy.fewestMovesCollapseScramble} ${copy.currentScrambleLabel}`,
    });
    expect(collapseButton.querySelector('svg')).toBeTruthy();
    fireEvent.click(collapseButton);
    expect(screen.getByText('59:58')).toBeTruthy();
    expect(screen.queryByText('R U')).toBeNull();
    expect(screen.queryByLabelText(copy.scrambleImageLabel)).toBeNull();
    const expandButton = screen.getByRole('button', {
      name: `${copy.fewestMovesExpandScramble} ${copy.currentScrambleLabel}`,
    });
    expect(expandButton.querySelector('svg')).toBeTruthy();
    fireEvent.click(expandButton);
    expect(screen.getByText('R U')).toBeTruthy();
    expect(screen.getByLabelText(copy.scrambleImageLabel)).toBeTruthy();
  });

  it('uses the physical keyboard for cursor insertion and modifier editing', () => {
    const Harness = () => {
      const [solution, setSolution] = useState('R U');
      return (
        <FewestMovesWorkspace
          copy={copy}
          elapsedText="59:58"
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onInverseDecision={vi.fn()}
          onSolutionChange={setSolution}
          onStart={vi.fn()}
          onSubmit={vi.fn()}
          phase="attempt"
          reviewDecision={null}
          scramble="R U"
          solution={solution}
          svg="<svg />"
          validation={null}
        />
      );
    };
    render(<Harness />);

    const editor = screen.getByRole('textbox', { name: copy.fewestMovesSolutionLabel });
    fireEvent.keyDown(editor, { key: 'ArrowLeft' });
    fireEvent.keyDown(editor, { key: 'F' });
    expect(
      screen.getByRole('button', { name: `${copy.fewestMovesSolutionLabel} 2 F` }),
    ).toBeTruthy();
    fireEvent.keyDown(editor, { key: "'" });
    expect(
      screen.getByRole('button', { name: `${copy.fewestMovesSolutionLabel} 2 F'` }),
    ).toBeTruthy();
    fireEvent.keyDown(editor, { key: 'Backspace' });
    expect(
      screen.queryByRole('button', { name: `${copy.fewestMovesSolutionLabel} 2 F'` }),
    ).toBeNull();
  });

  it('keeps only the adjudication choices after a suspected inverse submission', () => {
    const onInverseDecision = vi.fn();
    render(
      <FewestMovesWorkspace
        copy={copy}
        elapsedText="58:30"
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onInverseDecision={onInverseDecision}
        onSolutionChange={vi.fn()}
        onStart={vi.fn()}
        onSubmit={vi.fn()}
        phase="result"
        reviewDecision={null}
        scramble="R U"
        solution="U' R'"
        svg="<svg />"
        validation={{
          executionMoveCount: 2,
          inverseMatchLength: 4,
          moveCount: 2,
          normalizedSolution: "U' R'",
          rawSolution: "U' R'",
          reason: 'inverse-scramble',
          status: 'suspected-inverse',
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: copy.fewestMovesReturnToEdit })).toBeNull();
    expect(screen.queryByRole('button', { name: copy.fewestMovesSaveResult })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: copy.fewestMovesKeepResult }));
    expect(onInverseDecision).toHaveBeenCalledWith('keep');
  });

  it('matches the ordinary stopped surface without formula preview or a start button', () => {
    render(
      <FewestMovesWorkspace
        copy={copy}
        elapsedText="2:05"
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onInverseDecision={vi.fn()}
        onSolutionChange={vi.fn()}
        onStart={vi.fn()}
        onSubmit={vi.fn()}
        phase="stopped"
        reviewDecision={null}
        scramble="R U"
        solution="U' R'"
        svg="<svg />"
        validation={{
          executionMoveCount: 2,
          inverseMatchLength: 0,
          moveCount: 2,
          normalizedSolution: "U' R'",
          rawSolution: "U' R'",
          reason: null,
          status: 'valid',
        }}
      />,
    );

    expect(screen.getByText(`2 ${copy.fewestMovesMoveUnit}`)).toBeTruthy();
    expect(screen.queryByText("U' R'")).toBeNull();
    expect(screen.queryByRole('button', { name: copy.fewestMovesStart })).toBeNull();
    expect(screen.getByRole('toolbar', { name: copy.resultToolbarLabel })).toBeTruthy();
    expect(screen.getByRole('button', { name: copy.editResult })).toBeTruthy();
    expect(screen.getByRole('button', { name: copy.deleteResult })).toBeTruthy();
  });
});
