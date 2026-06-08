import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CSSProperties, ReactNode } from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { EventSelector } from './event-selector';

vi.mock('@deweyou-design/react/select', () => {
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
    }) => (
      <label className={className} style={style}>
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
    Item: ({
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
    ),
  };
  return { Select };
});

afterEach(cleanup);

describe('EventSelector', () => {
  it('renders the current event label', () => {
    render(<EventSelector label="魔方类型" locale="zh-CN" value="333" onChange={vi.fn()} />);
    const option = screen.getByRole('option', { name: '三阶速拧' });

    expect(option).toBeTruthy();
    expect(
      screen.getByRole('combobox').parentElement?.style.getPropertyValue('--event-icon-mask'),
    ).toContain('data:image/svg+xml');
    expect(option.style.getPropertyValue('--event-icon-mask')).toContain('data:image/svg+xml');
  });

  it('calls onChange with event id when a new event is selected', async () => {
    const onChange = vi.fn();
    render(<EventSelector label="魔方类型" locale="zh-CN" value="333" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), '222');
    expect(onChange).toHaveBeenCalledWith('222');
  });
});
