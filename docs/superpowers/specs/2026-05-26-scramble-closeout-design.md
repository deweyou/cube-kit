# Scramble Closeout Design

## Context

Cubegin now contains three TNoodle-compatible packages and a local playground:

- `@cubegin/scramble-puzzle` owns WCA event metadata, notation parsers, state
  transitions, and puzzle definitions.
- `@cubegin/scramble-core` owns WCA scramble generation, random sources, batch
  uniqueness, and solver/random-turn integrations.
- `@cubegin/scramble-image` owns DOM-free SVG rendering from applied puzzle
  states.
- `apps/playground` is a developer workbench for exercising `scramble-core` and
  `scramble-image`.

The closeout work makes those packages maintainable as standalone workspace
units: stronger tests, explicit coverage commands, package-scoped knowledge
routing, aligned license metadata, and updated READMEs.

## Goals

- Add runnable coverage commands for the three new packages and fail when package
  coverage drops below the intended bar.
- Strengthen tests around WCA scramble rules and package contracts rather than
  only line coverage.
- Keep durable knowledge in root `docs/`, organized by package/app owner, while
  package/app `AGENTS.md` files stay lightweight routing documents.
- Align license metadata and attribution for the TNoodle-compatible packages.
- Update README files for package users and repository contributors.

## Non-Goals

- Do not wire the new packages into production apps.
- Do not claim Cubegin is an official WCA scramble program.
- Do not attempt statistical proof of uniform randomness in unit tests.
- Do not rewrite solver internals only to chase uncovered defensive branches.
- Do not fix pre-existing root `pnpm check` failures outside the closeout scope.

## Coverage And WCA Rules

Coverage should be meaningful and package-local:

- Add `test:coverage` scripts for `scramble-puzzle`, `scramble-core`, and
  `scramble-image`.
- Install and use Vitest's V8 coverage provider.
- Prefer package-level threshold config over ad-hoc command flags so CI and
  humans run the same command.
- Exclude test helpers and generated/build output from coverage.

The WCA test matrix should cover current Regulation 4b3 obligations that are
reasonable in unit/integration tests:

- all 17 WCA events remain represented and dispatchable;
- blindfolded cube events append random orientation moves;
- `333mbld` represents one multi-line attempt in core and one per-cube row in
  playground display;
- `222` generated states require at least 4 moves to solve;
- `skewb` generated states require at least 7 moves to solve;
- `pyram` generated states require at least 6 moves to solve;
- `sq1` generated states require at least 11 moves and begin slashable;
- `555`, `666`, `777`, and `minx` use random-turn generation with WCA-length
  token counts;
- generated scrambles are parseable by `scramble-puzzle`;
- every renderable WCA event produces an SVG with a stable root shape.

Tests should check deterministic seeds, structural invariants, parser/state
round-trips, and renderer contracts. Randomness quality remains outside unit
scope and should be documented as upstream-algorithm compatibility.

## Knowledge Layout

Root `docs/` remains the knowledge base. Package/app directories get lightweight
`AGENTS.md` files that route maintainers to the right docs.

Create owner-scoped docs:

```text
docs/packages/scramble-puzzle/
  index.md
  wca-notation-and-state.md
  test-coverage.md
docs/packages/scramble-core/
  index.md
  wca-generation-rules.md
  test-coverage.md
docs/packages/scramble-image/
  index.md
  renderer-contracts.md
  test-coverage.md
docs/apps/playground/
  index.md
  diagnostics-and-e2e.md
```

Each topic document should follow the repo-memory quality rule: Mermaid diagram
first, concise prose, relative links with `#L` anchors where useful, and an update
footer.

Local `AGENTS.md` files should include only:

- package/app responsibility;
- docs to read before changing behavior;
- common verification commands;
- local constraints and traps.

## License Alignment

Use SPDX `GPL-3.0-only` for the TNoodle-compatible packages because
`thewca/tnoodle-lib` `v0.19.2` and Maven `lib-scrambles` `0.19.2` publish under
GPL-v3.0. The `thewca/tnoodle` app repository is AGPL-3.0, but Cubegin's migrated
logic targets `tnoodle-lib`, not the TNoodle server/UI.

Actions:

- update package.json license fields from `GPL-3.0` to `GPL-3.0-only` where
  appropriate;
- add package-level `LICENSE` files for the three new packages by copying the GPL
  v3 text already present at the root;
- add `NOTICE` files attributing the TNoodle/lib-scrambles baseline and stating
  Cubegin is not an official WCA scramble program;
- update docs and READMEs to name the license boundary clearly.

## README Updates

Add package/app READMEs:

- `packages/scramble-puzzle/README.md`: responsibility, exported API families,
  parser/state examples, tests, license.
- `packages/scramble-core/README.md`: generator API, WCA rule coverage,
  deterministic random source expectations, worker-ready async shape, tests,
  license.
- `packages/scramble-image/README.md`: renderer API, SVG contract, supported
  events, tests, license.
- `apps/playground/README.md`: local dev commands, `?seed=`, diagnostics, and E2E
  role.

Update root `README.md` so the workspace layout, quick-start commands, package
section, playground entry, and license note reflect the new architecture.

## Verification

Required closeout verification:

- `pnpm --filter @cubegin/scramble-puzzle test`
- `pnpm --filter @cubegin/scramble-core test`
- `pnpm --filter @cubegin/scramble-image test`
- `pnpm --filter playground test`
- `pnpm --filter @cubegin/scramble-puzzle test:coverage`
- `pnpm --filter @cubegin/scramble-core test:coverage`
- `pnpm --filter @cubegin/scramble-image test:coverage`
- package/app typecheck and build commands touched by the change
- `pnpm test:docs`
- scoped `vp check --no-fmt` over changed files

If root `pnpm check` still fails on known pre-existing app issues, report that
separately and do not hide it.

## Open Decisions

- Coverage thresholds may need one calibration pass after V8 coverage is enabled.
  Start strict for package surface code, then document any unavoidable solver
  defensive exclusions explicitly.
- E2E for the playground remains a follow-up unless adding Playwright becomes part
  of this closeout.

