/**
 * Browser shim for cstimer_module — must be the very first import in main.tsx.
 *
 * cstimer_module probes for a Node.js/Worker environment via:
 *   var Na = typeof process === 'object' && typeof require === 'function' && typeof global === 'object';
 *   var lb = (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) || Na;
 *
 * When lb is false (browser main thread), cstimer's init function is never called,
 * so the global `$` helper is never installed, and any call to getScramble/getImage
 * throws `ReferenceError: $ is not defined`.
 *
 * This shim fakes the Node detection by installing minimal process/require/global
 * shims on globalThis BEFORE cstimer_module evaluates, flipping lb to true so the
 * module initialises correctly.
 */

const g = globalThis as unknown as {
  process?: unknown;
  require?: unknown;
  global?: unknown;
};

if (typeof g.process !== 'object') {
  g.process = { browser: true, env: {} };
}

if (typeof g.require !== 'function') {
  g.require = (): Record<string, unknown> => ({});
}

if (typeof g.global !== 'object') {
  g.global = globalThis;
}
