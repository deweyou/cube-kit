import { useRef, type MouseEvent, type PointerEvent, type TouchEvent } from 'react';
import { Button } from '@deweyou-design/react/button';
import styles from './result-actions.module.css';

interface ResultActionsProps {
  continueLabel: string;
  deleteLabel: string;
  isContinueDisabled?: boolean;
  isDnfDisabled?: boolean;
  resultSelectionLabel: string;
  showPlusTwo?: boolean;
  onContinue: () => void;
  onPlusTwo: () => void;
  onDnf: () => void;
  onDelete: () => void;
}

export const ResultActions = ({
  continueLabel,
  deleteLabel,
  isContinueDisabled = false,
  isDnfDisabled = false,
  resultSelectionLabel,
  showPlusTwo = true,
  onContinue,
  onPlusTwo,
  onDnf,
  onDelete,
}: ResultActionsProps) => {
  const suppressNextClickRef = useRef(false);
  const suppressNextTouchRef = useRef(false);

  const runTouchAction = (
    event: PointerEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    suppressNextClickRef.current = true;
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  const bindAction = (action: () => void) => ({
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.stopPropagation();
      action();
    },
    onTouchEnd: (event: TouchEvent<HTMLButtonElement>) => {
      if (suppressNextTouchRef.current) {
        suppressNextTouchRef.current = false;
        return;
      }
      runTouchAction(event, action);
    },
    onTouchStart: (event: TouchEvent<HTMLButtonElement>) => {
      event.stopPropagation();
    },
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType !== 'mouse') event.stopPropagation();
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse') return;
      suppressNextTouchRef.current = true;
      runTouchAction(event, action);
    },
  });

  return (
    <div className={styles.root}>
      <Button
        className={styles.continueButton}
        variant="link"
        color="neutral"
        size="sm"
        aria-label={continueLabel}
        disabled={isContinueDisabled}
        {...bindAction(onContinue)}
      >
        {continueLabel}
      </Button>
      <div className={styles.penalties} aria-label={resultSelectionLabel}>
        {showPlusTwo && (
          <>
            <span className={styles.separator} aria-hidden>
              ·
            </span>
            <Button
              className={styles.penaltyButton}
              variant="link"
              color="neutral"
              size="sm"
              {...bindAction(onPlusTwo)}
            >
              +2
            </Button>
          </>
        )}
        <span className={styles.separator} aria-hidden>
          ·
        </span>
        <Button
          className={styles.penaltyButton}
          variant="link"
          color="neutral"
          size="sm"
          disabled={isDnfDisabled}
          {...bindAction(onDnf)}
        >
          DNF
        </Button>
        <span className={styles.separator} aria-hidden>
          ·
        </span>
        <Button
          className={styles.deleteButton}
          variant="link"
          color="danger"
          size="sm"
          {...bindAction(onDelete)}
        >
          {deleteLabel}
        </Button>
      </div>
    </div>
  );
};
