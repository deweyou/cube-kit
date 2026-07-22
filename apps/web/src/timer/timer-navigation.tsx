import { useLocation, useNavigate } from 'react-router';
import { FormulaIcon, SettingsIcon, TimeIcon, ViewListIcon } from '@deweyou-design/react-icons';
import { getAppRoute, getAppRoutePath } from '../app-routes';
import { useAppPreferences } from '../preferences/app-preferences';
import styles from './timer-page.module.css';

interface TimerTopNavigationProps {
  isHidden: boolean;
}

const TIMER_NAV_ITEMS = [
  { id: 'timer', labelKey: 'timer', Icon: TimeIcon },
  { id: 'results', labelKey: 'results', Icon: ViewListIcon },
  { id: 'formulas', labelKey: 'formulas', Icon: FormulaIcon },
  { id: 'settings', labelKey: 'settings', Icon: SettingsIcon },
] as const;

export const TimerTopNavigation = ({ isHidden }: TimerTopNavigationProps) => {
  const { copy } = useAppPreferences();
  const location = useLocation();
  const navigate = useNavigate();
  const activeRoute = getAppRoute(location.pathname);

  return (
    <nav
      className={styles.primaryNav}
      aria-label={copy.navigation.ariaLabel}
      aria-hidden={isHidden ? 'true' : undefined}
      data-hidden={isHidden ? 'true' : undefined}
    >
      {TIMER_NAV_ITEMS.map(({ id, labelKey, Icon }) => {
        const isActive = id === activeRoute;
        const label = copy.navigation[labelKey];

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
