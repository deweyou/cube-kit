import styles from './scramble-text.module.css';

interface ScrambleTextProps {
  scramble: string;
  isLoading?: boolean;
}

export const ScrambleText = ({ scramble, isLoading = false }: ScrambleTextProps) => {
  const density = getScrambleDensity(scramble);

  return (
    <p
      className={`${styles.root} ${styles[density]} ${isLoading ? styles.loading : ''}`}
      data-density={density}
    >
      {scramble}
    </p>
  );
};

const getScrambleDensity = (scramble: string) => {
  const moveCount = scramble.trim().split(/\s+/u).filter(Boolean).length;

  if (moveCount >= 70) {
    return 'dense';
  }

  if (moveCount >= 36) {
    return 'compact';
  }

  return 'regular';
};
