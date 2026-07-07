export const APP_ROUTE_PATHS = {
  timer: '/',
  results: '/results',
  formulas: '/formulas',
  settings: '/settings',
} as const;

export type AppRoute = keyof typeof APP_ROUTE_PATHS;

const ROUTES_BY_PATH = new Map<string, AppRoute>(
  Object.entries(APP_ROUTE_PATHS).map(([route, path]) => [path, route as AppRoute]),
);

const normalizePathname = (pathname: string) => {
  if (pathname === '') return '/';
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
};

export const getAppRoute = (pathname: string): AppRoute => {
  const normalizedPathname = normalizePathname(pathname);
  return ROUTES_BY_PATH.get(normalizedPathname) ?? 'timer';
};

export const getAppRoutePath = (route: AppRoute) => APP_ROUTE_PATHS[route];

export const navigateToAppRoute = (route: AppRoute) => {
  const path = getAppRoutePath(route);
  if (window.location.pathname === path) return;

  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('popstate'));
};
