import { Button } from '@deweyou-design/react/button';
import styles from './result-actions.module.css';

interface ResultActionsProps {
  continueLabel: string;
  deleteLabel: string;
  resultSelectionLabel: string;
  onContinue: () => void;
  onPlusTwo: () => void;
  onDnf: () => void;
  onDelete: () => void;
}

export const ResultActions = ({
  continueLabel,
  deleteLabel,
  resultSelectionLabel,
  onContinue,
  onPlusTwo,
  onDnf,
  onDelete,
}: ResultActionsProps) => (
  <div className={styles.root}>
    <Button
      className={styles.continueButton}
      variant="link"
      color="neutral"
      size="sm"
      onClick={onContinue}
      aria-label={continueLabel}
    >
      {continueLabel}
    </Button>
    <div className={styles.penalties} aria-label={resultSelectionLabel}>
      <span className={styles.separator} aria-hidden>
        ·
      </span>
      <Button className={styles.penaltyButton} variant="link" color="neutral" size="sm" onClick={onPlusTwo}>
        +2
      </Button>
      <span className={styles.separator} aria-hidden>
        ·
      </span>
      <Button className={styles.penaltyButton} variant="link" color="neutral" size="sm" onClick={onDnf}>
        DNF
      </Button>
      <span className={styles.separator} aria-hidden>
        ·
      </span>
      <Button className={styles.deleteButton} variant="link" color="danger" size="sm" onClick={onDelete}>
        {deleteLabel}
      </Button>
    </div>
  </div>
);
