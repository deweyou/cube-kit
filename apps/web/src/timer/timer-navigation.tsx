import { useLocation, useNavigate } from 'react-router';
import { getAppRoute, getAppRoutePath } from '../app-routes';
import {
  FormulaStudyNavIcon,
  ResultsListNavIcon,
  SettingsGearNavIcon,
  TimerNavIcon,
} from './components/timer-icons';
import styles from './timer-page.module.css';

interface TimerTopNavigationProps {
  isHidden: boolean;
}

const TIMER_NAV_ITEMS = [
  { id: 'timer', label: '计时器', Icon: TimerNavIcon },
  { id: 'results', label: '成绩列表', Icon: ResultsListNavIcon },
  { id: 'formulas', label: '公式库', Icon: FormulaStudyNavIcon },
  { id: 'settings', label: '设置', Icon: SettingsGearNavIcon },
] as const;

export const TimerTopNavigation = ({ isHidden }: TimerTopNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeRoute = getAppRoute(location.pathname);

  return (
    <nav
      className={styles.primaryNav}
      aria-label="主导航"
      aria-hidden={isHidden ? 'true' : undefined}
      data-hidden={isHidden ? 'true' : undefined}
    >
      {TIMER_NAV_ITEMS.map(({ id, label, Icon }) => {
        const isActive = id === activeRoute;

        return (
          <button
            key={id}
            className={styles.navButton}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
            data-active={isActive ? 'true' : undefined}
            tabIndex={isHidden ? -1 : undefined}
            title={label}
            onClick={() => navigate(getAppRoutePath(id))}
          >
            <Icon size={22} />
          </button>
        );
      })}
    </nav>
  );
};
