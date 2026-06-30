import { useEffect, useState } from 'react';
import { Button } from '@deweyou-design/react/button';
import { Input } from '@deweyou-design/react/input';
import { Tooltip } from '@deweyou-design/react/tooltip';
import { BRAND_ICON_SVGS } from '@cubegin/icons/brand';
import { CubeginAnimatedIcon } from '@cubegin/icons/react';
import type { EventId } from '@cubegin/shared/events';
import {
  AddIcon,
  ChevronDownIcon,
  DeleteIcon,
  FormulaNavIcon,
  HistoryNavIcon,
  LanguageIcon,
  SettingsNavIcon,
  SidebarCollapseIcon,
  SidebarExpandIcon,
  SunIcon,
  ThemeMoonIcon,
  TimerNavIcon,
} from './timer-icons';
import type { SolveRecord, SolveSession } from '@cubegin/shared/timer-session';
import { getDefaultSessionId } from '@cubegin/shared/timer-session';
import { EventSelector } from './event-selector';
import { SolveList } from './solve-list';
import { SolveStatisticsPanel } from './solve-statistics-panel';
import { StorageAlert } from './storage-alert';
import type { TimerLocale, TimerMessages } from '../timer-i18n';
import styles from './timer-sidebar.module.css';

export type TimerNavItemId = 'timer' | 'results' | 'formula' | 'settings';

interface TimerSidebarProps {
  activeSessionId: string;
  activeNavItem: TimerNavItemId;
  eventId: EventId;
  error?: string;
  isMobileShell: boolean;
  onCreateSession: (name: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onEventChange: (id: EventId) => void;
  onLocaleToggle: () => void;
  onNavItemChange: (id: TimerNavItemId) => void;
  onSelectSession: (sessionId: string) => void;
  onSelectSolve: (solve: SolveRecord) => void;
  onThemeToggle: () => void;
  onToggleSidebar: () => void;
  locale: TimerLocale;
  messages: TimerMessages;
  sessions: SolveSession[];
  isCollapsed: boolean;
  solves: SolveRecord[];
  themeMode: 'light' | 'dark';
  toggleSidebarLabel: string;
  toggleThemeLabel: string;
}

export const TimerSidebar = ({
  activeSessionId,
  activeNavItem,
  eventId,
  error,
  isMobileShell,
  onCreateSession,
  onDeleteSession,
  onEventChange,
  onLocaleToggle,
  onNavItemChange,
  onSelectSession,
  onSelectSolve,
  onThemeToggle,
  onToggleSidebar,
  locale,
  messages,
  sessions,
  isCollapsed,
  solves,
  themeMode,
  toggleSidebarLabel,
  toggleThemeLabel,
}: TimerSidebarProps) => {
  const [name, setName] = useState('');
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isBrandHovering, setIsBrandHovering] = useState(false);

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const visibleSessions = sessions.filter((session) => session.eventId === eventId);
  const defaultSessionId = getDefaultSessionId(eventId);
  const defaultSession = visibleSessions.find((session) => session.id === defaultSessionId);
  const customSessions = visibleSessions.filter((session) => !session.isDefault);
  const activeSessionName =
    activeSession?.isDefault || (!activeSession && defaultSession)
      ? messages.defaultSession
      : (activeSession?.name ?? messages.defaultSession);
  const wordmarkSvg =
    BRAND_ICON_SVGS[themeMode === 'dark' ? 'cubegin-wordmark-dark' : 'cubegin-wordmark'];
  const navItems = [
    { id: 'timer', label: messages.timer, icon: <TimerNavIcon /> },
    { id: 'results', label: messages.solves, icon: <HistoryNavIcon /> },
    { id: 'formula', label: messages.formulaLibrary, icon: <FormulaNavIcon /> },
    { id: 'settings', label: messages.settings, icon: <SettingsNavIcon /> },
  ] as const;

  useEffect(() => {
    if (isCollapsed) {
      setIsSessionMenuOpen(false);
      setIsCreatingSession(false);
    }
  }, [isCollapsed]);

  const handleCreate = () => {
    const nextName = name.trim() || messages.newSessionFallback;
    onCreateSession(nextName);
    setName('');
    setIsCreatingSession(false);
    setIsSessionMenuOpen(false);
  };

  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    setIsSessionMenuOpen(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    onDeleteSession(sessionId);
    if (sessionId === activeSessionId) setIsSessionMenuOpen(false);
  };

  const handleNavItemClick = (id: TimerNavItemId) => {
    onNavItemChange(id);
    if (isMobileShell) onToggleSidebar();
  };

  return (
    <aside
      className={styles.root}
      data-collapsed={isCollapsed}
      data-shell={isMobileShell ? 'mobile' : 'desktop'}
      aria-label={messages.sidebar}
    >
      <header className={styles.header}>
        <div className={styles.brandRow}>
          <strong
            className={styles.brand}
            onMouseEnter={() => setIsBrandHovering(true)}
            onMouseLeave={() => setIsBrandHovering(false)}
          >
            <CubeginAnimatedIcon
              className={styles.brandLogo}
              isPlaying={isBrandHovering}
              size={32}
              title="Cubegin"
              trigger="manual"
            />
            <span
              className={styles.wordmark}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: wordmarkSvg }}
            />
          </strong>
          <Tooltip.Root placement="bottom">
            <Tooltip.Trigger>
              <Button.Icon
                className={styles.sidebarToggleButton}
                variant="ghost"
                color="neutral"
                size="sm"
                icon={isCollapsed ? <SidebarExpandIcon /> : <SidebarCollapseIcon />}
                onClick={onToggleSidebar}
                aria-label={toggleSidebarLabel}
              />
            </Tooltip.Trigger>
            <Tooltip.Content>{toggleSidebarLabel}</Tooltip.Content>
          </Tooltip.Root>
        </div>
        {!isCollapsed && (
          <div className={styles.eventRow}>
            <EventSelector
              className={styles.eventSelector}
              label={messages.eventSelectorLabel}
              locale={locale}
              value={eventId}
              onChange={onEventChange}
            />
          </div>
        )}
        <div className={styles.navRow}>
          <nav className={styles.nav} aria-label={messages.mainNav}>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.navButton}
                data-active={activeNavItem === item.id}
                onClick={() => handleNavItemClick(item.id)}
                aria-current={activeNavItem === item.id ? 'page' : undefined}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {!isMobileShell && (
        <section
          className={styles.controls}
          aria-label={messages.sessionSettings}
          aria-hidden={isCollapsed}
        >
          <div className={styles.sessionMenu}>
            <button
              type="button"
              className={styles.sessionTrigger}
              onClick={() => setIsSessionMenuOpen((isOpen) => !isOpen)}
              aria-expanded={isSessionMenuOpen}
              aria-label={messages.sessionList}
            >
              <span className={styles.sessionTriggerText}>{activeSessionName}</span>
              <ChevronDownIcon size={12} />
            </button>
            {isSessionMenuOpen && (
              <div className={styles.sessionPanel} role="menu">
                {defaultSession && (
                  <button
                    type="button"
                    className={styles.sessionItem}
                    data-active={activeSessionId === defaultSession.id}
                    onClick={() => handleSelectSession(defaultSession.id)}
                    role="menuitem"
                  >
                    <span>{messages.defaultSession}</span>
                  </button>
                )}
                {customSessions.map((session) => (
                  <div
                    key={session.id}
                    className={styles.sessionItemRow}
                    data-active={activeSessionId === session.id}
                  >
                    <button
                      type="button"
                      className={styles.sessionItem}
                      onClick={() => handleSelectSession(session.id)}
                      role="menuitem"
                    >
                      <span>{session.name}</span>
                    </button>
                    <Tooltip.Root placement="right">
                      <Tooltip.Trigger>
                        <Button.Icon
                          className={styles.sessionDeleteButton}
                          variant="ghost"
                          color="danger"
                          size="xs"
                          icon={<DeleteIcon />}
                          onClick={() => handleDeleteSession(session.id)}
                          aria-label={messages.deleteSessionAria(session.name)}
                        />
                      </Tooltip.Trigger>
                      <Tooltip.Content>{messages.deleteSession}</Tooltip.Content>
                    </Tooltip.Root>
                  </div>
                ))}
                <div className={styles.sessionCreate}>
                  {isCreatingSession ? (
                    <>
                      <Input
                        aria-label={messages.newSessionName}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder={messages.newSessionFallback}
                        size="sm"
                      />
                      <Button.Icon
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        icon={<AddIcon />}
                        onClick={handleCreate}
                        aria-label={messages.confirmCreateSession}
                      />
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.createSessionButton}
                      onClick={() => setIsCreatingSession(true)}
                    >
                      <AddIcon size={16} />
                      <span>{messages.createSession}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {!isMobileShell && (
        <section className={styles.scores} aria-label={messages.solves} aria-hidden={isCollapsed}>
          <div className={styles.scoreHeader}>
            <span className={styles.scoreTitle}>{messages.solves}</span>
            <span className={styles.scoreCount}>{solves.length}</span>
          </div>
          <SolveList solves={solves} emptyText={messages.noSolves} onSelectSolve={onSelectSolve} />
        </section>
      )}

      {!isMobileShell && (
        <div className={styles.statistics} aria-hidden={isCollapsed}>
          <SolveStatisticsPanel messages={messages} solves={solves} />
        </div>
      )}

      {error && !isCollapsed && (
        <div className={styles.alert}>
          <StorageAlert message={error} formatMessage={messages.storageError} />
        </div>
      )}

      {!isCollapsed && isMobileShell && (
        <div className={styles.utilities} aria-label={messages.globalActions}>
          <Tooltip.Root placement="top">
            <Tooltip.Trigger>
              <button
                type="button"
                className={styles.utilityButton}
                onClick={onLocaleToggle}
                aria-label={messages.toggleLanguage}
              >
                <LanguageIcon size={18} />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>{messages.toggleLanguage}</Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root placement="top">
            <Tooltip.Trigger>
              <button
                type="button"
                className={styles.utilityButton}
                onClick={onThemeToggle}
                aria-label={toggleThemeLabel}
              >
                {themeMode === 'dark' ? <SunIcon size={18} /> : <ThemeMoonIcon size={18} />}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>{toggleThemeLabel}</Tooltip.Content>
          </Tooltip.Root>
        </div>
      )}
    </aside>
  );
};
