import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  DEFAULT_APP_PREFERENCES,
  normalizeAppPreferences,
  type AppPreferences,
  type ThemePreference,
} from '@cubegin/shared/preferences';
import { getAppCopy, resolveAppLanguage, type AppCopy, type ResolvedAppLanguage } from './app-copy';

export const APP_PREFERENCES_STORAGE_KEY = 'cubegin-app-preferences';

type ResolvedTheme = 'light' | 'dark';

interface AppPreferencesContextValue {
  copy: AppCopy;
  language: ResolvedAppLanguage;
  preferences: AppPreferences;
  resolvedTheme: ResolvedTheme;
  setPreferences: Dispatch<SetStateAction<AppPreferences>>;
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | undefined>(undefined);

const getBrowserLanguages = (): string[] => {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages.length > 0) return [...navigator.languages];
  return navigator.language ? [navigator.language] : [];
};

const readStoredPreferences = (): AppPreferences => {
  try {
    const storedPreferences = localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
    if (storedPreferences === null) return DEFAULT_APP_PREFERENCES;
    return normalizeAppPreferences(JSON.parse(storedPreferences));
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
};

const persistPreferences = (preferences: AppPreferences) => {
  try {
    localStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
};

const resolveSystemTheme = (): ResolvedTheme => {
  if (typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const resolveTheme = (preference: ThemePreference, systemTheme: ResolvedTheme): ResolvedTheme => {
  if (preference === 'system') return systemTheme;
  return preference;
};

export const AppPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<AppPreferences>(() => readStoredPreferences());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => resolveSystemTheme());

  useEffect(() => {
    persistPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const language = useMemo(
    () => resolveAppLanguage(preferences.language, getBrowserLanguages()),
    [preferences.language],
  );
  const copy = useMemo(() => getAppCopy(language), [language]);
  const resolvedTheme = resolveTheme(preferences.theme, systemTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      copy,
      language,
      preferences,
      resolvedTheme,
      setPreferences,
    }),
    [copy, language, preferences, resolvedTheme],
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
};

export const useAppPreferences = (): AppPreferencesContextValue => {
  const value = useContext(AppPreferencesContext);
  if (value === undefined) {
    throw new Error('useAppPreferences must be used inside AppPreferencesProvider.');
  }

  return value;
};
