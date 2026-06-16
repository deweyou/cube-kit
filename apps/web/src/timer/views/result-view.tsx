import { useCallback, useEffect, useState, type ChangeEvent, type MouseEvent } from 'react';
import { ElapsedDisplay } from '../components/elapsed-display';
import { ResultActions } from '../components/result-actions';
import type { TimerMessages } from '../timer-i18n';
import styles from './result-view.module.css';

interface ResultViewProps {
  elapsed: number;
  messages: TimerMessages;
  multiBlindAttemptedCount?: number;
  isAutoDnf?: boolean;
  onContinue: (multiBlindSolvedCount?: number) => void;
  onPlusTwo: () => void;
  onDnf: (multiBlindSolvedCount?: number) => void;
  onDelete: () => void;
}

export const ResultView = ({
  elapsed,
  messages,
  multiBlindAttemptedCount,
  isAutoDnf = false,
  onContinue,
  onPlusTwo,
  onDnf,
  onDelete,
}: ResultViewProps) => {
  const isMultiBlindResult = typeof multiBlindAttemptedCount === 'number';
  const [multiBlindSolvedCountDraft, setMultiBlindSolvedCountDraft] = useState(
    String(multiBlindAttemptedCount ?? 0),
  );
  const parsedMultiBlindSolvedCount = Number(multiBlindSolvedCountDraft);
  const isMultiBlindSolvedCountValid =
    !isMultiBlindResult ||
    (multiBlindSolvedCountDraft.length > 0 &&
      Number.isSafeInteger(parsedMultiBlindSolvedCount) &&
      parsedMultiBlindSolvedCount >= 0 &&
      parsedMultiBlindSolvedCount <= (multiBlindAttemptedCount ?? 0));

  useEffect(() => {
    setMultiBlindSolvedCountDraft(String(multiBlindAttemptedCount ?? 0));
  }, [multiBlindAttemptedCount]);

  const getMultiBlindSolvedCount = useCallback(() => {
    return isMultiBlindSolvedCountValid ? parsedMultiBlindSolvedCount : undefined;
  }, [isMultiBlindSolvedCountValid, parsedMultiBlindSolvedCount]);

  const handleContinue = useCallback(() => {
    if (!isMultiBlindSolvedCountValid) return;
    onContinue(isMultiBlindResult ? getMultiBlindSolvedCount() : undefined);
  }, [getMultiBlindSolvedCount, isMultiBlindResult, isMultiBlindSolvedCountValid, onContinue]);

  const handleDnf = useCallback(() => {
    if (!isMultiBlindSolvedCountValid) return;
    onDnf(isMultiBlindResult ? getMultiBlindSolvedCount() : undefined);
  }, [getMultiBlindSolvedCount, isMultiBlindResult, isMultiBlindSolvedCountValid, onDnf]);

  const handleSolvedCountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setMultiBlindSolvedCountDraft(event.target.value.replace(/\D/gu, ''));
  }, []);

  const handleRootClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest(`.${styles.footer}`)) return;
    handleContinue();
  };

  return (
    <div className={styles.root} onClick={handleRootClick}>
      <div className={styles.time}>
        <ElapsedDisplay ms={elapsed} decimals={3} />
      </div>
      {isMultiBlindResult && (
        <div className={styles.multiBlindResult} onClick={(event) => event.stopPropagation()}>
          <label className={styles.multiBlindSolvedField}>
            <span>{messages.multiBlindSolvedCount}</span>
            <input
              aria-label={messages.multiBlindSolvedCount}
              className={styles.multiBlindSolvedInput}
              inputMode="numeric"
              max={multiBlindAttemptedCount}
              min={0}
              pattern="[0-9]*"
              type="text"
              value={multiBlindSolvedCountDraft}
              aria-invalid={!isMultiBlindSolvedCountValid}
              onChange={handleSolvedCountChange}
            />
          </label>
          <span
            className={
              isMultiBlindSolvedCountValid
                ? styles.multiBlindSolvedHint
                : styles.multiBlindSolvedError
            }
          >
            {isMultiBlindSolvedCountValid
              ? messages.multiBlindSolvedCountHint(multiBlindAttemptedCount)
              : messages.multiBlindSolvedCountInvalid(multiBlindAttemptedCount)}
          </span>
          {isAutoDnf && (
            <span className={styles.multiBlindAutoDnf}>{messages.multiBlindAutoDnf}</span>
          )}
        </div>
      )}

      <footer className={styles.footer}>
        <ResultActions
          continueLabel={messages.continue}
          deleteLabel={messages.delete}
          isContinueDisabled={!isMultiBlindSolvedCountValid}
          isDnfDisabled={!isMultiBlindSolvedCountValid}
          resultSelectionLabel={messages.resultSelection}
          showPlusTwo={!isMultiBlindResult}
          onContinue={handleContinue}
          onPlusTwo={onPlusTwo}
          onDnf={handleDnf}
          onDelete={onDelete}
        />
      </footer>
    </div>
  );
};
