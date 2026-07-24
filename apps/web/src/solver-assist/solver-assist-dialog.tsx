import type { PuzzleAssistMethod, PuzzleAssistResult, PuzzleAssistSolution } from '@cubegin/solver';
import { Dialog } from '@deweyou-design/react/dialog';
import { Select } from '@deweyou-design/react/select';
import { move } from '@dnd-kit/helpers';
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppCopy } from '../preferences/app-copy';
import {
  getSolverAssistMethodOption,
  getSolverAssistMethods,
  isSolverAssistMethodForEvent,
  type SolverAssistEventId,
} from './solver-assist-config';
import { orderSolverAssistSolutions } from './solver-assist-ordering';
import {
  readSolverAssistMethod,
  readSolverAssistTargetOrder,
  writeSolverAssistMethod,
  writeSolverAssistTargetOrder,
} from './solver-assist-preferences';
import { createSolverAssistService, type SolverAssistService } from './solver-assist-worker-client';
import styles from './solver-assist-dialog.module.css';

interface SolverAssistDialogProps {
  copy: AppCopy['timer'];
  eventId: SolverAssistEventId;
  open: boolean;
  scramble: string;
  service?: SolverAssistService;
  onOpenChange: (open: boolean) => void;
}

type SolverAssistLoadState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'error' }
  | { readonly result: PuzzleAssistResult; readonly status: 'success' };

interface SolverAssistSelection {
  readonly eventId: SolverAssistEventId;
  readonly method: PuzzleAssistMethod;
}

interface SolverAssistTargetOrdering {
  readonly method: PuzzleAssistMethod;
  readonly targets: string[];
}

interface SolutionRowProps {
  readonly copy: AppCopy['timer'];
  readonly index: number;
  readonly isShortest: boolean;
  readonly presentation: 'alternatives' | 'single' | 'staged';
  readonly solution: PuzzleAssistSolution;
  readonly targetLabel: string;
  readonly dragHandleRef?: (node: HTMLButtonElement | null) => void;
  readonly isDragging?: boolean;
  readonly isDropTarget?: boolean;
  readonly rowRef?: (node: HTMLLIElement | null) => void;
}

const getFormulaText = (solution: PuzzleAssistSolution, emptyFormulaText: string) =>
  [solution.setupRotation, solution.solution].filter(Boolean).join(' ') || emptyFormulaText;

const SolutionRow = ({
  copy,
  dragHandleRef,
  isDragging,
  isDropTarget,
  isShortest,
  presentation,
  rowRef,
  solution,
  targetLabel,
}: SolutionRowProps) => (
  <li
    className={styles.solutionRow}
    data-dragging={isDragging ? 'true' : undefined}
    data-drop-target={isDropTarget ? 'true' : undefined}
    data-shortest={isShortest ? 'true' : undefined}
    ref={rowRef}
  >
    <div className={styles.solutionContent}>
      <div className={styles.solutionHeading}>
        <div className={styles.targetGroup}>
          <strong className={styles.targetLabel}>{targetLabel}</strong>
          {isShortest ? (
            <span className={styles.shortestBadge}>{copy.solverAssistShortest}</span>
          ) : null}
        </div>
        <span className={styles.metric}>{solution.metric.ftm} FTM</span>
      </div>
      {presentation === 'staged' && solution.targetLabel !== targetLabel ? (
        <span className={styles.stageTarget}>{solution.targetLabel}</span>
      ) : null}
      <code className={styles.formula}>
        {getFormulaText(solution, copy.solverAssistEmptyFormula)}
      </code>
    </div>
    {dragHandleRef ? (
      <button
        aria-label={copy.solverAssistReorder.replace('{target}', solution.target)}
        className={styles.dragHandle}
        ref={dragHandleRef}
        title={copy.solverAssistReorder.replace('{target}', solution.target)}
        type="button"
      >
        <span aria-hidden className={styles.dragGrip}>
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} />
          ))}
        </span>
      </button>
    ) : null}
  </li>
);

const SortableSolutionRow = (props: Omit<SolutionRowProps, 'dragHandleRef' | 'rowRef'>) => {
  const sortable = useSortable({
    group: props.solution.method,
    id: props.solution.target,
    index: props.index,
  });

  return (
    <SolutionRow
      {...props}
      dragHandleRef={(node) => sortable.handleRef(node)}
      isDragging={sortable.isDragSource}
      isDropTarget={sortable.isDropTarget}
      rowRef={(node) => sortable.ref(node)}
    />
  );
};

export const SolverAssistDialog = ({
  copy,
  eventId,
  open,
  scramble,
  service,
  onOpenChange,
}: SolverAssistDialogProps) => {
  const internalService = useMemo(
    () => (service ? undefined : createSolverAssistService()),
    [service],
  );
  const activeService = service ?? internalService;
  const [selection, setSelection] = useState<SolverAssistSelection>(() => ({
    eventId,
    method: readSolverAssistMethod(eventId),
  }));
  const selectedMethod =
    selection.eventId === eventId && isSolverAssistMethodForEvent(eventId, selection.method)
      ? selection.method
      : readSolverAssistMethod(eventId);
  const methodOptions = getSolverAssistMethods(eventId);
  const selectedMethodOption = getSolverAssistMethodOption(eventId, selectedMethod);
  const presentation = selectedMethodOption.presentation;
  const [targetOrdering, setTargetOrdering] = useState<SolverAssistTargetOrdering>(() => ({
    method: selectedMethod,
    targets: readSolverAssistTargetOrder(selectedMethod),
  }));
  const [loadState, setLoadState] = useState<SolverAssistLoadState>({ status: 'idle' });
  const [retryRequest, setRetryRequest] = useState(0);
  const [selectPortalContainer, setSelectPortalContainer] = useState<HTMLElement | null>(null);
  const latestRequestId = useRef(0);
  const handlePortalAnchor = useCallback((node: HTMLSpanElement | null) => {
    const positioner = node?.closest<HTMLElement>('[data-scope="dialog"][data-part="positioner"]');
    setSelectPortalContainer(positioner ?? null);
  }, []);

  useEffect(
    () => () => {
      internalService?.dispose?.();
    },
    [internalService],
  );

  useEffect(() => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;

    if (!open || activeService === undefined || scramble.length === 0) {
      setLoadState({ status: 'idle' });
      return;
    }

    setLoadState({ status: 'loading' });
    void activeService
      .solve(eventId, selectedMethod, scramble)
      .then((result) => {
        if (latestRequestId.current !== requestId) return;
        setLoadState({ result, status: 'success' });
      })
      .catch(() => {
        if (latestRequestId.current !== requestId) return;
        setLoadState({ status: 'error' });
      });
  }, [activeService, eventId, open, retryRequest, scramble, selectedMethod]);

  const solutions = loadState.status === 'success' ? loadState.result.solutions : [];
  const preferredTargetOrder =
    targetOrdering.method === selectedMethod
      ? targetOrdering.targets
      : readSolverAssistTargetOrder(selectedMethod);
  const orderedSolutions =
    presentation === 'alternatives'
      ? orderSolverAssistSolutions(solutions, preferredTargetOrder)
      : solutions;
  const shortestFtm =
    presentation === 'alternatives' && orderedSolutions.length > 0
      ? Math.min(...orderedSolutions.map((solution) => solution.metric.ftm))
      : undefined;

  const handleMethodChange = (nextValue: string[]) => {
    const nextMethod = nextValue[0] as PuzzleAssistMethod | undefined;
    if (nextMethod === undefined || !isSolverAssistMethodForEvent(eventId, nextMethod)) return;

    writeSolverAssistMethod(eventId, nextMethod);
    setSelection({ eventId, method: nextMethod });
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (event.canceled) return;

      const currentTargets = orderedSolutions.map((solution) => solution.target);
      const nextTargets = move(currentTargets, event);
      if (nextTargets.every((target, index) => target === currentTargets[index])) return;

      writeSolverAssistTargetOrder(selectedMethod, nextTargets);
      setTargetOrdering({ method: selectedMethod, targets: nextTargets });
    },
    [orderedSolutions, selectedMethod],
  );

  const solutionList =
    loadState.status === 'success' && orderedSolutions.length > 0 ? (
      <ol className={styles.solutionList}>
        {orderedSolutions.map((solution, index) => {
          const isShortest = shortestFtm !== undefined && solution.metric.ftm === shortestFtm;
          const targetLabel =
            presentation === 'staged'
              ? copy.solverAssistStage.replace('{index}', String(index + 1))
              : presentation === 'alternatives'
                ? solution.target
                : solution.targetLabel;
          const rowProps = {
            copy,
            index,
            isShortest,
            presentation,
            solution,
            targetLabel,
          } as const;

          return presentation === 'alternatives' ? (
            <SortableSolutionRow key={solution.target} {...rowProps} />
          ) : (
            <SolutionRow key={`${solution.target}-${index}`} {...rowProps} />
          );
        })}
      </ol>
    ) : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={styles.dialog}>
        <Dialog.Title className={styles.title}>{copy.solverAssistTitle}</Dialog.Title>
        <Dialog.CloseButton className={styles.closeButton} aria-label={copy.solverAssistClose} />
        <span ref={handlePortalAnchor} hidden />

        {methodOptions.length === 1 ? (
          <h3 className={styles.methodTitle}>{selectedMethodOption.label}</h3>
        ) : (
          <div className={styles.methodSelectField}>
            <Select.Root
              className={styles.methodSelect}
              label={copy.solverAssistMethodLabel}
              value={[selectedMethod]}
              onValueChange={handleMethodChange}
            >
              <Select.Trigger className={styles.methodSelectTrigger} />
              <Select.Content
                className={styles.methodSelectContent}
                portalContainer={selectPortalContainer}
              >
                {methodOptions.map((option) => (
                  <Select.Item
                    className={styles.methodSelectItem}
                    key={option.method}
                    label={option.label}
                    value={option.method}
                  />
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        )}

        <div className={styles.resultRegion} aria-live="polite">
          {loadState.status === 'idle' || loadState.status === 'loading' ? (
            <p className={styles.stateMessage}>{copy.solverAssistLoading}</p>
          ) : null}
          {loadState.status === 'error' ? (
            <div className={styles.errorState}>
              <p className={styles.stateMessage}>{copy.solverAssistError}</p>
              <button
                className={styles.retryButton}
                type="button"
                onClick={() => setRetryRequest((request) => request + 1)}
              >
                {copy.solverAssistRetry}
              </button>
            </div>
          ) : null}
          {loadState.status === 'success' && orderedSolutions.length === 0 ? (
            <p className={styles.stateMessage}>{copy.solverAssistNoSolutions}</p>
          ) : null}
          {solutionList && presentation === 'alternatives' ? (
            <DragDropProvider onDragEnd={handleDragEnd}>{solutionList}</DragDropProvider>
          ) : (
            solutionList
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
};
