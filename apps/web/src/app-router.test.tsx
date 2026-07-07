import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_ROUTE_PATHS, AppRouter, getAppRoute } from './app-router';

vi.mock('./timer/timer-page', () => ({
  TimerPage: () => <div data-testid="timer-page" />,
}));

const setPathname = (pathname: string) => {
  window.history.pushState({}, '', pathname);
};

afterEach(() => {
  cleanup();
  setPathname('/');
});

describe('AppRouter', () => {
  it('renders the redesigned timer at the root route', () => {
    setPathname(APP_ROUTE_PATHS.timer);

    render(<AppRouter />);

    expect(screen.getByTestId('timer-page')).toBeTruthy();
  });

  it('renders placeholder routes for results, formulas, and settings', () => {
    const expectedRoutes = [
      { path: APP_ROUTE_PATHS.results, title: '成绩列表', route: 'results' },
      { path: APP_ROUTE_PATHS.formulas, title: '公式库', route: 'formulas' },
      { path: APP_ROUTE_PATHS.settings, title: '设置', route: 'settings' },
    ] as const;

    for (const { path, route, title } of expectedRoutes) {
      cleanup();
      setPathname(path);

      render(<AppRouter />);

      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
      expect(getAppRoute(path)).toBe(route);

      const activeNavButton = within(screen.getByRole('navigation', { name: '主导航' })).getByRole(
        'button',
        { current: 'page' },
      );
      expect(activeNavButton.getAttribute('aria-label')).toBe(title);
    }
  });

  it('lets placeholder navigation switch routes', () => {
    setPathname(APP_ROUTE_PATHS.results);

    render(<AppRouter />);

    fireEvent.click(screen.getByRole('button', { name: '设置' }));

    expect(window.location.pathname).toBe(APP_ROUTE_PATHS.settings);
    expect(screen.getByRole('heading', { name: '设置' })).toBeTruthy();
  });

  it('falls back to the redesigned timer page for unknown paths', () => {
    expect(getAppRoute('/unknown')).toBe('timer');
  });
});
