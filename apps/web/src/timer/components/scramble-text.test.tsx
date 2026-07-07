import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrambleText } from './scramble-text';

describe('ScrambleText', () => {
  it('preserves generated line breaks for multiline scrambles', () => {
    const scramble = "R++ D-- U'\nR-- D++ U";

    const { container } = render(<ScrambleText scramble={scramble} />);

    expect(container.querySelector('p')?.textContent).toBe(scramble);
    expect(readScrambleTextCss()).toContain('white-space: pre-line;');
  });

  it('scales text density from scramble length', () => {
    const shortScramble = Array.from({ length: 20 }, () => 'R').join(' ');
    const mediumScramble = Array.from({ length: 40 }, () => 'R').join(' ');
    const longScramble = Array.from({ length: 80 }, () => 'R').join(' ');

    const { rerender, container } = render(<ScrambleText scramble={shortScramble} />);

    expect(container.querySelector('p')?.getAttribute('data-density')).toBe('regular');

    rerender(<ScrambleText scramble={mediumScramble} />);
    expect(container.querySelector('p')?.getAttribute('data-density')).toBe('compact');

    rerender(<ScrambleText scramble={longScramble} />);
    expect(container.querySelector('p')?.getAttribute('data-density')).toBe('dense');

    expect(readScrambleTextCss()).toContain('.compact');
    expect(readScrambleTextCss()).toContain('.dense');
  });
});

declare const process: {
  cwd: () => string;
};

const { readFileSync } = await import('node:fs');

const readScrambleTextCss = () =>
  readFileSync(`${process.cwd()}/src/timer/components/scramble-text.module.css`, 'utf8');
