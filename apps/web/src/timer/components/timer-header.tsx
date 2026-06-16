import { Button } from '@deweyou-design/react/button';
import { Tooltip } from '@deweyou-design/react/tooltip';
import type { WcaEventId } from '@cubegin/shared/wca';
import { EventSelector } from './event-selector';
import { LanguageIcon, SunIcon, ThemeMoonIcon } from './timer-icons';
import type { TimerLocale, TimerMessages } from '../timer-i18n';
import styles from './timer-header.module.css';

interface TimerHeaderProps {
  eventId: WcaEventId;
  isScrolled: boolean;
  isSidebarCollapsed: boolean;
  locale: TimerLocale;
  messages: TimerMessages;
  themeMode: 'light' | 'dark';
  toggleThemeLabel: string;
  onEventChange: (id: WcaEventId) => void;
  onLocaleToggle: () => void;
  onThemeToggle: () => void;
}

export const TimerHeader = ({
  eventId,
  isScrolled,
  isSidebarCollapsed,
  locale,
  messages,
  themeMode,
  toggleThemeLabel,
  onEventChange,
  onLocaleToggle,
  onThemeToggle,
}: TimerHeaderProps) => (
  <header
    className={styles.root}
    data-scrolled={isScrolled ? 'true' : 'false'}
    data-sidebar={isSidebarCollapsed ? 'collapsed' : 'expanded'}
  >
    <div className={styles.actions}>
      {isSidebarCollapsed && (
        <div className={styles.collapsedEventSelectorSlot}>
          <EventSelector
            className={styles.collapsedEventSelector}
            isIconOnly
            label={messages.eventSelectorLabel}
            locale={locale}
            value={eventId}
            onChange={onEventChange}
          />
        </div>
      )}
      <Tooltip.Root placement="bottom">
        <Tooltip.Trigger>
          <Button.Icon
            className={styles.actionButton}
            variant="ghost"
            color="neutral"
            size="sm"
            icon={<LanguageIcon />}
            onClick={onLocaleToggle}
            aria-label={messages.toggleLanguage}
          />
        </Tooltip.Trigger>
        <Tooltip.Content>{messages.toggleLanguage}</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root placement="bottom">
        <Tooltip.Trigger>
          <Button.Icon
            className={styles.actionButton}
            variant="ghost"
            color="neutral"
            size="sm"
            icon={themeMode === 'dark' ? <SunIcon /> : <ThemeMoonIcon />}
            onClick={onThemeToggle}
            aria-label={toggleThemeLabel}
          />
        </Tooltip.Trigger>
        <Tooltip.Content>{toggleThemeLabel}</Tooltip.Content>
      </Tooltip.Root>
    </div>
  </header>
);
