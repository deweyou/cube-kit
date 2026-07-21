import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScrambleText, getBufferedFitArea, selectSafeFittedFontSize } from './scramble-text';

describe('ScrambleText', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('reserves proportional width and height buffers before fitting text', () => {
    expect(getBufferedFitArea({ width: 300, height: 100 })).toEqual({
      width: 284,
      height: 88,
    });
    expect(getBufferedFitArea({ width: 1000, height: 500 })).toEqual({
      width: 960,
      height: 470,
    });
  });

  it('steps back from the largest fitting font size for rounding safety', () => {
    expect(
      selectSafeFittedFontSize({
        minSize: 12,
        maxSize: 40,
        fits: (fontSize) => fontSize <= 30,
      }),
    ).toBe(29.5);
    expect(
      selectSafeFittedFontSize({
        minSize: 12,
        maxSize: 40,
        fits: () => true,
      }),
    ).toBe(39.5);
    expect(
      selectSafeFittedFontSize({
        minSize: 12,
        maxSize: 40,
        fits: () => false,
      }),
    ).toBe(12);
  });

  it('remeasures when the scramble or viewport size changes', () => {
    let resizeCallback: ResizeObserverCallback | undefined;
    let fittingLimit = 30;

    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe() {}

      disconnect() {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    const { container, rerender } = render(<ScrambleText scramble="R U R'" />);
    const viewport = container;
    const text = container.querySelector('p');

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, get: () => 100 },
      clientWidth: { configurable: true, get: () => 300 },
    });
    Object.defineProperties(text, {
      scrollHeight: {
        configurable: true,
        get: () =>
          Number.parseFloat(text?.style.getPropertyValue('--scramble-auto-fit-size') ?? '0') <=
          fittingLimit
            ? 80
            : 120,
      },
      scrollWidth: { configurable: true, get: () => 200 },
    });

    rerender(<ScrambleText scramble="R U R' F" />);

    expect(text?.dataset.autoFit).toBe('measured');
    expect(text?.style.getPropertyValue('--scramble-auto-fit-size')).toBe('29.5px');
    expect(viewport.style.getPropertyValue('--scramble-rendered-half-height')).toBe('40px');

    fittingLimit = 24;
    resizeCallback?.([], {} as ResizeObserver);

    expect(text?.style.getPropertyValue('--scramble-auto-fit-size')).toBe('23.5px');
    expect(viewport.style.getPropertyValue('--scramble-rendered-half-height')).toBe('40px');

    rerender(<ScrambleText scramble="正在生成打乱" isLoading />);

    expect(text?.dataset.autoFit).toBe('fallback');
    expect(text?.style.getPropertyValue('--scramble-auto-fit-size')).toBe('');
  });

  it('keeps the density fallback when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    const { container } = render(<ScrambleText scramble="R U R'" />);
    const text = container.querySelector('p');

    expect(text?.dataset.autoFit).toBe('fallback');
    expect(text?.style.getPropertyValue('--scramble-auto-fit-size')).toBe('');
  });

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

// @ts-ignore Vitest runs this test in Node, while focused app checks may omit Node types.
const { readFileSync } = await import('node:fs');

const readScrambleTextCss = () =>
  readFileSync(`${process.cwd()}/src/timer/components/scramble-text.module.css`, 'utf8');
