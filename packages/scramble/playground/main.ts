// IMPORTANT: the shim MUST be imported before any import of `@cubekit/scramble`
// so that cstimer_module's browser environment probe sees fake Node globals
// and installs its internal `$` helper. See the shim file for the full story.
import './cstimer-browser-shim.js';
import { getImage, getScramble, getWcaEvents, type WcaEventId } from '../src/index.js';

const selectEl = document.getElementById('event') as HTMLSelectElement;
const generateBtn = document.getElementById('gen') as HTMLButtonElement;
const scrambleEl = document.getElementById('scramble') as HTMLPreElement;
const svgEl = document.getElementById('svg') as HTMLDivElement;

// Populate the dropdown with every supported WCA event.
for (const event of getWcaEvents()) {
  const option = document.createElement('option');
  option.value = event.id;
  option.textContent = `${event.id} — ${event.label}`;
  selectEl.appendChild(option);
}
selectEl.value = '333';

function render(): void {
  const eventId = selectEl.value as WcaEventId;
  try {
    const scramble = getScramble(eventId);
    scrambleEl.textContent = scramble;
    svgEl.innerHTML = getImage(scramble, eventId);
  } catch (err) {
    scrambleEl.textContent = err instanceof Error ? err.message : String(err);
    svgEl.innerHTML = '';
  }
}

generateBtn.addEventListener('click', render);
selectEl.addEventListener('change', render);

// Initial render so the page shows something immediately.
render();
