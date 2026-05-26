# Scramble Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independent `apps/playground` app for manually and automatically testing `@cubekit/scramble-core` and `@cubekit/scramble-image`.

**Architecture:** The app is a Vite + React workbench with a narrow local adapter boundary around package calls. `scramble-core` generation, `scramble-image` rendering, and diagnostics stay separate in the UI so the app can be used both as a manual TNoodle-like tool page and as a future Playwright E2E target.

**Tech Stack:** TypeScript 5 strict mode, pnpm workspaces, vite-plus, React 19, Vitest, React Testing Library, `@cubekit/scramble-core`, `@cubekit/scramble-image`, `@cubekit/scramble-puzzle`

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `docs/superpowers/specs/2026-05-26-scramble-playground-design.md`
- `docs/project-structure.md`
- `docs/scramble-runtime.md`
- `packages/scramble-core/src/generator.ts`
- `packages/scramble-image/src/render.ts`
- `packages/scramble-puzzle/src/events.ts`

Continue on `codex/tnoodle-scramble-packages`; the playground depends on the new packages already on this branch.

## File Structure

Create a new app under `apps/playground`:

```text
apps/playground/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    app.tsx
    app.test.tsx
    main.tsx
    styles.css
    vite-env.d.ts
    playground/
      copy.ts
      copy.test.ts
      download.ts
      download.test.ts
      playground-service.ts
      playground-service.test.ts
      seeded-random.ts
      seeded-random.test.ts
      types.ts
      use-playground.ts
      use-playground.test.ts
```

Modify:

```text
package.json
```

The app should not import from `apps/web` or `packages/scramble`.

## Task 1: Scaffold The Playground App

**Files:**

- Create: `apps/playground/package.json`
- Create: `apps/playground/tsconfig.json`
- Create: `apps/playground/vite.config.ts`
- Create: `apps/playground/index.html`
- Create: `apps/playground/src/vite-env.d.ts`
- Create: `apps/playground/src/main.tsx`
- Create: `apps/playground/src/app.tsx`
- Create: `apps/playground/src/styles.css`
- Modify: `package.json`

- [ ] **Step 1: Write the failing scaffold check**

Run:

```bash
pnpm --filter playground typecheck
```

Expected: FAIL because workspace package `playground` does not exist.

- [ ] **Step 2: Add package manifest**

Create `apps/playground/package.json`:

```json
{
  "name": "playground",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vp dev",
    "build": "tsc && vp build",
    "preview": "vp preview",
    "test": "vp test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@cubekit/scramble-core": "workspace:*",
    "@cubekit/scramble-image": "workspace:*",
    "@cubekit/scramble-puzzle": "workspace:*",
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "@testing-library/react": "^16",
    "@testing-library/user-event": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "@vitejs/plugin-react": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vite-plus": "catalog:",
    "vitest": "catalog:"
  }
}
```

- [ ] **Step 3: Add TypeScript and Vite config**

Create `apps/playground/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "esnext",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
}
```

Create `apps/playground/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
});
```

- [ ] **Step 4: Add minimal app shell**

Create `apps/playground/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CubeKit Scramble Playground</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/playground/src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

Create `apps/playground/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create `apps/playground/src/app.tsx`:

```tsx
export const App = () => <main>CubeKit Scramble Playground</main>;
```

Create `apps/playground/src/styles.css`:

```css
:root {
  color: #172026;
  background: #f5f7f8;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

body {
  margin: 0;
}
```

- [ ] **Step 5: Add root scripts**

Modify root `package.json` scripts:

```json
"dev:playground": "vp run playground#dev",
"build:playground": "vp run playground#build"
```

Keep existing scripts unchanged.

- [ ] **Step 6: Verify scaffold**

Run:

```bash
pnpm --filter playground typecheck
pnpm --filter playground build
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

```bash
git add package.json apps/playground
git commit -m "feat(playground): scaffold scramble playground app"
```

## Task 2: Add Deterministic Package Adapter

**Files:**

- Create: `apps/playground/src/playground/types.ts`
- Create: `apps/playground/src/playground/seeded-random.ts`
- Create: `apps/playground/src/playground/seeded-random.test.ts`
- Create: `apps/playground/src/playground/playground-service.ts`
- Create: `apps/playground/src/playground/playground-service.test.ts`

- [ ] **Step 1: Write seeded random tests**

Create `apps/playground/src/playground/seeded-random.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createSeededRandomSource } from './seeded-random';

describe('createSeededRandomSource', () => {
  it('returns the same sequence for the same seed', () => {
    const first = createSeededRandomSource(123);
    const second = createSeededRandomSource(123);

    expect([first.nextInt(10), first.nextInt(10), first.nextInt(10)]).toEqual([
      second.nextInt(10),
      second.nextInt(10),
      second.nextInt(10),
    ]);
  });

  it('keeps nextInt inside the exclusive upper bound', () => {
    const random = createSeededRandomSource(7);

    for (let index = 0; index < 100; index += 1) {
      const value = random.nextInt(3);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(3);
    }
  });
});
```

- [ ] **Step 2: Run seeded random tests and verify RED**

Run:

```bash
pnpm --filter playground test -- src/playground/seeded-random.test.ts
```

Expected: FAIL because `seeded-random.ts` does not exist.

- [ ] **Step 3: Implement seeded random**

Create `apps/playground/src/playground/seeded-random.ts`:

```ts
import type { RandomSource } from '@cubekit/scramble-core';

export const createSeededRandomSource = (seed: number): RandomSource => {
  let state = seed >>> 0;

  return {
    nextInt(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError(`maxExclusive must be a positive integer, got ${maxExclusive}`);
      }

      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

      return Math.floor((state / 0x100000000) * maxExclusive);
    },
  };
};
```

- [ ] **Step 4: Verify seeded random tests pass**

Run:

```bash
pnpm --filter playground test -- src/playground/seeded-random.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write service tests**

Create `apps/playground/src/playground/playground-service.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createPlaygroundService } from './playground-service';

describe('createPlaygroundService', () => {
  it('generates scrambles and renders the first SVG', async () => {
    const service = createPlaygroundService({ seed: 42, now: fixedClock([10, 22, 25, 30]) });

    const result = await service.generate({ eventId: '333', count: 2, multiBlindCubeCount: 3 });

    expect(result.scrambles).toHaveLength(2);
    expect(result.selectedScramble?.eventId).toBe('333');
    expect(result.svg).toContain('<svg');
    expect(result.generation.durationMs).toBe(12);
    expect(result.render.durationMs).toBe(5);
    expect(result.render.svgBytes).toBeGreaterThan(100);
  });

  it('renders manual scramble text without generating a batch', () => {
    const service = createPlaygroundService({ seed: 42, now: fixedClock([1, 4]) });

    const result = service.renderManual({
      eventId: '333',
      scramble: "R U R' U'",
    });

    expect(result.svg).toContain('<svg');
    expect(result.render.durationMs).toBe(3);
    expect(result.render.scrambleLength).toBe(9);
  });

  it('returns render errors as data for invalid manual text', () => {
    const service = createPlaygroundService({ seed: 42, now: fixedClock([1, 2]) });

    const result = service.renderManual({
      eventId: '333',
      scramble: 'not-a-move',
    });

    expect(result.svg).toBe('');
    expect(result.error).toContain('not-a-move');
  });
});

const fixedClock = (values: number[]) => {
  let index = 0;

  return () => values[index++] ?? values.at(-1) ?? 0;
};
```

- [ ] **Step 6: Run service tests and verify RED**

Run:

```bash
pnpm --filter playground test -- src/playground/playground-service.test.ts
```

Expected: FAIL because `playground-service.ts` does not exist.

- [ ] **Step 7: Implement service types and adapter**

Create `apps/playground/src/playground/types.ts`:

```ts
import type { WcaEventId } from '@cubekit/scramble-puzzle';

export interface PlaygroundScramble {
  readonly id: string;
  readonly eventId: WcaEventId;
  readonly scramble: string;
}

export interface PlaygroundGenerationDiagnostics {
  readonly durationMs: number;
  readonly count: number;
}

export interface PlaygroundRenderDiagnostics {
  readonly durationMs: number;
  readonly scrambleLength: number;
  readonly svgBytes: number;
}

export interface PlaygroundGenerateInput {
  readonly eventId: WcaEventId;
  readonly count: number;
  readonly multiBlindCubeCount: number;
}

export interface PlaygroundManualRenderInput {
  readonly eventId: WcaEventId;
  readonly scramble: string;
}

export interface PlaygroundGenerateResult {
  readonly scrambles: readonly PlaygroundScramble[];
  readonly selectedScramble: PlaygroundScramble | undefined;
  readonly svg: string;
  readonly generation: PlaygroundGenerationDiagnostics;
  readonly render: PlaygroundRenderDiagnostics;
}

export interface PlaygroundManualRenderResult {
  readonly svg: string;
  readonly render: PlaygroundRenderDiagnostics;
  readonly error: string | undefined;
}
```

Create `apps/playground/src/playground/playground-service.ts`:

```ts
import { createDefaultScrambleGenerator, type RandomSource } from '@cubekit/scramble-core';
import { renderScrambleImage } from '@cubekit/scramble-image';
import { createSeededRandomSource } from './seeded-random';
import type {
  PlaygroundGenerateInput,
  PlaygroundGenerateResult,
  PlaygroundManualRenderInput,
  PlaygroundManualRenderResult,
  PlaygroundRenderDiagnostics,
} from './types';

export interface PlaygroundServiceOptions {
  readonly seed?: number;
  readonly now?: () => number;
  readonly random?: RandomSource;
}

export const createPlaygroundService = ({
  seed,
  now = () => performance.now(),
  random,
}: PlaygroundServiceOptions = {}) => {
  const randomSource = random ?? createSeededRandomSource(seed ?? Date.now());
  const generator = createDefaultScrambleGenerator({ random: randomSource });

  return {
    async generate(input: PlaygroundGenerateInput): Promise<PlaygroundGenerateResult> {
      const generationStart = now();
      const results = await generator.generateBatch(input.eventId, input.count, {
        multiBlindCubeCount: input.multiBlindCubeCount,
      });
      const generationEnd = now();

      const scrambles = results.map((result, index) => ({
        id: `${result.eventId}-${index + 1}`,
        eventId: result.eventId,
        scramble: result.scramble,
      }));
      const selectedScramble = scrambles[0];
      const renderStart = now();
      const svg = selectedScramble
        ? renderScrambleImage(selectedScramble.eventId, selectedScramble.scramble)
        : '';
      const renderEnd = now();

      return {
        scrambles,
        selectedScramble,
        svg,
        generation: {
          durationMs: generationEnd - generationStart,
          count: scrambles.length,
        },
        render: createRenderDiagnostics({
          durationMs: renderEnd - renderStart,
          scramble: selectedScramble?.scramble ?? '',
          svg,
        }),
      };
    },
    renderManual(input: PlaygroundManualRenderInput): PlaygroundManualRenderResult {
      const renderStart = now();

      try {
        const svg = renderScrambleImage(input.eventId, input.scramble);
        const renderEnd = now();

        return {
          svg,
          render: createRenderDiagnostics({
            durationMs: renderEnd - renderStart,
            scramble: input.scramble,
            svg,
          }),
          error: undefined,
        };
      } catch (error) {
        const renderEnd = now();

        return {
          svg: '',
          render: createRenderDiagnostics({
            durationMs: renderEnd - renderStart,
            scramble: input.scramble,
            svg: '',
          }),
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
};

const createRenderDiagnostics = ({
  durationMs,
  scramble,
  svg,
}: {
  readonly durationMs: number;
  readonly scramble: string;
  readonly svg: string;
}): PlaygroundRenderDiagnostics => ({
  durationMs,
  scrambleLength: scramble.length,
  svgBytes: new TextEncoder().encode(svg).length,
});
```

- [ ] **Step 8: Verify service tests pass**

Run:

```bash
pnpm --filter playground test -- src/playground/seeded-random.test.ts src/playground/playground-service.test.ts
pnpm --filter playground typecheck
```

Expected: both commands pass.

- [ ] **Step 9: Commit**

```bash
git add apps/playground/src/playground
git commit -m "feat(playground): add scramble package adapter"
```

## Task 3: Add Playground State Model

**Files:**

- Create: `apps/playground/src/playground/use-playground.ts`
- Create: `apps/playground/src/playground/use-playground.test.ts`

- [ ] **Step 1: Write state tests**

Create `apps/playground/src/playground/use-playground.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePlayground } from './use-playground';

describe('usePlayground', () => {
  it('generates a batch and selects the first scramble', async () => {
    const { result } = renderHook(() => usePlayground({ service: fakeService() }));

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.scrambles).toHaveLength(2);
    expect(result.current.selectedScramble?.id).toBe('333-1');
    expect(result.current.svg).toContain('<svg');
    expect(result.current.generationError).toBeUndefined();
  });

  it('renders manual text without replacing generated scrambles', async () => {
    const { result } = renderHook(() => usePlayground({ service: fakeService() }));

    await act(async () => {
      await result.current.generate();
    });
    act(() => {
      result.current.setManualScramble("R U R' U'");
    });
    act(() => {
      result.current.renderManual();
    });

    expect(result.current.scrambles).toHaveLength(2);
    expect(result.current.manualSvg).toBe('<svg>manual</svg>');
  });
});

const fakeService = () => ({
  async generate() {
    return {
      scrambles: [
        { id: '333-1', eventId: '333' as const, scramble: "R U R' U'" },
        { id: '333-2', eventId: '333' as const, scramble: 'F2 U2' },
      ],
      selectedScramble: { id: '333-1', eventId: '333' as const, scramble: "R U R' U'" },
      svg: '<svg>generated</svg>',
      generation: { durationMs: 1, count: 2 },
      render: { durationMs: 2, scrambleLength: 9, svgBytes: 20 },
    };
  },
  renderManual() {
    return {
      svg: '<svg>manual</svg>',
      render: { durationMs: 3, scrambleLength: 9, svgBytes: 17 },
      error: undefined,
    };
  },
});
```

- [ ] **Step 2: Run state tests and verify RED**

Run:

```bash
pnpm --filter playground test -- src/playground/use-playground.test.ts
```

Expected: FAIL because `use-playground.ts` does not exist.

- [ ] **Step 3: Implement state hook**

Create `apps/playground/src/playground/use-playground.ts`:

```ts
import { useMemo, useState } from 'react';
import type { WcaEventId } from '@cubekit/scramble-puzzle';
import { createPlaygroundService } from './playground-service';
import type {
  PlaygroundGenerateResult,
  PlaygroundManualRenderResult,
  PlaygroundScramble,
} from './types';

export type PlaygroundService = ReturnType<typeof createPlaygroundService>;

export interface UsePlaygroundOptions {
  readonly service?: PlaygroundService;
}

export const usePlayground = ({ service }: UsePlaygroundOptions = {}) => {
  const packageService = useMemo(() => service ?? createPlaygroundService(), [service]);
  const [eventId, setEventId] = useState<WcaEventId>('333');
  const [count, setCount] = useState(5);
  const [multiBlindCubeCount, setMultiBlindCubeCount] = useState(3);
  const [scrambles, setScrambles] = useState<readonly PlaygroundScramble[]>([]);
  const [selectedScramble, setSelectedScramble] = useState<PlaygroundScramble | undefined>();
  const [svg, setSvg] = useState('');
  const [manualScramble, setManualScramble] = useState('');
  const [manualSvg, setManualSvg] = useState('');
  const [generationResult, setGenerationResult] = useState<PlaygroundGenerateResult>();
  const [manualResult, setManualResult] = useState<PlaygroundManualRenderResult>();
  const [generationError, setGenerationError] = useState<string>();

  const generate = async () => {
    setGenerationError(undefined);

    try {
      const result = await packageService.generate({ eventId, count, multiBlindCubeCount });
      setGenerationResult(result);
      setScrambles(result.scrambles);
      setSelectedScramble(result.selectedScramble);
      setSvg(result.svg);
      setManualScramble(result.selectedScramble?.scramble ?? '');
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : String(error));
    }
  };

  const selectScramble = (scramble: PlaygroundScramble) => {
    setSelectedScramble(scramble);
    const result = packageService.renderManual({
      eventId: scramble.eventId,
      scramble: scramble.scramble,
    });
    setSvg(result.svg);
    setManualScramble(scramble.scramble);
    setManualResult(result);
  };

  const renderManual = () => {
    const result = packageService.renderManual({ eventId, scramble: manualScramble });
    setManualResult(result);
    setManualSvg(result.svg);
  };

  return {
    eventId,
    setEventId,
    count,
    setCount,
    multiBlindCubeCount,
    setMultiBlindCubeCount,
    scrambles,
    selectedScramble,
    selectScramble,
    svg,
    manualScramble,
    setManualScramble,
    manualSvg,
    generationResult,
    manualResult,
    generationError,
    generate,
    renderManual,
  };
};
```

- [ ] **Step 4: Verify state tests pass**

Run:

```bash
pnpm --filter playground test -- src/playground/use-playground.test.ts
pnpm --filter playground typecheck
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add apps/playground/src/playground/use-playground.ts apps/playground/src/playground/use-playground.test.ts
git commit -m "feat(playground): add scramble workbench state"
```

## Task 4: Build The Split Workbench UI

**Files:**

- Modify: `apps/playground/src/app.tsx`
- Modify: `apps/playground/src/app.test.tsx`
- Modify: `apps/playground/src/styles.css`

- [ ] **Step 1: Write UI tests**

Create `apps/playground/src/app.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './app';

afterEach(cleanup);

describe('App', () => {
  it('generates scrambles and renders an SVG preview', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByText(/scramble-core/i)).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(screen.getByTestId('svg-preview').querySelector('svg')).toBeTruthy();
    expect(screen.getByText(/Generation/i)).toBeTruthy();
  });

  it('shows MultiBLD cube count only for 333mbld', async () => {
    render(<App />);

    expect(screen.queryByLabelText('MultiBLD cubes')).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText('Event'), '333mbld');

    expect(screen.getByLabelText('MultiBLD cubes')).toBeTruthy();
  });

  it('renders manual scramble text through scramble-image', async () => {
    render(<App />);

    await userEvent.clear(screen.getByLabelText('Manual scramble'));
    await userEvent.type(screen.getByLabelText('Manual scramble'), "R U R' U'");
    await userEvent.click(screen.getByRole('button', { name: 'Render manual scramble' }));

    expect(screen.getByTestId('manual-svg-preview').querySelector('svg')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run UI tests and verify RED**

Run:

```bash
pnpm --filter playground test -- src/app.test.tsx
```

Expected: FAIL because the current app shell has no controls or preview.

- [ ] **Step 3: Implement the workbench UI**

Replace `apps/playground/src/app.tsx` with a component that:

```tsx
import { WCA_EVENT_IDS, WCA_EVENT_INFO, type WcaEventId } from '@cubekit/scramble-puzzle';
import { usePlayground } from './playground/use-playground';

export const App = () => {
  const playground = usePlayground();

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">CubeKit</p>
          <h1>Scramble Playground</h1>
        </div>
        <p className="baseline">TNoodle baseline: WCA 1.2.3</p>
      </header>

      <section className="workbench">
        <aside className="panel controls-panel" aria-label="Controls">
          <label>
            Event
            <select
              value={playground.eventId}
              onChange={(event) => playground.setEventId(event.currentTarget.value as WcaEventId)}
            >
              {WCA_EVENT_IDS.map((eventId) => (
                <option key={eventId} value={eventId}>
                  {eventId} - {WCA_EVENT_INFO[eventId].label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Count
            <input
              min={1}
              max={20}
              type="number"
              value={playground.count}
              onChange={(event) => playground.setCount(Number(event.currentTarget.value))}
            />
          </label>

          {playground.eventId === '333mbld' ? (
            <label>
              MultiBLD cubes
              <input
                min={2}
                max={99}
                type="number"
                value={playground.multiBlindCubeCount}
                onChange={(event) =>
                  playground.setMultiBlindCubeCount(Number(event.currentTarget.value))
                }
              />
            </label>
          ) : null}

          <button type="button" onClick={() => void playground.generate()}>
            Generate
          </button>
        </aside>

        <section className="panel core-panel">
          <div className="panel-heading">
            <p className="eyebrow">scramble-core</p>
            <h2>Generated scrambles</h2>
          </div>
          <ol className="scramble-list">
            {playground.scrambles.map((scramble) => (
              <li key={scramble.id}>
                <button type="button" onClick={() => playground.selectScramble(scramble)}>
                  {scramble.scramble}
                </button>
              </li>
            ))}
          </ol>
          {playground.generationError ? (
            <p className="error" role="alert">
              {playground.generationError}
            </p>
          ) : null}
          <Diagnostics
            title="Generation"
            values={[
              ['Count', String(playground.generationResult?.generation.count ?? 0)],
              ['ms', formatMs(playground.generationResult?.generation.durationMs)],
            ]}
          />
        </section>

        <section className="panel image-panel">
          <div className="panel-heading">
            <p className="eyebrow">scramble-image</p>
            <h2>SVG preview</h2>
          </div>
          <div
            className="svg-preview"
            data-testid="svg-preview"
            dangerouslySetInnerHTML={{ __html: playground.svg }}
          />
          <Diagnostics
            title="Render"
            values={[
              ['Scramble chars', String(playground.generationResult?.render.scrambleLength ?? 0)],
              ['SVG bytes', String(playground.generationResult?.render.svgBytes ?? 0)],
              ['ms', formatMs(playground.generationResult?.render.durationMs)],
            ]}
          />
        </section>
      </section>

      <section className="manual-panel panel">
        <div className="panel-heading">
          <p className="eyebrow">Manual render</p>
          <h2>Test scramble-image directly</h2>
        </div>
        <label>
          Manual scramble
          <textarea
            value={playground.manualScramble}
            onChange={(event) => playground.setManualScramble(event.currentTarget.value)}
          />
        </label>
        <button type="button" onClick={playground.renderManual}>
          Render manual scramble
        </button>
        {playground.manualResult?.error ? (
          <p className="error" role="alert">
            {playground.manualResult.error}
          </p>
        ) : null}
        <div
          className="svg-preview compact"
          data-testid="manual-svg-preview"
          dangerouslySetInnerHTML={{ __html: playground.manualSvg }}
        />
      </section>
    </main>
  );
};

const Diagnostics = ({
  title,
  values,
}: {
  readonly title: string;
  readonly values: readonly (readonly [string, string])[];
}) => (
  <dl className="diagnostics" aria-label={title}>
    {values.map(([label, value]) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

const formatMs = (value: number | undefined) => (value === undefined ? '0.0' : value.toFixed(1));
```

- [ ] **Step 4: Add focused workbench styling**

Update `apps/playground/src/styles.css` with stable layout, readable panel sizing,
button states, scrollable scramble lists, and responsive behavior. Use restrained
neutral colors plus small accent colors. Ensure text never overlaps at desktop or
mobile widths.

- [ ] **Step 5: Verify UI tests pass**

Run:

```bash
pnpm --filter playground test -- src/app.test.tsx
pnpm --filter playground test
pnpm --filter playground typecheck
```

Expected: all commands pass.

- [ ] **Step 6: Commit**

```bash
git add apps/playground/src
git commit -m "feat(playground): build scramble workbench UI"
```

## Task 5: Add Copy And Download Utilities

**Files:**

- Create: `apps/playground/src/playground/copy.ts`
- Create: `apps/playground/src/playground/copy.test.ts`
- Create: `apps/playground/src/playground/download.ts`
- Create: `apps/playground/src/playground/download.test.ts`
- Modify: `apps/playground/src/app.tsx`
- Modify: `apps/playground/src/app.test.tsx`

- [ ] **Step 1: Write utility tests**

Create `copy.test.ts` and `download.test.ts` to verify:

```ts
import { describe, expect, it, vi } from 'vitest';
import { writeScramblesToClipboard } from './copy';

describe('writeScramblesToClipboard', () => {
  it('formats numbered scrambles for copying', async () => {
    const writeText = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    await writeScramblesToClipboard(
      [
        { id: '333-1', eventId: '333', scramble: 'R U' },
        { id: '333-2', eventId: '333', scramble: 'F2' },
      ],
      { writeText },
    );

    expect(writeText).toHaveBeenCalledWith('1. R U\n2. F2');
  });
});
```

```ts
import { describe, expect, it } from 'vitest';
import { createSvgDownloadName } from './download';

describe('createSvgDownloadName', () => {
  it('includes event id and one-based index', () => {
    expect(createSvgDownloadName({ eventId: '333', index: 0 })).toBe('cubekit-333-1.svg');
  });
});
```

- [ ] **Step 2: Run utility tests and verify RED**

Run:

```bash
pnpm --filter playground test -- src/playground/copy.test.ts src/playground/download.test.ts
```

Expected: FAIL because utility modules do not exist.

- [ ] **Step 3: Implement utilities**

Create:

```ts
// apps/playground/src/playground/copy.ts
import type { PlaygroundScramble } from './types';

export const writeScramblesToClipboard = async (
  scrambles: readonly PlaygroundScramble[],
  clipboard: { readonly writeText: (value: string) => Promise<void> } = navigator.clipboard,
) => {
  await clipboard.writeText(
    scrambles.map((scramble, index) => `${index + 1}. ${scramble.scramble}`).join('\n'),
  );
};
```

```ts
// apps/playground/src/playground/download.ts
import type { WcaEventId } from '@cubekit/scramble-puzzle';

export const createSvgDownloadName = ({
  eventId,
  index,
}: {
  readonly eventId: WcaEventId;
  readonly index: number;
}) => `cubekit-${eventId}-${index + 1}.svg`;
```

- [ ] **Step 4: Wire buttons into UI**

Add Copy and Download SVG buttons to the controls panel. Copy should call
`writeScramblesToClipboard(playground.scrambles)`. Download should create an
object URL for the selected SVG and a temporary anchor with the filename from
`createSvgDownloadName`.

- [ ] **Step 5: Verify utility and UI tests pass**

Run:

```bash
pnpm --filter playground test
pnpm --filter playground typecheck
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add apps/playground/src
git commit -m "feat(playground): add copy and svg download actions"
```

## Task 6: Final Verification And Dev Server Smoke

**Files:**

- Modify only files needed to fix verification failures.

- [ ] **Step 1: Run package verification**

Run:

```bash
pnpm --filter playground test
pnpm --filter playground typecheck
pnpm --filter playground build
pnpm --filter @cubekit/scramble-puzzle test
pnpm --filter @cubekit/scramble-core test
pnpm --filter @cubekit/scramble-image test
```

Expected: all commands pass.

- [ ] **Step 2: Run scoped check**

Run:

```bash
pnpm exec vp check --no-fmt apps/playground/src apps/playground/package.json apps/playground/tsconfig.json apps/playground/vite.config.ts
```

Expected: no warnings, lint errors, or type errors in playground files.

- [ ] **Step 3: Run full check and document known blockers**

Run:

```bash
pnpm check
```

Expected: formatting passes. If full check still fails on existing `apps/web`,
`apps/wx-app`, `packages/scramble`, or docs lint issues unrelated to this app,
report them separately and do not fix them in this plan.

- [ ] **Step 4: Start dev server**

Run:

```bash
pnpm dev:playground
```

Expected: Vite serves the app. Keep the server running and report the local URL.

- [ ] **Step 5: Browser smoke**

Open the local URL in the in-app browser and verify:

- initial page is the workbench
- Generate produces visible scrambles
- SVG preview contains an SVG
- manual render works for `R U R' U'`
- selecting `333mbld` shows MultiBLD cubes

- [ ] **Step 6: Commit**

```bash
git add apps/playground package.json
git commit -m "test(playground): verify scramble playground"
```

Do not create this final verification commit if there are no file changes after
Task 5.

## Plan Self-Review

- Spec coverage: independent `apps/playground`, split workbench UI, manual
  render, diagnostics, deterministic random, future E2E target, and verification
  are covered.
- Placeholder scan: no `TBD`, `TODO`, or open implementation placeholders are
  required for an executor to understand the next step.
- Type consistency: `PlaygroundScramble`, `PlaygroundGenerateResult`,
  `PlaygroundManualRenderResult`, and `PlaygroundService` are introduced before
  later tasks use them.
