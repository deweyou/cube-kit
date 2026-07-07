import { CubeginAnimatedIcon } from '@cubegin/icons/react';
import { type AppRoute } from './app-routes';
import { getCubeginWordmarkSvg } from './brand/wordmark';
import { useAppPreferences } from './preferences/app-preferences';
import { TimerTopNavigation } from './timer/timer-navigation';
import styles from './app-placeholder-page.module.css';

type PlaceholderRoute = Exclude<AppRoute, 'timer' | 'settings'>;

interface AppPlaceholderPageProps {
  route: PlaceholderRoute;
}

export const AppPlaceholderPage = ({ route }: AppPlaceholderPageProps) => {
  const { copy, resolvedTheme } = useAppPreferences();
  const placeholderCopy = copy.placeholders[route];
  const wordmarkSvg = getCubeginWordmarkSvg(resolvedTheme);

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <strong className={styles.brand}>
          <CubeginAnimatedIcon size={32} title="Cubegin" trigger="manual" />
          <span
            className={styles.wordmark}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: wordmarkSvg }}
          />
        </strong>
      </header>
      <TimerTopNavigation isHidden={false} />
      <main className={styles.main}>
        <h1 className={styles.title}>{placeholderCopy.title}</h1>
      </main>
    </section>
  );
};
