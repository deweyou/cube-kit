# Cubegin

Cubegin 是一个魔方工具 monorepo，覆盖计时器、打乱生成、打乱可视化、公式列表和练习应用，目标运行环境包括 Web、H5 和微信小程序。

公开 npm 包是 `cubegin`。它同时提供适合 agent 使用的 CLI，以及用于打乱生成、SVG 渲染、魔方记号/状态辅助、图标资产和求解辅助能力的 `cubegin/*` 子路径。

## 使用 Cubegin

### CLI 安装与使用

可以直接通过 `npx` 使用 CLI；如果需要频繁本地使用，也可以全局安装：

```bash
npx cubegin@latest scramble events --json
npx cubegin@latest scramble generate 333 --count 5 --json
npx cubegin@latest scramble render 333 "R U R' U'" --json
npx cubegin@latest solver methods 333 --json
```

```bash
npm install -g cubegin

cubegin scramble events --json
cubegin scramble generate 333 --count 5 --json
```

`npx cubegin@latest install` 会启动安装流程。它可以通过
`npx skills add` 全局安装包内自带的 `cubegin` agent skill，让兼容的
agent 从已安装的 skill 中发现 CLI 使用方式。

### Package 安装与使用

如果要在 JavaScript/TypeScript 中调用打乱、渲染、魔方状态、图标或求解
API，可以安装 `cubegin`：

```bash
pnpm add cubegin
```

这个包刻意不暴露根 API。请从公开子路径导入：

```ts
import { createDefaultScrambleGenerator, createMathRandomSource } from 'cubegin/scramble-core';
import { renderScrambleImage } from 'cubegin/scramble-image';
import { WCA_EVENT_IDS } from 'cubegin/scramble-puzzle';
import { EVENT_ICON_333_SVG } from 'cubegin/icons/events';
import { solvePuzzleAssist } from 'cubegin/solver';

const generator = createDefaultScrambleGenerator({
  random: createMathRandomSource(),
});
const scramble = await generator.generate('333');
const svg = renderScrambleImage('333', scramble.scramble);
const [cross] = solvePuzzleAssist('333', ['cross'], scramble.scramble);

console.log(WCA_EVENT_IDS);
console.log(EVENT_ICON_333_SVG);
console.log(scramble.scramble);
console.log(svg);
console.log(cross.solutions[0]?.solution);
```

## License - GPL-3.0-only

本仓库使用 **GPL-3.0-only** 许可证。完整文本见 [`LICENSE`](./LICENSE)。

**为什么是 GPL-3.0-only**：TNoodle-compatible 的打乱包移植了
`thewca/tnoodle-lib` / `lib-scrambles` v0.19.2 的行为，而该库使用
GPL-v3.0。仓库和发布包都会对齐这个许可证边界。

完整说明和可选路径见 [`docs/dependency-licensing.md`](./docs/dependency-licensing.md)。

## 工作区结构

```text
cubegin/
├── apps/
│   ├── playground/       # scramble package testing workbench
│   ├── scramble-docs/    # bilingual VitePress learning site
│   ├── web/              # React 18 web + H5 app
│   └── wx-app/           # Taro WeChat miniprogram
├── packages/
│   ├── core/             # public cubegin npm package and bundled entrypoints
│   ├── cli/              # cubegin CLI source
│   ├── icons/            # Cubegin brand and event icon assets
│   ├── scramble-puzzle/  # shared WCA notation, parser, and state contracts
│   ├── scramble-core/    # TNoodle-compatible WCA scramble generation
│   ├── scramble-image/   # DOM-free SVG rendering for scramble states
│   └── solver/           # auxiliary and full solver helpers
└── docs/                 # repository memory and Superpowers specs/plans
```

- `apps/*`：入口应用。共享逻辑不要放在这里。
- `packages/*`：可复用、平台无关的库。`src/` 不能直接依赖 DOM、Taro 或平台全局变量。
- `packages/core`：公开 npm 发布边界。它的 README 由根目录 README 同步生成，是 npm package 落地页。
- `docs/`：仓库记忆，包括 [project structure](./docs/project-structure.md)、[timer workflow](./docs/timer-workflow.md)、[scramble runtime](./docs/scramble-runtime.md) 和 [dependency licensing](./docs/dependency-licensing.md)。

## 仓库开发

需要 **Node ≥ 22.12** 和 **pnpm 10**。

```bash
pnpm install

# Dev servers
pnpm dev:playground       # scramble-core/image testing workbench
pnpm dev:scramble-docs    # bilingual scramble learning site
pnpm dev:web              # React 18 web dev server
pnpm dev:wx               # WeChat miniprogram (Taro) dev server

# Workspace-wide
pnpm build                # vp run build -r
pnpm test                 # docs guard + vp run test -r
pnpm test:docs            # verify docs/ is the harness knowledge base
pnpm check                # vp check (lint + format)

# New TNoodle-compatible packages
pnpm --filter @cubegin/scramble-puzzle test:coverage
pnpm --filter @cubegin/scramble-core test:coverage
pnpm --filter @cubegin/scramble-image test:coverage
pnpm --filter playground test
pnpm build:scramble-docs
```

所有 build / test / lint 命令都通过 [vite-plus](https://github.com/voidzero-dev/vite-plus)（`vp`）运行。除非包内脚本明确这样做，不要直接调用 `vite`、`vitest` 或 `tsc`。

## Packages

### [`@cubegin/scramble-puzzle`](./packages/scramble-puzzle) - Puzzle contracts

共享 WCA 项目元数据、parser、状态转换和 puzzle definition，覆盖 cube、Clock、Megaminx、Pyraminx、Skewb 和 Square-1。

### [`@cubegin/scramble-core`](./packages/scramble-core) - Scramble generation

TNoodle-compatible 的 WCA 打乱生成，覆盖 17 个支持的 event id，包括最短距离过滤、BLD no-inspection orientation moves、Fewest Moves padding，以及多行 `333mbld` 输出。

### [`@cubegin/scramble-image`](./packages/scramble-image) - SVG previews

DOM-free 的打乱状态 SVG 渲染。它使用 `scramble-puzzle` parser，将打乱应用到已复原状态，并返回独立 SVG 字符串。

### [`cubegin`](./packages/core) - Public npm package

公开发布包，暴露选定的 `cubegin/*` 子路径和 `cubegin` CLI bin。它是发布到 npm 的包。

### [`@cubegin/cli`](./packages/cli) - CLI source

适合 agent 使用的命令树，覆盖打乱生成、打乱渲染、求解辅助和 bundled skill 安装。它通过公开的 `cubegin` 包产出。

### [`@cubegin/solver`](./packages/solver) - Solver helpers

用于打乱生成、诊断和 CLI solver 命令的辅助与完整求解 helpers。

### [`apps/web`](./apps/web) - Timer app

React Web/H5 计时器 UI。它直接消费 `@cubegin/timer`、`@cubegin/scramble-core`、`@cubegin/scramble-puzzle` 和 `@cubegin/scramble-image`。

### [`apps/playground`](./apps/playground) - Testing workbench

用于在接入生产应用前测试 `scramble-core` 和 `scramble-image` 的 React playground。它包含 seeded runs、批量生成、手动渲染、SVG 下载和轻量诊断。

### [`apps/scramble-docs`](./apps/scramble-docs) - Learning site

用于学习 WCA 打乱生成和打乱图渲染原理的中英双语 VitePress 站点。它是内容型应用，聚焦规则、各项目生成策略、状态转换和 SVG 渲染。

## Agent memory

仓库指令从 [`AGENTS.md`](./AGENTS.md) 开始。持久知识位于 `docs/`，Superpowers specs 和 plans 位于 [`docs/superpowers/`](./docs/superpowers/)。

先阅读 [docs/project-structure.md](./docs/project-structure.md)，再根据要修改的区域阅读对应专题文档。

## Contributing

打开 PR 前：

1. `pnpm test`：所有 workspace 测试必须通过
2. `pnpm --filter <pkg> typecheck`：被修改的 package 必须通过 typecheck
3. `pnpm build`：被修改的 package 必须能干净构建，包括发布包的 `.d.mts`
4. `pnpm check`：本次变更涉及的 lint 和 format 必须干净；其他 package 的历史遗留问题不属于当前变更
5. 对新的 scramble packages，在被修改的 package 上运行 `test:coverage`，并保持 `vite.config.ts` 中的 package-level thresholds

任何通过 `deps.alwaysBundle`、`noExternal` 或其他静态 bundling 路径新增的依赖，都必须在合入前完成 license audit。决策流程见 [`docs/dependency-licensing.md`](./docs/dependency-licensing.md)。
