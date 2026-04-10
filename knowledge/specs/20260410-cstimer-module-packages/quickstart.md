# Quickstart — @cubekit/scramble

## Install

This package is part of the cubekit monorepo. From the repo root:

```bash
pnpm install
```

`cstimer_module` is pulled in automatically as a workspace dependency of `@cubekit/scramble`.

## Use it

```ts
import { getScramble, getImage, setSeed, getWcaEvents } from '@cubekit/scramble';

// 1. Generate a WCA scramble
const scramble = getScramble('333');
console.log(scramble); // "R U R' U' F2 D L2 ..."

// 2. Render it to SVG
const svg = getImage(scramble, '333');
document.querySelector('#preview')!.innerHTML = svg;

// 3. Reproducible scrambles via seed
setSeed('cubekit-2026');
const a = getScramble('444'); // always the same while seed holds

// 4. Iterate all WCA events
for (const event of getWcaEvents()) {
  console.log(event.id, event.label);
}

// 5. Escape hatch for non-WCA cstimer training scrambles
const f2l = getScramble('f2l'); // forwarded to cstimer_module as-is
```

## Run the playground

From repo root:

```bash
pnpm --filter @cubekit/scramble playground
```

Opens a local Vite dev server. Pick an event from the dropdown, click **Generate**, and see both the scramble text and its SVG preview. Re-click to generate another.

## Run the tests

From repo root:

```bash
pnpm test                    # all packages
pnpm --filter @cubekit/scramble test   # just this package
```

Tests cover:

- Every exported function
- Every one of the 17 WCA events (generation + image)
- Seed reproducibility
- Error paths for unknown types
- Escape-hatch behavior for non-WCA types

## Supported WCA events

| ID        | Event            |
| --------- | ---------------- |
| `333`     | 3x3x3 Cube       |
| `222`     | 2x2x2 Cube       |
| `444`     | 4x4x4 Cube       |
| `555`     | 5x5x5 Cube       |
| `666`     | 6x6x6 Cube       |
| `777`     | 7x7x7 Cube       |
| `333bld`  | 3x3 Blindfolded  |
| `333fm`   | 3x3 Fewest Moves |
| `333oh`   | 3x3 One-Handed   |
| `clock`   | Clock            |
| `minx`    | Megaminx         |
| `pyram`   | Pyraminx         |
| `skewb`   | Skewb            |
| `sq1`     | Square-1         |
| `444bld`  | 4x4 Blindfolded  |
| `555bld`  | 5x5 Blindfolded  |
| `333mbld` | 3x3 Multi-Blind  |
