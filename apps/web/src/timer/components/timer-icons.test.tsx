import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeleteIcon, NextIcon, PreviousIcon, RefreshIcon } from './timer-icons';

describe('RefreshIcon', () => {
  it('uses one circular arrow path for the scramble refresh action', () => {
    const { container } = render(<RefreshIcon size={18} />);

    const svg = container.querySelector('svg');
    const path = container.querySelector('path');

    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(path?.getAttribute('d')).toBe('M19 8a8 8 0 1 0 1 6M19 8V3M19 8h-5');
  });
});

describe('multi-blind navigation icons', () => {
  it('uses mirrored chevrons for previous and next cube actions', () => {
    const previous = render(<PreviousIcon size={18} />);
    expect(previous.container.querySelector('path')?.getAttribute('d')).toBe('m14.5 6-6 6 6 6');
    previous.unmount();

    const next = render(<NextIcon size={18} />);
    expect(next.container.querySelector('path')?.getAttribute('d')).toBe('m9.5 6 6 6-6 6');
  });
});

describe('DeleteIcon', () => {
  it('uses a clear trash can shape for destructive result actions', () => {
    const { container } = render(<DeleteIcon size={18} />);

    const svg = container.querySelector('svg');
    const paths = [...container.querySelectorAll('path')].map((path) => path.getAttribute('d'));

    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(paths).toContain('M4 7h16');
    expect(paths).toContain('M6.5 7 7.4 19.3A2 2 0 0 0 9.4 21h5.2a2 2 0 0 0 2-1.7L17.5 7');
    expect(paths).toContain('M10 11v6M14 11v6');
    expect(paths).not.toContain('M5 7.5h14');
    expect(paths).not.toContain(
      'M7.5 7.5h9l-.72 11.2A2.5 2.5 0 0 1 13.29 21h-2.58a2.5 2.5 0 0 1-2.49-2.3L7.5 7.5Z',
    );
  });
});
