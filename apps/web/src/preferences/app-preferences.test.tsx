import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppPreferencesProvider, useAppPreferences } from './app-preferences';
import { getAppCopy, resolveAppLanguage } from './app-copy';

const Harness = () => {
  const { copy, preferences, setPreferences } = useAppPreferences();

  return (
    <button
      type="button"
      onClick={() => setPreferences({ ...preferences, theme: 'dark', language: 'en' })}
    >
      {copy.settings.title}
    </button>
  );
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

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.unstubAllGlobals();
});

describe('app preferences provider', () => {
  it('recovers malformed storage to defaults and writes normalized preferences', () => {
    setNavigatorLanguages(['zh-CN']);
    localStorage.setItem('cubegin-app-preferences', '{bad json');

    render(
      <AppPreferencesProvider>
        <Harness />
      </AppPreferencesProvider>,
    );

    expect(screen.getByRole('button', { name: '设置' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('cubegin-app-preferences')!)).toEqual({
      theme: 'system',
      language: 'browser',
      wcaInspection: false,
      timerDisplayMode: 'realtime',
    });
  });

  it('persists updates and applies document theme', () => {
    setNavigatorLanguages(['zh-CN']);

    render(
      <AppPreferencesProvider>
        <Harness />
      </AppPreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '设置' }));

    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(JSON.parse(localStorage.getItem('cubegin-app-preferences')!).theme).toBe('dark');
  });

  it('resolves browser language and system theme fallbacks', () => {
    expect(resolveAppLanguage('browser', ['en-US'])).toBe('en');
    expect(resolveAppLanguage('browser', ['zh-CN'])).toBe('zh-CN');
    expect(getAppCopy('en').settings.title).toBe('Settings');

    render(
      <AppPreferencesProvider>
        <Harness />
      </AppPreferencesProvider>,
    );

    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
