import styles from './scramble-image.module.css';

interface ScrambleImageProps {
  svg: string;
}

export const ScrambleImage = ({ svg }: ScrambleImageProps) => (
  <div className={styles.root} dangerouslySetInnerHTML={{ __html: svg }} />
);
