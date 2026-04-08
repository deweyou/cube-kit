const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
const DEFAULT_SPEED = 50;
const DEFAULT_STEPS = 8;

export interface ScrambleOptions {
  /** Character pool to sample from during scramble. Default: alphanumeric + symbols */
  chars?: string;
  /** Milliseconds between each animation frame. Default: 50 */
  speed?: number;
  /** Number of random frames shown per character before it resolves. Default: 8 */
  steps?: number;
}

/**
 * Animate a string by scrambling characters until the target text is revealed.
 *
 * @param target   The final text to reveal.
 * @param options  Animation options.
 * @param onUpdate Called on every frame with the current scrambled string.
 * @returns        A promise that resolves when the animation completes.
 *
 * @example
 * ```ts
 * await scrambleText('Hello World', {}, (text) => {
 *   document.querySelector('#output')!.textContent = text;
 * });
 * ```
 */
export function scrambleText(
  target: string,
  options: ScrambleOptions = {},
  onUpdate?: (current: string) => void,
): Promise<void> {
  const chars = options.chars ?? DEFAULT_CHARS;
  const speed = options.speed ?? DEFAULT_SPEED;
  const steps = options.steps ?? DEFAULT_STEPS;

  return new Promise((resolve) => {
    // Track how many random frames each position has shown.
    const counters = new Array<number>(target.length).fill(0);
    let resolved = 0;

    const tick = () => {
      const frame = target
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (counters[i] >= steps) return char;
          counters[i]++;
          if (counters[i] >= steps) resolved++;
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');

      onUpdate?.(frame);

      if (resolved < target.replace(/ /g, '').length) {
        setTimeout(tick, speed);
      } else {
        onUpdate?.(target);
        resolve();
      }
    };

    tick();
  });
}

/**
 * Animate a DOM element's text content with a scramble effect.
 *
 * @param element  Target DOM element (ignored if null).
 * @param text     The final text to reveal.
 * @param options  Animation options.
 * @returns        A promise that resolves when the animation completes.
 *
 * @example
 * ```ts
 * await scramble(document.querySelector('h1'), 'Hello World');
 * ```
 */
export function scramble(
  element: { textContent: string | null } | null,
  text: string,
  options: ScrambleOptions = {},
): Promise<void> {
  if (!element) return Promise.resolve();
  return scrambleText(text, options, (current) => {
    element.textContent = current;
  });
}

/**
 * Create a reusable scramble controller bound to an update callback.
 *
 * @example
 * ```ts
 * const ctrl = createScrambler((text) => {
 *   myElement.textContent = text;
 * });
 * await ctrl.play('First line');
 * await ctrl.play('Second line', { speed: 30 });
 * ```
 */
export function createScrambler(onUpdate: (current: string) => void) {
  return {
    play(text: string, options?: ScrambleOptions): Promise<void> {
      return scrambleText(text, options, onUpdate);
    },
  };
}
