import { generateScramble, generateScrambleImage } from '../src/index';
import type { WcaEvent } from '../src/index';

const eventSelect = document.getElementById('event') as HTMLSelectElement;
const generateBtn = document.getElementById('generate') as HTMLButtonElement;
const scrambleText = document.getElementById('scramble-text') as HTMLDivElement;
const svgContainer = document.getElementById('svg-container') as HTMLDivElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

const run = async (): Promise<void> => {
  const event = eventSelect.value as WcaEvent;
  generateBtn.disabled = true;
  statusEl.textContent = 'Generating…';
  scrambleText.textContent = '…';
  svgContainer.innerHTML = '';

  try {
    const t0 = performance.now();
    const scramble = await generateScramble(event);
    const scrambleMs = Math.round(performance.now() - t0);

    scrambleText.textContent = scramble;

    const t1 = performance.now();
    const svg = await generateScrambleImage(event, scramble, { width: 400, height: 300 });
    const imageMs = Math.round(performance.now() - t1);

    svgContainer.innerHTML = svg;
    statusEl.textContent = `Scramble: ${scrambleMs}ms | Image: ${imageMs}ms`;
  } catch (err) {
    statusEl.textContent = `Error: ${String(err)}`;
    console.error(err);
  } finally {
    generateBtn.disabled = false;
  }
};

generateBtn.addEventListener('click', () => void run());
void run();
