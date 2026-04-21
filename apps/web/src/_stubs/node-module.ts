// Browser stub for node:module — used by @cubekit/scramble's rolldown CJS runtime.
// createRequire is only needed for Node.js CJS interop; cstimer_module is fully
// bundled into the scramble dist so require() is never actually called at runtime.
export function createRequire(_url: string) {
  return (_id: string): never => {
    throw new Error(`require('${_id}') is not available in browser`)
  }
}
