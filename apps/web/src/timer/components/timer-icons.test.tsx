import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeleteIcon } from './timer-icons';

describe('DeleteIcon', () => {
  it('uses a clear trash can shape for destructive result actions', () => {
    const { container } = render(<DeleteIcon size={18} />);

    const svg = container.querySelector('svg');
    const paths = [...container.querySelectorAll('path')].map((path) => path.getAttribute('d'));

    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(paths).toContain('M4 7h16');
    expect(paths).toContain(
      'M6.5 7 7.4 19.3A2 2 0 0 0 9.4 21h5.2a2 2 0 0 0 2-1.7L17.5 7',
    );
    expect(paths).toContain('M10 11v6M14 11v6');
    expect(paths).not.toContain('M5 7.5h14');
    expect(paths).not.toContain('M7.5 7.5h9l-.72 11.2A2.5 2.5 0 0 1 13.29 21h-2.58a2.5 2.5 0 0 1-2.49-2.3L7.5 7.5Z');
  });
});
