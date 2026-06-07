import styles from './scramble-text.module.css';

interface ScrambleTextProps {
  scramble: string;
  isLoading?: boolean;
}

export const ScrambleText = ({ scramble, isLoading = false }: ScrambleTextProps) => (
  <p className={`${styles.root} ${isLoading ? styles.loading : ''}`}>{scramble}</p>
);
