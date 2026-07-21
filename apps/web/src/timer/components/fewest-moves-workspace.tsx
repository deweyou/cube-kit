import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type Ref,
} from 'react';
import type { FewestMovesValidation } from '@cubegin/solver';
import type { AppCopy } from '../../preferences/app-copy';
import { CollapseIcon, DeleteIcon, EditIcon, ExpandIcon } from './timer-icons';
import { ScrambleImage } from './scramble-image';
import styles from './fewest-moves-workspace.module.css';

export type FewestMovesWorkspacePhase = 'sealed' | 'attempt' | 'result' | 'stopped';
export type FewestMovesInverseDecision = 'keep' | 'dnf' | null;

interface FewestMovesWorkspaceProps {
  copy: AppCopy['timer'];
  elapsedText: string;
  isArmed?: boolean;
  isStartDisabled?: boolean;
  phase: FewestMovesWorkspacePhase;
  reviewDecision: FewestMovesInverseDecision;
  scramble: string;
  solution: string;
  svg: string;
  validation: FewestMovesValidation | null;
  onDelete: () => void;
  onEdit: () => void;
  onInverseDecision: (decision: Exclude<FewestMovesInverseDecision, null>) => void;
  onSolutionChange: (solution: string) => void;
  onStart: () => void;
  onSubmit: () => void;
}

const FORMULA_COLUMN_COUNT = 10;
const MIN_FORMULA_ROW_COUNT = 2;
const FACE_KEYS = ['U', 'D', 'L', 'R', 'F', 'B'] as const;
const ROTATION_KEYS = ['x', 'y', 'z'] as const;
const BASE_MOVE_KEYS = [...FACE_KEYS, ...ROTATION_KEYS] as const;
type MoveSuffix = "'" | '2';

export interface FewestMovesEditorState {
  cursorIndex: number;
  selectedTokenIndex: number | null;
}

export type FewestMovesEditorAction =
  | { type: 'base'; token: string }
  | { type: 'modifier'; suffix: MoveSuffix }
  | { type: 'select'; index: number }
  | { type: 'set-cursor'; index: number }
  | { type: 'move-cursor'; direction: 'left' | 'right' | 'home' | 'end' }
  | { type: 'delete-backward' }
  | { type: 'delete-forward' }
  | { type: 'paste'; tokens: string[] };

const tokenizeSolution = (solution: string): string[] => {
  const trimmed = solution.trim();
  return trimmed.length === 0 ? [] : trimmed.split(/\s+/u);
};

const joinSolutionTokens = (tokens: readonly string[]): string =>
  tokens.filter((token) => token.length > 0).join(' ');

const normalizeMoveToken = (value: string): string | null => {
  const token = value.replace(/\s+/gu, '');
  const match = /^([UDLRFBudlrfbxyzXYZ])(['2]?)$/u.exec(token);
  if (match === null) return null;

  const base = FACE_KEYS.includes(match[1].toUpperCase() as (typeof FACE_KEYS)[number])
    ? match[1].toUpperCase()
    : match[1].toLowerCase();
  return `${base}${match[2]}`;
};

const normalizeEditorState = (
  state: FewestMovesEditorState,
  tokenCount: number,
): FewestMovesEditorState => ({
  cursorIndex: Math.max(0, Math.min(state.cursorIndex, tokenCount)),
  selectedTokenIndex:
    state.selectedTokenIndex !== null &&
    state.selectedTokenIndex >= 0 &&
    state.selectedTokenIndex < tokenCount
      ? state.selectedTokenIndex
      : null,
});

export const applyFewestMovesEditorAction = (
  solution: string,
  editorState: FewestMovesEditorState,
  action: FewestMovesEditorAction,
): { solution: string; state: FewestMovesEditorState } => {
  const tokens = tokenizeSolution(solution);
  const state = normalizeEditorState(editorState, tokens.length);
  const finish = (nextState: FewestMovesEditorState = state) => ({
    solution: joinSolutionTokens(tokens),
    state: normalizeEditorState(nextState, tokens.length),
  });

  switch (action.type) {
    case 'base': {
      const token = normalizeMoveToken(action.token);
      if (token === null) return finish();
      if (state.selectedTokenIndex !== null) {
        const replacedIndex = state.selectedTokenIndex;
        tokens[replacedIndex] = token;
        return finish({ cursorIndex: replacedIndex + 1, selectedTokenIndex: null });
      }
      tokens.splice(state.cursorIndex, 0, token);
      return finish({ cursorIndex: state.cursorIndex + 1, selectedTokenIndex: null });
    }
    case 'modifier': {
      const targetIndex = state.selectedTokenIndex ?? state.cursorIndex - 1;
      if (targetIndex < 0 || targetIndex >= tokens.length) return finish();
      const base = tokens[targetIndex].replace(/['2]$/u, '');
      const currentSuffix = tokens[targetIndex].slice(base.length);
      tokens[targetIndex] = `${base}${currentSuffix === action.suffix ? '' : action.suffix}`;
      return finish({ cursorIndex: targetIndex + 1, selectedTokenIndex: null });
    }
    case 'select':
      return finish({ cursorIndex: action.index + 1, selectedTokenIndex: action.index });
    case 'set-cursor':
      return finish({ cursorIndex: action.index, selectedTokenIndex: null });
    case 'move-cursor': {
      if (action.direction === 'home') {
        return finish({ cursorIndex: 0, selectedTokenIndex: null });
      }
      if (action.direction === 'end') {
        return finish({ cursorIndex: tokens.length, selectedTokenIndex: null });
      }
      if (state.selectedTokenIndex !== null) {
        return finish({
          cursorIndex:
            action.direction === 'left' ? state.selectedTokenIndex : state.selectedTokenIndex + 1,
          selectedTokenIndex: null,
        });
      }
      return finish({
        cursorIndex: state.cursorIndex + (action.direction === 'left' ? -1 : 1),
        selectedTokenIndex: null,
      });
    }
    case 'delete-backward': {
      const deleteIndex = state.selectedTokenIndex ?? state.cursorIndex - 1;
      if (deleteIndex < 0 || deleteIndex >= tokens.length) return finish();
      tokens.splice(deleteIndex, 1);
      return finish({ cursorIndex: deleteIndex, selectedTokenIndex: null });
    }
    case 'delete-forward': {
      const deleteIndex = state.selectedTokenIndex ?? state.cursorIndex;
      if (deleteIndex < 0 || deleteIndex >= tokens.length) return finish();
      tokens.splice(deleteIndex, 1);
      return finish({ cursorIndex: deleteIndex, selectedTokenIndex: null });
    }
    case 'paste': {
      const pastedTokens = action.tokens
        .map(normalizeMoveToken)
        .filter((token): token is string => token !== null);
      if (pastedTokens.length === 0) return finish();
      const insertIndex = state.selectedTokenIndex ?? state.cursorIndex;
      tokens.splice(insertIndex, state.selectedTokenIndex === null ? 0 : 1, ...pastedTokens);
      return finish({
        cursorIndex: insertIndex + pastedTokens.length,
        selectedTokenIndex: null,
      });
    }
  }
};

export const getFewestMovesCellCount = (solution: string): number => {
  const tokenCount = tokenizeSolution(solution).length;
  const activeRow = tokenCount === 0 ? 0 : Math.floor((tokenCount - 1) / FORMULA_COLUMN_COUNT);
  return Math.max(
    FORMULA_COLUMN_COUNT * MIN_FORMULA_ROW_COUNT,
    (activeRow + 2) * FORMULA_COLUMN_COUNT,
  );
};

export const appendFewestMovesKey = (solution: string, key: string): string => {
  const trimmed = solution.trimEnd();
  return trimmed.length === 0 ? key : `${trimmed} ${key}`;
};

const getValidationMessage = (
  copy: AppCopy['timer'],
  validation: FewestMovesValidation,
): string => {
  if (validation.status === 'suspected-inverse') return copy.fewestMovesSuspectedInverse;
  switch (validation.reason) {
    case 'syntax':
      return copy.fewestMovesSyntaxError;
    case 'unsolved':
      return copy.fewestMovesUnsolved;
    case 'over-80-etm':
      return copy.fewestMovesOverEtm;
    case 'inverse-scramble':
      return copy.fewestMovesInverse;
    default:
      return copy.fewestMovesValid;
  }
};

const getResultText = (
  copy: AppCopy['timer'],
  validation: FewestMovesValidation | null,
  decision: FewestMovesInverseDecision,
) => {
  if (
    validation === null ||
    validation.status === 'dnf' ||
    (validation.status === 'suspected-inverse' && decision === 'dnf')
  ) {
    return 'DNF';
  }
  return `${validation.moveCount ?? 0} ${copy.fewestMovesMoveUnit}`;
};

export const FewestMovesWorkspace = ({
  copy,
  elapsedText,
  isArmed = false,
  isStartDisabled = false,
  onDelete,
  onEdit,
  onInverseDecision,
  onSolutionChange,
  onStart,
  onSubmit,
  phase,
  reviewDecision,
  scramble,
  solution,
  svg,
  validation,
}: FewestMovesWorkspaceProps) => {
  const editorInputRef = useRef<HTMLDivElement | null>(null);
  const activeVisualCellRef = useRef<HTMLElement | null>(null);
  const countdownRef = useRef<HTMLElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const [isCountdownPinned, setIsCountdownPinned] = useState(false);
  const solutionTokens = tokenizeSolution(solution);
  const [editorState, setEditorState] = useState<FewestMovesEditorState>(() => ({
    cursorIndex: solutionTokens.length,
    selectedTokenIndex: null,
  }));
  const [isScrambleCollapsed, setIsScrambleCollapsed] = useState(false);

  useEffect(() => {
    setEditorState((current) => normalizeEditorState(current, solutionTokens.length));
  }, [solutionTokens.length]);

  useEffect(() => {
    if (phase !== 'attempt') setIsScrambleCollapsed(false);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'attempt') return;

    let frame = 0;
    const revealActiveCell = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        editorInputRef.current?.focus({ preventScroll: true });
        activeVisualCellRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      });
    };

    revealActiveCell();
    window.addEventListener('resize', revealActiveCell);
    window.visualViewport?.addEventListener('resize', revealActiveCell);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', revealActiveCell);
      window.visualViewport?.removeEventListener('resize', revealActiveCell);
    };
  }, [editorState.cursorIndex, editorState.selectedTokenIndex, phase]);

  useEffect(() => {
    if (phase !== 'attempt') {
      setIsCountdownPinned(false);
      return;
    }

    const workspace = workspaceRef.current;
    const countdown = countdownRef.current;
    if (workspace === null || countdown === null) return;

    const updatePinnedCountdown = () => {
      const isSmallViewport =
        window.matchMedia?.('(max-width: 700px)').matches ?? window.innerWidth <= 700;
      const countdownIsAboveWorkspace =
        countdown.getBoundingClientRect().bottom <= workspace.getBoundingClientRect().top;
      setIsCountdownPinned(isSmallViewport && countdownIsAboveWorkspace);
    };

    updatePinnedCountdown();
    workspace.addEventListener('scroll', updatePinnedCountdown, { passive: true });
    window.addEventListener('resize', updatePinnedCountdown);
    return () => {
      workspace.removeEventListener('scroll', updatePinnedCountdown);
      window.removeEventListener('resize', updatePinnedCountdown);
    };
  }, [phase]);

  if (phase === 'sealed') {
    return (
      <main className={styles.sealed} aria-label={copy.fewestMovesTitle}>
        <button
          className={styles.sealedTrigger}
          data-armed={isArmed ? 'true' : undefined}
          disabled={isStartDisabled}
          type="button"
          onClick={onStart}
          aria-keyshortcuts="Space Enter"
          aria-label={copy.fewestMovesStart}
        >
          <strong className={styles.sealedTime}>{elapsedText}</strong>
        </button>
      </main>
    );
  }

  if (phase === 'stopped') {
    return (
      <main
        className={styles.stopped}
        aria-label={copy.fewestMovesTitle}
        data-armed={isArmed ? 'true' : undefined}
      >
        <strong className={styles.resultValue}>
          {getResultText(copy, validation, reviewDecision)}
        </strong>
        <p className={styles.resultMeta}>
          {copy.fewestMovesTimeUsed} {elapsedText}
          {validation?.executionMoveCount === null || validation === null
            ? ''
            : ` · ETM ${validation.executionMoveCount}`}
        </p>
        <div className={styles.iconToolbar} role="toolbar" aria-label={copy.resultToolbarLabel}>
          <button
            type="button"
            aria-label={copy.editResult}
            title={copy.editResult}
            onClick={onEdit}
          >
            <EditIcon size={18} />
          </button>
          <button
            className={styles.deleteButton}
            type="button"
            aria-label={copy.deleteResult}
            title={copy.deleteResult}
            onClick={onDelete}
          >
            <DeleteIcon size={18} />
          </button>
        </div>
      </main>
    );
  }

  const isAttempt = phase === 'attempt';
  const isSuspectedInverse = validation?.status === 'suspected-inverse';
  const formulaCellCount = getFewestMovesCellCount(solution);
  const activeTokenIndex =
    editorState.selectedTokenIndex ??
    (editorState.cursorIndex > 0 ? editorState.cursorIndex - 1 : null);
  const activeToken = activeTokenIndex === null ? null : (solutionTokens[activeTokenIndex] ?? null);
  const activeSuffix: MoveSuffix | '' = activeToken?.endsWith("'")
    ? "'"
    : activeToken?.endsWith('2')
      ? '2'
      : '';

  const focusEditor = () => {
    editorInputRef.current?.focus({ preventScroll: true });
  };

  const applyEditorAction = (action: FewestMovesEditorAction) => {
    const next = applyFewestMovesEditorAction(solution, editorState, action);
    setEditorState(next.state);
    if (next.solution !== solution) onSolutionChange(next.solution);
    window.requestAnimationFrame(() => focusEditor());
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const normalizedToken = normalizeMoveToken(event.key);
    if (normalizedToken !== null) {
      event.preventDefault();
      if (!event.repeat) applyEditorAction({ type: 'base', token: normalizedToken });
      return;
    }

    if (event.key === "'" || event.key === '2') {
      event.preventDefault();
      if (!event.repeat) applyEditorAction({ type: 'modifier', suffix: event.key });
      return;
    }

    const navigationAction: FewestMovesEditorAction | null =
      event.key === 'ArrowLeft'
        ? { type: 'move-cursor', direction: 'left' }
        : event.key === 'ArrowRight'
          ? { type: 'move-cursor', direction: 'right' }
          : event.key === 'Home'
            ? { type: 'move-cursor', direction: 'home' }
            : event.key === 'End'
              ? { type: 'move-cursor', direction: 'end' }
              : event.key === 'Backspace'
                ? { type: 'delete-backward' }
                : event.key === 'Delete'
                  ? { type: 'delete-forward' }
                  : null;
    if (navigationAction !== null) {
      event.preventDefault();
      applyEditorAction(navigationAction);
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') event.preventDefault();
  };

  const handleEditorPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const pastedTokens = event.clipboardData.getData('text').trim().split(/\s+/u);
    if (pastedTokens.every((token) => normalizeMoveToken(token) === null)) return;
    event.preventDefault();
    applyEditorAction({ type: 'paste', tokens: pastedTokens });
  };

  return (
    <main
      ref={workspaceRef}
      className={styles.workspace}
      data-keyboard-visible={isAttempt ? 'true' : undefined}
      aria-label={copy.fewestMovesTitle}
    >
      <section className={styles.scrambleRegion} aria-label={copy.currentScrambleLabel}>
        <div className={styles.scrambleHeader}>
          <strong ref={countdownRef} className={styles.countdown} aria-live="off">
            {elapsedText}
          </strong>
          <button
            className={styles.scrambleToggle}
            type="button"
            aria-label={`${
              isScrambleCollapsed
                ? copy.fewestMovesExpandScramble
                : copy.fewestMovesCollapseScramble
            } ${copy.currentScrambleLabel}`}
            aria-controls="fewest-moves-scramble-content"
            aria-expanded={!isScrambleCollapsed}
            onClick={() => setIsScrambleCollapsed((collapsed) => !collapsed)}
          >
            {isScrambleCollapsed
              ? copy.fewestMovesExpandScramble
              : copy.fewestMovesCollapseScramble}
            {isScrambleCollapsed ? <ExpandIcon size={16} /> : <CollapseIcon size={16} />}
          </button>
        </div>
        {isScrambleCollapsed ? null : (
          <div id="fewest-moves-scramble-content" className={styles.scrambleBody}>
            <p className={styles.scrambleText}>{scramble}</p>
            <aside className={styles.scrambleImage} aria-label={copy.scrambleImageLabel}>
              {svg.length > 0 ? <ScrambleImage eventId="333fm" svg={svg} /> : null}
            </aside>
          </div>
        )}
      </section>

      {isCountdownPinned ? (
        <strong className={styles.pinnedCountdown} aria-hidden="true">
          {elapsedText}
        </strong>
      ) : null}

      <section className={styles.editorRegion}>
        <div className={styles.editorHeading}>
          <span className={styles.editorLabel} id="fewest-moves-solution-label">
            {copy.fewestMovesSolutionLabel}
          </span>
          <span className={styles.totalMoves}>
            {copy.fewestMovesTotalMoves} {validation?.moveCount ?? '--'}
          </span>
        </div>
        {isAttempt ? (
          <div
            ref={editorInputRef}
            className={styles.editorInputProxy}
            aria-label={copy.fewestMovesSolutionLabel}
            aria-multiline="false"
            inputMode="none"
            role="textbox"
            tabIndex={0}
            onKeyDown={handleEditorKeyDown}
            onPaste={handleEditorPaste}
          />
        ) : null}
        <div
          className={styles.formulaGrid}
          role="group"
          aria-labelledby="fewest-moves-solution-label"
          onClick={() => focusEditor()}
        >
          {Array.from({ length: formulaCellCount }, (_, index) => {
            const showsInsertionCell = isAttempt && editorState.selectedTokenIndex === null;
            if (showsInsertionCell && index === editorState.cursorIndex) {
              return (
                <button
                  key={`cursor-${index}`}
                  ref={activeVisualCellRef as Ref<HTMLButtonElement>}
                  className={`${styles.formulaCell} ${styles.formulaCursor}`}
                  type="button"
                  aria-label={`${copy.fewestMovesSolutionLabel} ${index + 1}`}
                  onClick={() => applyEditorAction({ type: 'set-cursor', index })}
                />
              );
            }

            const tokenIndex =
              showsInsertionCell && index > editorState.cursorIndex ? index - 1 : index;
            const token = solutionTokens[tokenIndex];
            if (token !== undefined) {
              const isSelected = editorState.selectedTokenIndex === tokenIndex;
              return (
                <button
                  key={`token-${tokenIndex}`}
                  ref={isSelected ? (activeVisualCellRef as Ref<HTMLButtonElement>) : undefined}
                  className={`${styles.formulaCell} ${styles.formulaToken}`}
                  type="button"
                  data-selected={isSelected ? 'true' : undefined}
                  aria-label={`${copy.fewestMovesSolutionLabel} ${tokenIndex + 1} ${token}`}
                  onClick={() => applyEditorAction({ type: 'select', index: tokenIndex })}
                >
                  {token}
                </button>
              );
            }
            return <span key={index} className={styles.formulaCell} aria-hidden="true" />;
          })}
        </div>
      </section>

      {isAttempt ? (
        <section
          id="fewest-moves-keyboard"
          className={styles.formulaKeyboard}
          aria-label={copy.fewestMovesSolutionLabel}
        >
          {BASE_MOVE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={key}
              onClick={() => applyEditorAction({ type: 'base', token: key })}
            >
              {key}
            </button>
          ))}
          {(["'", '2'] as const).map((suffix) => (
            <button
              key={suffix}
              className={styles.modifierKey}
              type="button"
              aria-label={suffix}
              data-active={activeSuffix === suffix ? 'true' : undefined}
              disabled={activeToken === null}
              onClick={() => applyEditorAction({ type: 'modifier', suffix })}
            >
              {suffix}
            </button>
          ))}
          <button
            className={styles.backspaceKey}
            type="button"
            aria-label="Backspace"
            disabled={solutionTokens.length === 0}
            onClick={() => applyEditorAction({ type: 'delete-backward' })}
          >
            ⌫
          </button>
          <button
            className={styles.submitKey}
            type="button"
            disabled={solution.trim().length === 0}
            onClick={onSubmit}
          >
            {copy.fewestMovesSubmit}
          </button>
        </section>
      ) : (
        <section className={styles.validationPanel} aria-live="polite">
          <strong className={styles.resultValue}>
            {getResultText(copy, validation, reviewDecision)}
          </strong>
          {validation ? <p>{getValidationMessage(copy, validation)}</p> : null}
          <div className={styles.resultActions}>
            {isSuspectedInverse && reviewDecision === null ? (
              <>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => onInverseDecision('keep')}
                >
                  {copy.fewestMovesKeepResult}
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => onInverseDecision('dnf')}
                >
                  {copy.fewestMovesMarkDnf}
                </button>
              </>
            ) : null}
          </div>
        </section>
      )}
    </main>
  );
};
