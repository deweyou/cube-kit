import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { EventSelector } from './event-selector';

vi.mock('@deweyou-design/react/select', () => {
  const Select = {
    Root: ({
      children,
      label,
      value,
      onValueChange,
    }: {
      children: ReactNode;
      label?: ReactNode;
      value?: string[];
      onValueChange?: (value: string[]) => void;
    }) => (
      <label>
        {label}
        <select
          aria-label={typeof label === 'string' ? label : undefined}
          value={value?.[0] ?? ''}
          onChange={(event) => onValueChange?.([event.target.value])}
        >
          {children}
        </select>
      </label>
    ),
    Trigger: () => null,
    Content: ({ children }: { children: ReactNode }) => <>{children}</>,
    Item: ({ value, label }: { value: string; label: string }) => (
      <option value={value}>{label}</option>
    ),
  };
  return { Select };
});

afterEach(cleanup);

describe('EventSelector', () => {
  it('renders the current event label', () => {
    render(<EventSelector label="魔方类型" locale="zh-CN" value="333" onChange={vi.fn()} />);
    expect(screen.getByText('三阶速拧')).toBeTruthy();
  });

  it('calls onChange with event id when a new event is selected', async () => {
    const onChange = vi.fn();
    render(<EventSelector label="魔方类型" locale="zh-CN" value="333" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), '222');
    expect(onChange).toHaveBeenCalledWith('222');
  });
});
