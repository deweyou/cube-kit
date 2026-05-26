import type { PlaygroundScramble } from './types';

export interface ClipboardWriter {
  readonly writeText: (value: string) => Promise<void>;
}

export const writeScramblesToClipboard = async (
  scrambles: readonly PlaygroundScramble[],
  clipboard: ClipboardWriter | undefined = navigator.clipboard,
) => {
  if (!clipboard) {
    throw new Error('Clipboard API is not available');
  }

  await clipboard.writeText(formatScramblesForClipboard(scrambles));
};

export const formatScramblesForClipboard = (scrambles: readonly PlaygroundScramble[]) =>
  scrambles.map((scramble, index) => `${index + 1}. ${scramble.scramble}`).join('\n');
