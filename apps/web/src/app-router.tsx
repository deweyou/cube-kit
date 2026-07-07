import { useEffect, useState } from 'react';
import { getAppRoute, type AppRoute } from './app-routes';
import { AppPlaceholderPage } from './app-placeholder-page';
import { TimerV2Page } from './timer-v2/timer-v2-page';

export { APP_ROUTE_PATHS, getAppRoute, getAppRoutePath, navigateToAppRoute } from './app-routes';

const getCurrentPathname = () => window.location.pathname;

const renderAppRoute = (route: AppRoute) => {
  switch (route) {
    case 'results':
      return <AppPlaceholderPage route="results" />;
    case 'formulas':
      return <AppPlaceholderPage route="formulas" />;
    case 'settings':
      return <AppPlaceholderPage route="settings" />;
    case 'timer':
      return <TimerV2Page />;
  }
};

export const AppRouter = () => {
  const [pathname, setPathname] = useState(getCurrentPathname);

  useEffect(() => {
    const handlePopState = () => setPathname(getCurrentPathname());

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return renderAppRoute(getAppRoute(pathname));
};
