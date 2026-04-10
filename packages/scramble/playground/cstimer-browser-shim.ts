/**
 * Browser shim for cstimer_module.
 *
 * cstimer_module's entry file does a runtime environment probe like this:
 *
 *   var Na = typeof process === 'object'
 *         && typeof require === 'function'
 *         && typeof global  === 'object';
 *   var lb = (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) || Na;
 *   // ...
 *   tb(void 0, function () {
 *     Na && (global.self = global);
 *     self.$ = { isArray: Array.isArray, noop: ..., now: ... };
 *   }, void 0);
 *
 * `tb` only calls the init function when `lb === true`, which only happens in
 * Node.js or a Web Worker. In a normal browser main thread, `lb === false`, so
 * the global `$` helper object is never installed, and the rest of the module
 * blows up with `ReferenceError: $ is not defined` the moment it tries to use
 * `$.svg` / `$.ctxDrawPolygon` / etc.
 *
 * Upstream README explicitly only supports Node or Web Workers in the browser.
 *
 * Rather than spin up a Worker (which would force the whole `@cubekit/scramble`
 * API to become async just for the playground), we fake the Node detection by
 * installing minimal `process` / `require` / `global` shims on `globalThis`
 * BEFORE importing the package. That flips `Na` to true, which flips `lb` to
 * true, which makes cstimer install its globals correctly, after which
 * everything else just works.
 *
 * This shim is playground-only — consumers of `@cubekit/scramble` who need to
 * run in a browser main thread should either ship their own equivalent shim,
 * run it in a Worker (matching upstream's official guidance), or use this
 * package via a Vite / Webpack plugin that injects the same shim at build time.
 *
 * IMPORTANT: the file that imports this shim MUST import it with a *static*
 * `import './cstimer-browser-shim.js';` statement BEFORE any import of
 * `@cubekit/scramble`. ES module imports are evaluated in source order, so
 * as long as this module is listed first, its side effects will run before
 * the cstimer_module module evaluates.
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
