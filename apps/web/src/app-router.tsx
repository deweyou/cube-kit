import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { APP_ROUTE_PATHS, getAppRoute } from './app-routes';

export { APP_ROUTE_PATHS, getAppRoute, getAppRoutePath } from './app-routes';

const AppPlaceholderPage = lazy(() =>
  import('./app-placeholder-page').then(({ AppPlaceholderPage }) => ({
    default: AppPlaceholderPage,
  })),
);

const TimerPage = lazy(() =>
  import('./timer/timer-page').then(({ TimerPage }) => ({
    default: TimerPage,
  })),
);

const ResultsPage = lazy(() =>
  import('./results/results-page').then(({ ResultsPage }) => ({
    default: ResultsPage,
  })),
);

const SettingsPage = lazy(() =>
  import('./settings/settings-page').then(({ SettingsPage }) => ({
    default: SettingsPage,
  })),
);

const KeepAliveTimerRoute = () => {
  const location = useLocation();
  const activeRoute = getAppRoute(location.pathname);
  const shouldMountTimer = activeRoute === 'timer' || activeRoute === 'settings';

  return (
    <>
      {shouldMountTimer ? <TimerPage isActive={activeRoute === 'timer'} /> : null}
      <Routes>
        <Route path={APP_ROUTE_PATHS.timer} element={null} />
        <Route path={APP_ROUTE_PATHS.results} element={<ResultsPage />} />
        <Route path={APP_ROUTE_PATHS.formulas} element={<AppPlaceholderPage route="formulas" />} />
        <Route path={APP_ROUTE_PATHS.settings} element={<SettingsPage />} />
        <Route path="*" element={<Navigate to={APP_ROUTE_PATHS.timer} replace />} />
      </Routes>
    </>
  );
};

export const AppRouter = () => (
  <BrowserRouter>
    <Suspense fallback={null}>
      <KeepAliveTimerRoute />
    </Suspense>
  </BrowserRouter>
);
