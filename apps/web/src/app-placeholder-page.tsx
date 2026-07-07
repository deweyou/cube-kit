import { BRAND_ICON_SVGS } from '@cubegin/icons/brand';
import { CubeginAnimatedIcon } from '@cubegin/icons/react';
import { type AppRoute } from './app-routes';
import { TimerV2TopNavigation } from './timer-v2/timer-v2-navigation';
import styles from './app-placeholder-page.module.css';

type PlaceholderRoute = Exclude<AppRoute, 'timer'>;

interface AppPlaceholderPageProps {
  route: PlaceholderRoute;
}

const PLACEHOLDER_TITLES: Record<PlaceholderRoute, string> = {
  results: '成绩列表',
  formulas: '公式库',
  settings: '设置',
};

const wordmarkSvg = BRAND_ICON_SVGS['cubegin-wordmark'];

export const AppPlaceholderPage = ({ route }: AppPlaceholderPageProps) => (
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
    <TimerV2TopNavigation activeRoute={route} isHidden={false} />
    <main className={styles.main}>
      <h1 className={styles.title}>{PLACEHOLDER_TITLES[route]}</h1>
    </main>
  </section>
);
