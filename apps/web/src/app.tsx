import { useMemo } from 'react';
import { AppShell } from './layout/app-shell';
import { AppRouter } from './app-router';
import { AppPreferencesProvider } from './preferences/app-preferences';
import {
  createPerformancePreviewTimerSessionDb,
  shouldUsePerformancePreview,
} from './timer-session/performance-preview-db';
import { TimerSessionStoreProvider } from './timer-session/timer-session-store';

const App = () => {
  const timerSessionDb = useMemo(
    () => (shouldUsePerformancePreview() ? createPerformancePreviewTimerSessionDb() : undefined),
    [],
  );

  return (
    <AppPreferencesProvider>
      <TimerSessionStoreProvider db={timerSessionDb}>
        <AppShell>
          <AppRouter />
        </AppShell>
      </TimerSessionStoreProvider>
    </AppPreferencesProvider>
  );
};

export default App;
