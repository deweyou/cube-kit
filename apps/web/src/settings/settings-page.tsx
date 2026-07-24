import { CubeginAnimatedIcon } from '@cubegin/icons/react';
import {
  LANGUAGE_PREFERENCES,
  THEME_PREFERENCES,
  TIMER_DISPLAY_MODES,
  type AppPreferences,
  type LanguagePreference,
  type ThemePreference,
  type TimerDisplayMode,
} from '@cubegin/shared/preferences';
import { Select } from '@deweyou-design/react/select';
import { Switch } from '@deweyou-design/react/switch';
import type { ReactNode } from 'react';
import { getCubeginWordmarkSvg } from '../brand/wordmark';
import { useAppPreferences } from '../preferences/app-preferences';
import { TimerTopNavigation } from '../timer/timer-navigation';
import styles from './settings-page.module.css';

interface SettingsSelectOption<TValue extends string> {
  label: string;
  value: TValue;
}

interface SettingsSelectProps<TValue extends string> {
  label: string;
  options: readonly SettingsSelectOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
}

const SettingsSelect = <TValue extends string>({
  label,
  onChange,
  options,
  value,
}: SettingsSelectProps<TValue>) => (
  <div className={styles.settingSelectShell}>
    <Select.Root
      className={styles.settingSelect}
      label={<span className={styles.visuallyHidden}>{label}</span>}
      value={[value]}
      onValueChange={(nextValue) => {
        const selectedOption = options.find((option) => option.value === nextValue[0]);
        if (selectedOption) onChange(selectedOption.value);
      }}
    >
      <Select.Trigger className={styles.settingSelectTrigger} />
      <Select.Content className={styles.settingSelectContent}>
        {options.map((option) => (
          <Select.Item
            className={styles.settingSelectItem}
            key={option.value}
            value={option.value}
            label={option.label}
          />
        ))}
      </Select.Content>
    </Select.Root>
  </div>
);

interface SettingsRowProps {
  children: ReactNode;
  onRowPress?: () => void;
  title: string;
}

const isSettingsControlTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest('[data-settings-control="true"]'));

const SettingsRow = ({ children, onRowPress, title }: SettingsRowProps) => (
  <div
    className={styles.settingRow}
    data-interactive-row={onRowPress ? 'true' : undefined}
    onClick={(event) => {
      if (!onRowPress || isSettingsControlTarget(event.target)) return;
      onRowPress();
    }}
  >
    <div className={styles.settingCopy}>
      <span className={styles.settingTitle}>{title}</span>
    </div>
    <div className={styles.settingControl} data-settings-control="true">
      {children}
    </div>
  </div>
);

export const SettingsPage = () => {
  const { copy, preferences, resolvedTheme, setPreferences } = useAppPreferences();
  const wordmarkSvg = getCubeginWordmarkSvg(resolvedTheme);

  const updatePreferences = (patch: Partial<AppPreferences>) => {
    setPreferences((currentPreferences) => ({ ...currentPreferences, ...patch }));
  };
  const toggleWcaInspection = () => {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      wcaInspection: !currentPreferences.wcaInspection,
    }));
  };
  const toggleSolverAssist = () => {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      solverAssistEnabled: !currentPreferences.solverAssistEnabled,
    }));
  };

  const themeOptions: SettingsSelectOption<ThemePreference>[] = THEME_PREFERENCES.map((value) => ({
    value,
    label:
      value === 'system'
        ? copy.settings.themeSystem
        : value === 'light'
          ? copy.settings.themeLight
          : copy.settings.themeDark,
  }));
  const languageOptions: SettingsSelectOption<LanguagePreference>[] = LANGUAGE_PREFERENCES.map(
    (value) => ({
      value,
      label:
        value === 'browser'
          ? copy.settings.languageBrowser
          : value === 'zh-CN'
            ? copy.settings.languageChinese
            : copy.settings.languageEnglish,
    }),
  );
  const timerDisplayOptions: SettingsSelectOption<TimerDisplayMode>[] = TIMER_DISPLAY_MODES.map(
    (value) => ({
      value,
      label:
        value === 'realtime'
          ? copy.settings.timerDisplayRealtime
          : value === 'seconds'
            ? copy.settings.timerDisplaySeconds
            : copy.settings.timerDisplayInspectionOnly,
    }),
  );

  return (
    <section className={styles.root} aria-labelledby="settings-page-title">
      <header className={styles.header}>
        <strong className={styles.brand}>
          <CubeginAnimatedIcon size={32} title="Cubegin" trigger="manual" />
          <span
            className={styles.wordmark}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: wordmarkSvg }}
          />
        </strong>
      </header>
      <TimerTopNavigation isHidden={false} />
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title} id="settings-page-title">
            {copy.settings.title}
          </h1>

          <section className={styles.group} aria-labelledby="settings-general-title">
            <h2 className={styles.groupTitle} id="settings-general-title">
              {copy.settings.generalGroup}
            </h2>
            <div className={styles.groupBody}>
              <SettingsRow title={copy.settings.themeLabel}>
                <SettingsSelect
                  label={copy.settings.themeLabel}
                  options={themeOptions}
                  value={preferences.theme}
                  onChange={(theme) => updatePreferences({ theme })}
                />
              </SettingsRow>
              <SettingsRow title={copy.settings.languageLabel}>
                <SettingsSelect
                  label={copy.settings.languageLabel}
                  options={languageOptions}
                  value={preferences.language}
                  onChange={(language) => updatePreferences({ language })}
                />
              </SettingsRow>
            </div>
          </section>

          <section className={styles.group} aria-labelledby="settings-timer-title">
            <h2 className={styles.groupTitle} id="settings-timer-title">
              {copy.settings.timerGroup}
            </h2>
            <div className={styles.groupBody}>
              <SettingsRow
                title={copy.settings.wcaInspectionLabel}
                onRowPress={toggleWcaInspection}
              >
                <Switch
                  checked={preferences.wcaInspection}
                  onCheckedChange={(wcaInspection) => updatePreferences({ wcaInspection })}
                >
                  <span className={styles.visuallyHidden}>{copy.settings.wcaInspectionLabel}</span>
                </Switch>
              </SettingsRow>
              <SettingsRow title={copy.settings.solverAssistLabel} onRowPress={toggleSolverAssist}>
                <Switch
                  checked={preferences.solverAssistEnabled}
                  onCheckedChange={(solverAssistEnabled) =>
                    updatePreferences({ solverAssistEnabled })
                  }
                >
                  <span className={styles.visuallyHidden}>{copy.settings.solverAssistLabel}</span>
                </Switch>
              </SettingsRow>
              <SettingsRow title={copy.settings.timerDisplayLabel}>
                <SettingsSelect
                  label={copy.settings.timerDisplayLabel}
                  options={timerDisplayOptions}
                  value={preferences.timerDisplayMode}
                  onChange={(timerDisplayMode) => updatePreferences({ timerDisplayMode })}
                />
              </SettingsRow>
            </div>
          </section>
        </div>
      </main>
    </section>
  );
};
