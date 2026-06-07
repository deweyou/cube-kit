import { ElapsedDisplay } from '../components/elapsed-display';
import { ResultActions } from '../components/result-actions';
import type { TimerMessages } from '../timer-i18n';
import styles from './result-view.module.css';

interface ResultViewProps {
  elapsed: number;
  messages: TimerMessages;
  onContinue: () => void;
  onPlusTwo: () => void;
  onDnf: () => void;
  onDelete: () => void;
}

export const ResultView = ({
  elapsed,
  messages,
  onContinue,
  onPlusTwo,
  onDnf,
  onDelete,
}: ResultViewProps) => {
  return (
    <div className={styles.root}>
      <div className={styles.time}>
        <ElapsedDisplay ms={elapsed} decimals={3} />
      </div>

      <footer className={styles.footer}>
        <ResultActions
          continueLabel={messages.enterToContinue}
          deleteLabel={messages.delete}
          resultSelectionLabel={messages.resultSelection}
          onContinue={onContinue}
          onPlusTwo={onPlusTwo}
          onDnf={onDnf}
          onDelete={onDelete}
        />
      </footer>
    </div>
  );
};
