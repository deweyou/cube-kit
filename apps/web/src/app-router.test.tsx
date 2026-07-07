import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_PREFERENCES } from '@cubegin/shared/preferences';
import { APP_ROUTE_PATHS, AppRouter, getAppRoute } from './app-router';
import { AppPreferencesProvider } from './preferences/app-preferences';

const timerPageMock = vi.hoisted(() => ({
  mountedCount: 0,
}));

vi.mock('./timer/timer-page', async () => {
  const { useState } = await vi.importActual<typeof import('react')>('react');

  return {
    TimerPage: ({ isActive = true }: { isActive?: boolean }) => {
      const [scramble] = useState(() => {
        timerPageMock.mountedCount += 1;
        return `scramble-${timerPageMock.mountedCount}`;
      });

      return (
        <div data-active={isActive ? 'true' : 'false'} data-testid="timer-page" hidden={!isActive}>
          <span data-testid="timer-scramble">{scramble}</span>
        </div>
      );
    },
  };
});

vi.mock('./settings/settings-page', () => ({
  SettingsPage: () => (
    <div data-testid="settings-page">
      <h1>设置</h1>
      <section aria-label="settings-page-marker">常规</section>
    </div>
  ),
}));

const setPathname = (pathname: string) => {
  window.history.pushState({}, '', pathname);
};

const navigatePathname = (pathname: string) => {
  window.history.pushState({}, '', pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const setNavigatorLanguages = (languages: string[]) => {
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: languages,
  });
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: languages[0] ?? '',
  });
};

const renderAppRouter = () =>
  render(
    <AppPreferencesProvider>
      <AppRouter />
    </AppPreferencesProvider>,
  );

beforeEach(() => {
  timerPageMock.mountedCount = 0;
  setNavigatorLanguages(['zh-CN']);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  setPathname('/');
});

describe('AppRouter', () => {
  it('renders the redesigned timer at the root route', async () => {
    setPathname(APP_ROUTE_PATHS.timer);

    renderAppRouter();

    expect(await screen.findByTestId('timer-page')).toBeTruthy();
  });

  it('renders placeholder routes for results and formulas', async () => {
    const expectedRoutes = [
      { path: APP_ROUTE_PATHS.results, title: '成绩列表', route: 'results' },
      { path: APP_ROUTE_PATHS.formulas, title: '公式库', route: 'formulas' },
    ] as const;

    for (const { path, route, title } of expectedRoutes) {
      cleanup();
      setPathname(path);

      renderAppRouter();

      expect(await screen.findByRole('heading', { name: title })).toBeTruthy();
      expect(getAppRoute(path)).toBe(route);

      const activeNavButton = within(screen.getByRole('navigation', { name: '主导航' })).getByRole(
        'button',
        { current: 'page' },
      );
      expect(activeNavButton.getAttribute('aria-label')).toBe(title);
    }
  });

  it('renders the settings page route instead of the placeholder', async () => {
    setPathname(APP_ROUTE_PATHS.settings);

    renderAppRouter();

    expect(await screen.findByTestId('settings-page')).toBeTruthy();
    expect(screen.getByLabelText('settings-page-marker')).toBeTruthy();
    expect(getAppRoute(APP_ROUTE_PATHS.settings)).toBe('settings');
  });

  it('keeps the timer page mounted while visiting settings', async () => {
    setPathname(APP_ROUTE_PATHS.timer);

    renderAppRouter();

    const initialScramble = await screen.findByTestId('timer-scramble');
    expect(initialScramble.textContent).toBe('scramble-1');

    navigatePathname(APP_ROUTE_PATHS.settings);

    await waitFor(() => expect(window.location.pathname).toBe(APP_ROUTE_PATHS.settings));
    expect(await screen.findByTestId('settings-page')).toBeTruthy();

    const hiddenTimerPage = screen.getByTestId('timer-page');
    expect(hiddenTimerPage.getAttribute('data-active')).toBe('false');
    expect((hiddenTimerPage as HTMLElement).hidden).toBe(true);
    expect(screen.getByTestId('timer-scramble').textContent).toBe('scramble-1');
    expect(timerPageMock.mountedCount).toBe(1);

    navigatePathname(APP_ROUTE_PATHS.timer);

    await waitFor(() => expect(window.location.pathname).toBe(APP_ROUTE_PATHS.timer));
    expect(screen.getByTestId('timer-page').getAttribute('data-active')).toBe('true');
    expect(screen.getByTestId('timer-scramble').textContent).toBe('scramble-1');
    expect(timerPageMock.mountedCount).toBe(1);
  });

  it('lets placeholder navigation switch routes', async () => {
    setPathname(APP_ROUTE_PATHS.results);

    renderAppRouter();

    fireEvent.click(screen.getByRole('button', { name: '设置' }));

    await waitFor(() => expect(window.location.pathname).toBe(APP_ROUTE_PATHS.settings));
    expect(await screen.findByTestId('settings-page')).toBeTruthy();
  });

  it('falls back to the redesigned timer page for unknown paths', async () => {
    expect(getAppRoute('/unknown')).toBe('timer');

    setPathname('/unknown');

    renderAppRouter();

    await waitFor(() => expect(window.location.pathname).toBe(APP_ROUTE_PATHS.timer));
    expect(await screen.findByTestId('timer-page')).toBeTruthy();
  });

  it('localizes placeholder routes and primary navigation when language is forced English', async () => {
    localStorage.setItem(
      'cubegin-app-preferences',
      JSON.stringify({ ...DEFAULT_APP_PREFERENCES, language: 'en' }),
    );
    setPathname(APP_ROUTE_PATHS.results);

    renderAppRouter();

    expect(await screen.findByRole('heading', { name: 'Results' })).toBeTruthy();
    expect(
      within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByRole('button', {
        name: 'Settings',
      }),
    ).toBeTruthy();
  });
});
