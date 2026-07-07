import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { APP_ROUTE_PATHS } from './app-routes';

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

export const AppRouter = () => (
  <BrowserRouter>
    <Suspense fallback={null}>
      <Routes>
        <Route path={APP_ROUTE_PATHS.timer} element={<TimerPage />} />
        <Route path={APP_ROUTE_PATHS.results} element={<AppPlaceholderPage route="results" />} />
        <Route path={APP_ROUTE_PATHS.formulas} element={<AppPlaceholderPage route="formulas" />} />
        <Route path={APP_ROUTE_PATHS.settings} element={<AppPlaceholderPage route="settings" />} />
        <Route path="*" element={<Navigate to={APP_ROUTE_PATHS.timer} replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
