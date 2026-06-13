---
name: cubegin
description: Use the Cubegin CLI for Rubik's cube scramble generation, WCA event lookup, and auxiliary solver assistance.
---

# Cubegin CLI

Use the `cubegin` command when a user needs Rubik's cube scramble generation,
WCA event discovery, or Cubegin auxiliary solver assistance.

## Setup Check

Before the first Cubegin command in a session, check whether the CLI is
available:

```bash
command -v cubegin
```

If `cubegin` is not available, tell the user to install the CLI first:

```bash
npm install -g cubegin
```

When a one-off command is acceptable and network/package execution is allowed,
use `npx cubegin@latest ...` as a temporary fallback.

## Rules

- Prefer `--json` for agent calls.
- Treat human-readable output as display-only and do not parse it.
- Use `cubegin scramble events --json` before guessing supported WCA event ids.
- Use `cubegin solver events --json` and `cubegin solver methods <event> --json`
  before guessing solver methods.
- If a command returns `{ "ok": false }`, read `error.code`, `error.message`,
  and `error.hints` before retrying.

## Commands

```bash
cubegin scramble events --json
cubegin scramble generate 333 --count 5 --json
cubegin scramble render 333 "R U R' U'" --json
cubegin solver events --json
cubegin solver methods 333 --json
cubegin solver assist 333 "R U R' U'" --method cross --json
```
