import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { DEFAULT_APP_PREFERENCES } from '@cubegin/shared/preferences';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import {
  Children,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppPreferencesProvider } from '../preferences/app-preferences';
import { SettingsPage } from './settings-page';

const settingsPageStyles = readFileSync(
  join(cwd(), 'src/settings/settings-page.module.css'),
  'utf8',
);

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

const getAccessibleLabel = (label: ReactNode) => {
  if (typeof label === 'string') return label;
  if (label && typeof label === 'object' && 'props' in label) {
    const element = label as ReactElement<{ children?: ReactNode }>;
    return typeof element.props.children === 'string' ? element.props.children : undefined;
  }
  return undefined;
};

vi.mock('@deweyou-design/react/select', () => {
  const Trigger = () => null;
  const Content = ({ children }: { children: ReactNode }) => <>{children}</>;
  const Item = ({
    className,
    style,
    value,
    label,
  }: {
    className?: string;
    style?: CSSProperties;
    value: string;
    label: string;
  }) => (
    <option className={className} style={style} value={value}>
      {label}
    </option>
  );

  const Select = {
    Root: ({
      children,
      className,
      label,
      style,
      value,
      onValueChange,
    }: {
      children: ReactNode;
      className?: string;
      label?: ReactNode;
      style?: CSSProperties;
      value?: string[];
      onValueChange?: (value: string[]) => void;
    }) => {
      const selectItems: ReactNode[] = [];

      Children.forEach(children, (child) => {
        if (!isValidElement(child) || child.type !== Content) return;

        const contentElement = child as ReactElement<{ children?: ReactNode }>;
        Children.forEach(contentElement.props.children, (contentChild) => {
          if (isValidElement(contentChild) && contentChild.type === Item) {
            selectItems.push(contentChild);
          }
        });
      });

      return (
        <div className={className} data-component-select-root="true" style={style}>
          <label>
            {label}
            <select
              aria-label={getAccessibleLabel(label)}
              data-component-select="true"
              value={value?.[0] ?? ''}
              onChange={(event) => onValueChange?.([event.target.value])}
            >
              {selectItems}
            </select>
          </label>
        </div>
      );
    },
    Trigger,
    Content,
    Item,
  };

  return { Select };
});

vi.mock('@deweyou-design/react/switch', () => ({
  Switch: ({
    checked,
    children,
    onCheckedChange,
  }: {
    checked?: boolean;
    children?: ReactNode;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <label>
      <input
        role="switch"
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
      />
      <span>{children}</span>
    </label>
  ),
}));

const renderSettingsPage = () =>
  render(
    <AppPreferencesProvider>
      <MemoryRouter initialEntries={['/settings']}>
        <SettingsPage />
      </MemoryRouter>
    </AppPreferencesProvider>,
  );

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('SettingsPage', () => {
  it('renders the first-version compact grouped settings in Chinese', () => {
    setNavigatorLanguages(['zh-CN']);

    renderSettingsPage();

    expect(screen.getByRole('heading', { name: '设置' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '常规' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '计时器' })).toBeTruthy();
    expect(screen.queryByRole('radiogroup', { name: '主题' })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: '语言' })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: '计时显示' })).toBeNull();

    const themeSelect = screen.getByRole('combobox', { name: '主题' }) as HTMLSelectElement;
    const languageSelect = screen.getByRole('combobox', { name: '语言' }) as HTMLSelectElement;
    const timerDisplaySelect = screen.getByRole('combobox', {
      name: '计时显示',
    }) as HTMLSelectElement;

    expect(themeSelect.value).toBe('system');
    expect(Array.from(themeSelect.options).map((option) => option.textContent)).toEqual([
      '跟随系统',
      '浅色',
      '深色',
    ]);
    expect(languageSelect.value).toBe('browser');
    expect(Array.from(languageSelect.options).map((option) => option.textContent)).toEqual([
      '跟随浏览器',
      '简体中文',
      'English',
    ]);
    expect(timerDisplaySelect.value).toBe('realtime');
    expect(Array.from(timerDisplaySelect.options).map((option) => option.textContent)).toEqual([
      '实时',
      '到秒',
      '仅观察',
    ]);
    const wcaSwitch = screen.getByRole('switch', { name: 'WCA 观察' }) as HTMLInputElement;
    expect(wcaSwitch.checked).toBe(false);
    expect(
      wcaSwitch.closest('label')?.querySelector('[class*="visuallyHidden"]')?.textContent,
    ).toBe('WCA 观察');
    expect(screen.queryByText('开启后先进入 15 秒观察，超 15 秒 +2，超 17 秒 DNF。')).toBeNull();
    expect(screen.queryByText('只影响计时过程中的显示，不影响最终成绩精度。')).toBeNull();
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull();

    const navigation = screen.getByRole('navigation', { name: '主导航' });
    expect(
      within(navigation).getByRole('button', { name: '设置' }).getAttribute('aria-current'),
    ).toBe('page');
  });

  it('persists preference changes immediately and updates language copy', () => {
    setNavigatorLanguages(['zh-CN']);

    renderSettingsPage();

    fireEvent.change(screen.getByRole('combobox', { name: '主题' }), {
      target: { value: 'dark' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: '计时显示' }), {
      target: { value: 'seconds' },
    });
    fireEvent.click(screen.getByRole('switch', { name: 'WCA 观察' }));

    expect(JSON.parse(localStorage.getItem('cubegin-app-preferences')!)).toMatchObject({
      theme: 'dark',
      timerDisplayMode: 'seconds',
      wcaInspection: true,
    });

    fireEvent.change(screen.getByRole('combobox', { name: '语言' }), {
      target: { value: 'en' },
    });

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'General' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Timer' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('cubegin-app-preferences')!).language).toBe('en');
  });

  it('toggles WCA inspection from the row copy area', () => {
    setNavigatorLanguages(['zh-CN']);

    renderSettingsPage();

    const wcaSwitch = screen.getByRole('switch', { name: 'WCA 观察' }) as HTMLInputElement;
    const wcaRow = wcaSwitch.closest('[class*="settingRow"]') as HTMLElement;
    const wcaTitle = wcaRow.querySelector('[class*="settingTitle"]') as HTMLElement;

    expect(wcaRow.dataset.interactiveRow).toBe('true');

    fireEvent.click(wcaTitle);

    expect(wcaSwitch.checked).toBe(true);
    expect(JSON.parse(localStorage.getItem('cubegin-app-preferences')!)).toMatchObject({
      wcaInspection: true,
    });
  });

  it('uses the light wordmark asset on a dark theme', () => {
    setNavigatorLanguages(['zh-CN']);
    localStorage.setItem(
      'cubegin-app-preferences',
      JSON.stringify({ ...DEFAULT_APP_PREFERENCES, theme: 'dark' }),
    );

    const { container } = renderSettingsPage();

    const wordmarkPath = container.querySelector('[class*="wordmark"] path');
    expect(wordmarkPath?.getAttribute('fill')).toBe('#ffffff');
  });

  it('keeps desktop select controls compact', () => {
    expect(settingsPageStyles).toMatch(/\.content\s*\{[^}]*gap:\s*22px;/su);
    expect(settingsPageStyles).toMatch(/\.content\s*\{[^}]*max-width:\s*640px;/su);
    expect(settingsPageStyles).toMatch(/\.settingSelectShell\s*\{[^}]*flex:\s*0 1 180px;/su);
    expect(settingsPageStyles).toMatch(/\.settingSelectShell\s*\{[^}]*width:\s*180px;/su);
    expect(settingsPageStyles).toMatch(
      /\.settingSelectContent\s*\{[^}]*max-height:\s*min\(320px,\s*calc\(100dvh - 160px\)\);/su,
    );
    expect(settingsPageStyles).toMatch(
      /\.settingSelectContent\s*\{[^}]*min-width:\s*min\(180px,\s*calc\(100vw - 32px\)\);/su,
    );
  });

  it('uses serif section typography while keeping setting controls sans', () => {
    expect(settingsPageStyles).toMatch(
      /\.title\s*\{[^}]*font-family:\s*var\(--ui-font-serif\);/su,
    );
    expect(settingsPageStyles).toMatch(/\.title\s*\{[^}]*font-size:\s*1\.45rem;/su);
    expect(settingsPageStyles).toMatch(
      /\.groupTitle\s*\{[^}]*font-family:\s*var\(--ui-font-serif\);/su,
    );
    expect(settingsPageStyles).toMatch(/\.groupTitle\s*\{[^}]*font-size:\s*0\.8rem;/su);
    expect(settingsPageStyles).toMatch(
      /\.settingTitle\s*\{[^}]*font-family:\s*var\(--ui-font-sans\);/su,
    );
    expect(settingsPageStyles).toMatch(/\.settingTitle\s*\{[^}]*font-size:\s*0\.94rem;/su);
    expect(settingsPageStyles).toMatch(
      /\.settingSelectTrigger\s*\{[^}]*font-family:\s*var\(--ui-font-sans\);/su,
    );
  });

  it('keeps the settings list rhythm dense without shrinking tap targets too far', () => {
    expect(settingsPageStyles).toMatch(/\.main\s*\{[^}]*padding:\s*32px var\(--settings-inline-padding\)/su);
    expect(settingsPageStyles).toMatch(/\.group\s*\{[^}]*gap:\s*10px;/su);
    expect(settingsPageStyles).toMatch(/\.group\s*\{[^}]*padding-top:\s*12px;/su);
    expect(settingsPageStyles).toMatch(/\.settingRow\s*\{[^}]*gap:\s*16px;/su);
    expect(settingsPageStyles).toMatch(/\.settingRow\s*\{[^}]*min-height:\s*60px;/su);
    expect(settingsPageStyles).toMatch(/\.settingRow\s*\{[^}]*padding:\s*8px 16px;/su);
  });

  it('keeps mobile setting rows on one line when space allows', () => {
    expect(settingsPageStyles).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.header\s*\{[^}]*padding:\s*calc\(14px \+ env\(safe-area-inset-top\)\) var\(--settings-inline-padding\) 8px;/u,
    );
    expect(settingsPageStyles).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.main\s*\{[^}]*padding-top:\s*14px;/u,
    );
    expect(settingsPageStyles).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.settingRow\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/u,
    );
    expect(settingsPageStyles).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.settingRow\s*\{[^}]*min-height:\s*58px;/u,
    );
    expect(settingsPageStyles).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.settingControl\s*\{[^}]*justify-content:\s*flex-end;/u,
    );
    expect(settingsPageStyles).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.settingSelectShell\s*\{[^}]*width:\s*clamp\(148px,\s*42vw,\s*180px\);/u,
    );
    expect(settingsPageStyles).not.toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.settingRow\s*\{[^}]*grid-template-columns:\s*1fr;/u,
    );
  });
});
