import { AppShell } from './layout/app-shell';
import { AppRouter } from './app-router';
import { AppPreferencesProvider } from './preferences/app-preferences';

const App = () => (
  <AppPreferencesProvider>
    <AppShell>
      <AppRouter />
    </AppShell>
  </AppPreferencesProvider>
);

export default App;
