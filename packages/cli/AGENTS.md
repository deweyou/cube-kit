# @cubegin/cli

This package owns the source for the public `cubegin` command-line interface.

## Commands

```bash
pnpm --filter @cubegin/cli test
pnpm --filter @cubegin/cli typecheck
pnpm --filter @cubegin/cli build
```

## Ownership

- Keep command parsing thin; reusable behavior belongs in `src/handlers`.
- Preserve stable `--json` output for agent callers.
- Do not copy solver or scramble implementation logic into this package.
- Keep bundled agent skill content in the repository root `skills/` directory.
