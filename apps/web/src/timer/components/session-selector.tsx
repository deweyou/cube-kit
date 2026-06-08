import { useState } from 'react';
import { Button } from '@deweyou-design/react/button';
import type { SolveSession } from '@cubegin/shared/timer-session';

interface SessionSelectorProps {
  sessions: SolveSession[];
  activeSessionId: string;
  canDeleteActiveSession: boolean;
  onCreateSession: (name: string) => void;
  onDeleteActiveSession: () => void;
  onSelectSession: (sessionId: string) => void;
}

export const SessionSelector = ({
  sessions,
  activeSessionId,
  canDeleteActiveSession,
  onCreateSession,
  onDeleteActiveSession,
  onSelectSession,
}: SessionSelectorProps) => {
  const [name, setName] = useState('');

  const handleCreate = () => {
    const nextName = name.trim() || '新列表';
    onCreateSession(nextName);
    setName('');
  };

  return (
    <section
      style={{
        display: 'grid',
        gap: 10,
        width: '100%',
      }}
      aria-label="成绩列表设置"
    >
      <select
        aria-label="成绩列表"
        value={activeSessionId}
        onChange={(event) => onSelectSession(event.target.value)}
        style={{
          width: '100%',
          minHeight: 36,
          background: 'var(--ui-color-surface)',
          border: '1px solid var(--ui-color-border)',
          borderRadius: 8,
          color: 'var(--ui-color-text)',
          padding: '6px 8px',
        }}
      >
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.name}
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          aria-label="新列表名称"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="新列表"
          style={{
            minWidth: 0,
            flex: 1,
            minHeight: 34,
            background: 'var(--ui-color-surface)',
            border: '1px solid var(--ui-color-border)',
            borderRadius: 8,
            color: 'var(--ui-color-text)',
            padding: '6px 8px',
          }}
        />
        <Button variant="outlined" color="neutral" size="sm" onClick={handleCreate}>
          新建列表
        </Button>
      </div>
      <Button
        variant="link"
        color="danger"
        size="sm"
        onClick={onDeleteActiveSession}
        disabled={!canDeleteActiveSession}
      >
        删除列表
      </Button>
    </section>
  );
};
