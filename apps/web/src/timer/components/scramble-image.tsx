import styles from './scramble-image.module.css';

interface ScrambleImageProps {
  svg: string;
}

export const ScrambleImage = ({ svg }: ScrambleImageProps) => (
  <div className={styles.root} data-scramble-image dangerouslySetInnerHTML={{ __html: svg }} />
);
