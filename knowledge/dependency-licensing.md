# Dependency Licensing

## Overview

When a `packages/*` package bundles (inlines) a third-party dependency into its published output, the license of that bundled dependency flows into the license of the combined work. This is most important for **copyleft** licenses (GPL, AGPL, LGPL with static linking), which force the combined work to adopt a compatible license and cannot be relaxed by simply declaring a more permissive license in `package.json`.

This topic codifies a minimum process for keeping our packages legally consistent with what they actually ship.

## Usage

### Before enabling bundling for any new dependency

1. **Locate the license** — check `node_modules/<dep>/package.json` `license` field AND look for a LICENSE / COPYING / NOTICE file in `node_modules/<dep>/`. Many npm packages declare a license in `package.json` but do NOT ship the canonical text; treat this as a yellow flag and fetch the canonical text from the upstream repo.

2. **Classify the license**:

   | Class | Examples | Implication when bundled |
   |---|---|---|
   | **Permissive** | MIT, Apache-2.0, BSD-2/3-Clause, ISC, 0BSD | Safe to bundle into MIT/Apache packages. Must preserve copyright notices in a `NOTICE` file. |
   | **Weak copyleft** | LGPL-2.1/3.0, MPL-2.0 | Bundling statically = combined work must also allow LGPL linking. Usually means the bundling package becomes LGPL or ships object files the user can relink. Gray area — prefer `peerDependencies`. |
   | **Strong copyleft** | GPL-2.0/3.0, AGPL-3.0 | Combined work MUST be GPL-compatible. Cannot ship as MIT/Apache. If the upstream is AGPL, even network use triggers distribution. |
   | **Unknown / custom** | Anything else | STOP. Require explicit review before bundling. |

3. **Cross-check the bundling package's declared license**:

   ```bash
   # Check a single package
   cat packages/<pkg>/package.json | grep '"license"'
   # Check every bundled / transitive dep's license
   pnpm --filter <pkg> licenses list
   ```

4. **Decision gate**: bundle only when the bundling package's license is compatible with every bundled dep's license. Otherwise, pick one of:

   - Change the bundling package's license to match (usually GPL-3.0 when wrapping GPL upstreams).
   - Stop bundling — declare the dep as a `peerDependencies` or load it out-of-process (Web Worker, subprocess, etc.) so the boundary is "mere aggregation" rather than linkage.
   - Replace the dep with a differently-licensed alternative.

### When you bundle a copyleft dependency

1. Set `package.json` `license` to the strictest license in the bundled set (commonly `GPL-3.0`).
2. Ship the full license text as `packages/<pkg>/LICENSE` — do not rely on the upstream tarball, which often does not include it.
3. Add `packages/<pkg>/NOTICE` attributing the bundled dep: name, version, upstream repo, whether modifications were made.
4. Add `LICENSE` and `NOTICE` to `package.json` `files` so they ship in the npm tarball.
5. Update the package's `README.md` to state the license prominently and explain the downstream implication (any consumer of the package inherits the copyleft obligation).
6. Update the package's `CLAUDE.md` with a "License — locked" section so future automation doesn't silently revert to MIT.

### Commands

```bash
# Show every transitive license in the workspace
pnpm licenses list

# Show only for one package
pnpm --filter @cubekit/<pkg> licenses list

# Inspect a specific dep
cat node_modules/<dep>/package.json
ls node_modules/<dep>/LICENSE node_modules/<dep>/COPYING 2>/dev/null
```

## When NOT to use

- You don't need this process if you're only importing a permissive dep and bundling it into an already-permissive package — the license of both is MIT/Apache/BSD, and the only obligation is preserving copyright notices in `NOTICE`. That's still a good practice but not a blocker.
- You don't need this process for `devDependencies` that never ship (test runners, linters, build tools) — they're not part of the published artifact.
- You don't need this process for dynamically loaded code that's clearly out-of-process (e.g., spawning a subprocess, fetching remote scripts at runtime) — that's "mere aggregation" under GPL and does not trigger copyleft on the caller.

## Background

This topic was created after `@cubekit/scramble` bundled `cstimer_module@0.1.5` (GPL-3.0) while declaring itself MIT. The mismatch went unnoticed for the entire feature because:

1. The scaffolded `package.json` had `"license": "MIT"` from its previous life as a text-animation utility with no deps.
2. `cstimer_module`'s npm tarball declares GPL-3.0 in `package.json` but ships no LICENSE file, so a cursory `ls node_modules/cstimer_module/` does not surface the copyleft text.
3. Tests passed, build produced a bundle, playground rendered — everything looked healthy until a license audit was explicitly requested.

The fix was to switch `@cubekit/scramble` to GPL-3.0, ship the full GPL-3.0 text, and add a NOTICE file attributing cstimer_module. The downstream consequence — every app consuming `@cubekit/scramble` inherits GPL-3.0 on distribution — is now a monorepo-wide concern tracked as an open decision.

_Discovered during: 20260410-cstimer-module-packages, 2026-04-10_
