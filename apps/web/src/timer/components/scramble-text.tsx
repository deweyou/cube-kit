import { useLayoutEffect, useRef } from 'react';
import styles from './scramble-text.module.css';

interface ScrambleTextProps {
  scramble: string;
  isLoading?: boolean;
}

interface FitArea {
  width: number;
  height: number;
}

interface FittedFontSizeOptions {
  minSize: number;
  maxSize: number;
  fits: (fontSize: number) => boolean;
}

const FONT_SIZE_PRECISION = 4;
const FONT_SIZE_SAFETY_STEP = 0.5;

export const getBufferedFitArea = ({ width, height }: FitArea): FitArea => ({
  width: Math.max(0, width - Math.max(16, width * 0.04)),
  height: Math.max(0, height - Math.max(12, height * 0.06)),
});

export const selectSafeFittedFontSize = ({ minSize, maxSize, fits }: FittedFontSizeOptions) => {
  const minUnit = Math.ceil(minSize * FONT_SIZE_PRECISION);
  const maxUnit = Math.max(minUnit, Math.floor(maxSize * FONT_SIZE_PRECISION));

  if (!fits(minUnit / FONT_SIZE_PRECISION)) {
    return minUnit / FONT_SIZE_PRECISION;
  }

  let fittingUnit = minUnit;
  let candidateUnit = maxUnit;

  while (fittingUnit < candidateUnit) {
    const middleUnit = Math.ceil((fittingUnit + candidateUnit) / 2);

    if (fits(middleUnit / FONT_SIZE_PRECISION)) {
      fittingUnit = middleUnit;
    } else {
      candidateUnit = middleUnit - 1;
    }
  }

  const safetyUnits = FONT_SIZE_SAFETY_STEP * FONT_SIZE_PRECISION;
  return Math.max(minUnit, fittingUnit - safetyUnits) / FONT_SIZE_PRECISION;
};

export const ScrambleText = ({ scramble, isLoading = false }: ScrambleTextProps) => {
  const density = getScrambleDensity(scramble);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const text = textRef.current;
    const viewport = text?.parentElement;

    if (!text) {
      return;
    }

    text.dataset.autoFit = 'fallback';
    text.style.removeProperty('--scramble-auto-fit-size');
    text.style.removeProperty('--scramble-auto-fit-width');
    viewport?.style.setProperty('--scramble-rendered-half-height', `${text.scrollHeight / 2}px`);

    if (!viewport || isLoading || !scramble.trim() || typeof ResizeObserver === 'undefined') {
      return;
    }

    let isDisposed = false;

    const measure = () => {
      if (isDisposed) {
        return;
      }

      const viewportWidth = viewport.clientWidth;
      const viewportHeight = viewport.clientHeight;

      if (viewportWidth <= 0 || viewportHeight <= 0) {
        return;
      }

      const safeArea = getBufferedFitArea({ width: viewportWidth, height: viewportHeight });
      const computedStyle = getComputedStyle(text);
      const minSize = readPixelCustomProperty(computedStyle, '--scramble-fit-min-size', 12);
      const maxSize = readPixelCustomProperty(computedStyle, '--scramble-fit-max-size', 32);

      text.style.setProperty('--scramble-auto-fit-width', `${safeArea.width}px`);

      const fontSize = selectSafeFittedFontSize({
        minSize,
        maxSize,
        fits: (candidateSize) => {
          text.style.setProperty('--scramble-auto-fit-size', `${candidateSize}px`);
          return (
            text.scrollWidth <= safeArea.width + 0.5 && text.scrollHeight <= safeArea.height + 0.5
          );
        },
      });

      text.style.setProperty('--scramble-auto-fit-size', `${fontSize}px`);
      viewport.style.setProperty('--scramble-rendered-half-height', `${text.scrollHeight / 2}px`);
      text.dataset.autoFit = 'measured';
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);

    void document.fonts?.ready.then(measure);

    return () => {
      isDisposed = true;
      observer.disconnect();
    };
  }, [isLoading, scramble]);

  return (
    <p
      ref={textRef}
      className={`${styles.root} ${styles[density]} ${isLoading ? styles.loading : ''}`}
      data-auto-fit="fallback"
      data-density={density}
    >
      {scramble}
    </p>
  );
};

const readPixelCustomProperty = (
  style: CSSStyleDeclaration,
  property: string,
  fallback: number,
) => {
  const value = Number.parseFloat(style.getPropertyValue(property));
  return Number.isFinite(value) ? value : fallback;
};

const getScrambleDensity = (scramble: string) => {
  const moveCount = scramble.trim().split(/\s+/u).filter(Boolean).length;

  if (moveCount >= 70) {
    return 'dense';
  }

  if (moveCount >= 36) {
    return 'compact';
  }

  return 'regular';
};
