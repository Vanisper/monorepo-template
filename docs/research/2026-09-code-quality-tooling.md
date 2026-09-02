# 编码规范 / 代码质量工具链选型调研（Lint / Format / Hooks / Commit）

> 调研日期：2026-09-03。结论以各工具官方文档、GitHub 仓库与官方 blog 为准，附来源链接。
> 背景：为「前端单仓多库（monorepo）模板项目」补充编码规范工具链。模板现状：pnpm 11 workspaces + catalogs、Turborepo 2、tsdown、Changesets v3、Vitest 4，Node ≥ 22.18，纯 TS 库定位，内部使用。

---

## 〇、2025–2026 年生态大背景

- **ESLint v10 于 2026-02-06 正式发布**（当前 10.9.1，2026-08-24）
  - eslintrc 体系被彻底移除（`.eslintrc.*`、`.eslintignore` 不再生效），flat config 成为唯一配置形态
  - 配置查找改为「从被 lint 文件所在目录向上查找」，天然利好 monorepo 多配置
  - 要求 Node `^20.19.0 || ^22.13.0 || >=24`
  - 来源：[ESLint v10.0.0 released](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)、[What's coming in ESLint v10.0.0](https://eslint.org/blog/2025/10/whats-coming-in-eslint-10.0.0/)

- **oxc 系全面成熟**
  - oxlint 1.x 稳定版（当前 1.81.0）规则总数达 870+
  - **类型感知 lint 于 2026-07-22 宣布稳定**（tsgolint v7，基于 tsgo，覆盖 typescript-eslint 61 条 type-aware 规则中的 59 条）
  - oxfmt 于 2026-02-24 达到 beta（100% 通过 Prettier 的 JS/TS 一致性测试），尚未 GA
  - 来源：[Type-Aware Linting Stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)、[Oxfmt Beta](https://oxc.rs/blog/2026-02-24-oxfmt-beta)、[oxlint rules](https://oxc.rs/docs/guide/usage/linter/rules.html)

- **Biome v2（codename Biotype）2025-06 发布**（当前 2.5.11，2026-08-27）
  - 提供了不依赖 TypeScript 编译器的 type-aware lint
  - v2.3（2025-10）起支持 Vue / Svelte / Astro 全文件（HTML/CSS/JS 部分）
  - **但截至 v2.5.11 仍是 🟡 experimental**：需显式开启 `html.experimentalFullSupportEnabled`，跨语言规则存在已知误报，官方明确不建议在生产项目直接使用
  - 来源：[Biome v2](https://biomejs.dev/blog/biome-v2/)、[Biome v2.3](https://biomejs.dev/blog/biome-v2-3/)、[Biome language-support 文档](https://biomejs.dev/internals/language-support/)

- **Prettier 3.9（2026-06）持续活跃**（当前 3.9.6）
  - 社区地位稳固，但面临 oxfmt / Biome 的性能挑战
  - 来源：[Prettier 3.9 blog](https://prettier.io/blog/2026/06/27/3.9.0)

- **Cloudflare 2026-06 收购 VoidZero**（Vite / Vitest / Rolldown / Oxc 的母公司）
  - oxc 系的长期投入有背书
  - 来源见同目录 `2026-09-monorepo-tech-selection.md`

---

## 一、Lint 工具

### 1.1 现状速览

| 工具 | 最新版本（2026-09-03） | 定位 | 维护状态 |
|---|---|---|---|
| ESLint | 10.9.1 | 生态基准，插件体系最完整 | ✅ 活跃（OpenJSF） |
| typescript-eslint | 8.69.0（monorepo 单版本线 v8.x） | ESLint 的 TS 解析 + TS 专属规则（含 type-aware） | ✅ 活跃，已支持 ESLint 10 |
| @antfu/eslint-config | 9.5.1 | antfu 的 opinionated flat config 预设（含格式化职责，可免 Prettier） | ✅ 非常活跃（2026-09-02 刚发版） |
| oxlint (+oxlint-tsgolint) | 1.81.0 / 7.0.2001 | Rust 超高速 linter；type-aware 走 tsgo 的 tsgolint | ✅ 活跃（VoidZero/oxc） |
| Biome | 2.5.11 | Rust linter + formatter 一体 | ✅ 活跃（Biome 社区） |

### 1.2 对比表

| 维度 | ESLint(+typescript-eslint) | @antfu/eslint-config | oxlint + tsgolint | Biome linter |
|---|---|---|---|---|
| 规则覆盖 | 核心 ~300 条 + 插件 10,000+；TS 专属规则最全 | 基于 ESLint 全家桶精选（js/ts/vue/jsonc/yaml/toml/md/unicorn 等），开箱即用 | 870+ 条（含 ESLint core、typescript、unicorn、import、jsdoc、react、vitest 等移植）；type-aware 59/61 | ~400+ 条，含不依赖 tsc 的 type-aware 规则 |
| type-aware 规则 | ✅ 完整（typescript-eslint，基于 tsc 类型服务，慢） | ✅ 可选开启（`typescript: { tsconfigPath }`） | ✅ 2026-07 稳定，`--type-aware` 调用 tsgolint（tsgo），比 typescript-eslint 快约 1–2 个数量级；可加 `--type-check` 顺带报 TS 编译错误 | ✅ v2 起内置（自研类型推断，不依赖 tsc，覆盖尚不及 typescript-eslint） |
| 性能 | 基准（大仓库十秒级以上） | 同 ESLint | 约 50–100× ESLint，亚秒级 | 约 25× ESLint |
| 插件生态 | ✅ 完整（最大资产） | ✅ 即 ESLint 生态 | ⚠️ 规则内置 + 配置兼容 ESLint 插件规则名，无运行时插件机制（规划中） | ❌ 暂无插件系统（2026 路线图中有计划） |
| 配置成本 | 高（手写 flat config） | 极低（一行 `antfu()`），且内置 pnpm catalog 规则 | 低（`.oxlintrc.json`，可零配置） | 低（`biome.json`） |
| monorepo 集成 | ESLint 10 起按文件就近找配置，root 一份或多份皆可 | 同左；自带 `pnpm/json-enforce-catalog` 等规则，与 pnpm catalog 绝配 | 支持嵌套 `.oxlintrc.json`；`--type-aware` 依赖 tsconfig 布局 | 支持嵌套 `biome.json` |
| 与 ESLint 的关系 | — | 是 ESLint 配置 | 互补：官方提供 eslint-plugin-oxlint 关停被覆盖的 ESLint 规则，常组合使用 | 替代品 |

来源：[oxlint 文档](https://oxc.rs/docs/guide/usage/linter)、[oxlint type-aware 文档](https://oxc.rs/docs/guide/usage/linter/type-aware.html)、[@antfu/eslint-config](https://github.com/antfu/eslint-config)、[Biome v2 blog](https://biomejs.dev/blog/biome-v2/)。

### 1.3 各工具要点

**ESLint v10** —— 生态基准，不可回避。
- flat config 唯一化；`eslint.config.*` 从被检查文件所在目录向上查找，monorepo 中「root 一份全局配置」或「各包就近配置」都自然成立。
- typescript-eslint v8.x 已跟进支持 ESLint 10（社区 lockfile 可见 `@typescript-eslint/*@8.66+` 搭配 `eslint@10.8`）。type-aware lint 正确性最好，但速度是明显短板（typescript-eslint 需跑 TS 类型服务）。

**@antfu/eslint-config** —— 对 antfu 生态偏好者的「一行接入」方案。
- 开箱覆盖 JS/TS/Vue/JSONC/YAML/TOML/Markdown，内置 `@stylistic` 风格规则 + import 排序，**设计上即「不用 Prettier」**（格式化由 ESLint fix 完成）。
- 内置 eslint-plugin-pnpm，含 `pnpm/json-enforce-catalog`、`pnpm/json-valid-catalog` 等规则——与本模板的 catalog 治理策略直接契合。
- 自带 vitest 规则（`@vitest/eslint-plugin`）、sortPackageJson、sortTsconfig 等，均为本模板用得上的能力。
- 注意：这是 **antfu 个人化预设**，README 明示升级时应 review 规则变化（不视为 breaking change）。
  - 可选 type-aware（`typescript: { tsconfigPath: ... }`）
  - 格式化 CSS/HTML/MD 需另开 `formatters` 选项（底层走 Prettier/dprint）
  - 来源：[antfu/eslint-config README](https://github.com/antfu/eslint-config)。

**oxlint + tsgolint** —— 性能向首选，type-aware 已稳定。
- `pnpm add -D oxlint oxlint-tsgolint@7 && oxlint --type-aware` 即可启用；59/61 type-aware 规则覆盖意味着 `no-floating-promises`、`no-unsafe-*` 家族等关键规则齐全。
- 社区实测 type-aware 模式 ~2.8s vs ESLint 同类规则 ~135s。来源：[unraid/js-standards 实测](https://github.com/unraid/js-standards)、[Type-Aware Linting Stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)。
- 短板：没有 ESLint 式插件运行时，生态长尾规则（如某些团队自研规则）仍需 ESLint；antfu config 作者也明确表示在等 oxlint 集成的阻塞项解决。来源：[antfu/eslint-config FAQ](https://github.com/antfu/eslint-config)。

**Biome** —— 一体化但生态隔离。
- linter + formatter + import 排序一个二进制搞定，配置极简
  - v2.3 起支持 Vue/Svelte/Astro 全文件（HTML/CSS/JS 部分，含 template），**但为 🟡 experimental**：需显式开启 `html.experimentalFullSupportEnabled`，v2.5 跨语言规则仍可能误报，官方不建议生产直接使用
- 短板：无插件系统，规则不可扩展；与 ESLint 生态互不相通。来源：[Biome Roadmap 2026](https://biomejs.dev/blog/roadmap-2026/)。

---

## 二、格式化工具

### 2.1 对比表

| 维度 | Prettier | Biome formatter | oxfmt |
|---|---|---|---|
| 最新版本 | 3.9.6 | 2.5.11 | 0.66.0（**beta，未 GA**） |
| 速度 | 基准 | ~3× Prettier | **30×+ Prettier，3× Biome** |
| JS/TS/JSX | ✅ | ✅ | ✅（100% 通过 Prettier JS/TS 一致性测试） |
| Vue / Svelte | ✅（Vue 官方插件） | 🟡 experimental（2.3 起全文件，需显式开启） | ✅（Vue；Svelte 不在官方列表中） |
| 其他文件 | MD/YAML/CSS/GraphQL 等 + 丰富插件（如 tailwindcss 排序） | CSS/GraphQL 等（2.x 默认开启） | MD/YAML/TOML/HTML/CSS/GraphQL 等全内置；**内置 Tailwind 类排序、import 排序、package.json 排序** |
| 配置量 | 中（.prettierrc + 插件） | 低（biome.json 一处） | 低；提供 `--migrate prettier` / `--migrate biome` 一键迁移 |
| 与 lint 组合 | 与 ESLint 需 eslint-config-prettier 解冲突 | 与 Biome linter 一体 | 与 oxlint 同生态（VoidZero）；配 antfu config 时其 formatters 选项仍走 Prettier/dprint |

来源：[Oxfmt Beta](https://oxc.rs/blog/2026-02-24-oxfmt-beta)、[Prettier 3.9](https://prettier.io/blog/2026/06/27/3.9.0)、[Biome v2](https://biomejs.dev/blog/biome-v2/)、[oxfmt npm](https://www.npmjs.com/package/oxfmt)。

### 2.2 结论

- **oxfmt 尚未 GA（2026-02 达 beta，当前 0.x）**，但已被 vuejs/core、vercel/turborepo、sentry 等采用，且对 Prettier 行为完全兼容（官方与 Prettier 团队协同收敛差异）。
  - 追求性能可先行试用；追求稳妥则仍用 Prettier，后续 `oxfmt --migrate prettier` 平滑切换。
- **Biome 路线下 formatter 与 linter 一体，是依赖最少的一条路**（零独立 formatter 依赖）；antfu 路线下 JS/TS 格式化可直接交给 ESLint（`@stylistic`），仅 CSS/HTML/MD 等用 `formatters` 选项或 Prettier 兜底。

---

## 三、Git hooks + 增量检查

| 工具 | 最新版本 | 实现 | 特点 |
|---|---|---|---|
| simple-git-hooks | 2.14.0 | JS，零依赖 | 配置写 package.json，极简；无 `core.hooksPath` 之外的魔法；antfu 生态常用 |
| husky | 9.1.7（2024-11 后未发版） | JS | 生态认知度最高，`.husky/` 目录式；功能稳定但近年近乎停更 |
| lefthook | 2.1.12 | Go 单二进制 | 并行执行、按文件分组、配置在 `lefthook.yml`；快且活跃，依赖与 Node 无关 |

| 增量检查 | 最新版本 | 说明 |
|---|---|---|
| lint-staged | 17.4.1 | 对 staged 文件跑任意命令；与上述三者任意组合；标准用法 |

要点：
- **simple-git-hooks + lint-staged** 是 antfu config README 官方示例组合（`"pre-commit": "pnpm lint-staged"`）。来源：[antfu/eslint-config Lint Staged 章节](https://github.com/antfu/eslint-config)。
- husky 认知度高但已一年多无发版，且引入 `.husky/` 目录与 `prepare` 脚本的开销；simple-git-hooks 同等能力零依赖。
- **lefthook 一个工具覆盖「钩子管理 + staged 文件过滤」两件事**（`glob` 配置 + `{staged_files}` 占位符，即 lint-staged 的核心能力）：
  - 「simple-git-hooks + lint-staged 两个 JS 依赖」可合并为「lefthook 一个 Go 二进制」，依赖数从 2 减到 1
  - 配置从 package.json 两处（`simple-git-hooks` + `lint-staged` 两处配置）收敛为一份 `lefthook.yml`
  - Go 二进制与 Node 生态解耦、支持并行/分组
  - 本模板选用 lefthook
- lint-staged 与 lint/format 的组合：`"*.{js,ts,json,yaml,md}": "eslint --fix"`（antfu 路线）或 `"*": "oxfmt --no-error-on-unmatched-pattern"`（oxfmt 官方迁移指引推荐写法）。

---

## 四、commit message 规范

- **commitlint 当前 21.2.2（2026-08-13）**，仍在常规维护（conventional-changelog 组织）。来源：[npm @commitlint/cli](https://www.npmjs.com/package/@commitlint/cli)。
- 用户已有共享配置（Vanisper/schema-store 的 `.commitlintrc.yaml`）：
  - 基于 `@commitlint/config-conventional` + 自定义 `parserPreset.headerPattern`（兼容 emoji 左/中/右三位置）
  - cz-git 风格 `prompt`（中文交互、`useEmoji: true`、`emojiAlign: left`、自定义 type-enum 含 `examples`/`init` 等）
- 接入方式：
  - 模板根目录放 `.commitlintrc.yaml`（可直接复用该共享配置内容）
  - 配 `commit-msg` 钩子 `commitlint --edit $1`
  - 如需交互式提交可加 cz-git（`czg` CLI）
- commitlint 与 Changesets 无冲突
  - changeset 提交走 `chore: version packages` 等标准 type 即可通过 type-enum
  - 注意 `version` 不在现有 enum 中，如让机器人提交需留意，或将 CI 版本提交跳过校验

---

## 五、其他可选

| 工具 | 最新版本 | 是否需要 |
|---|---|---|
| cspell | 10.2.0 | ✅ 已接入。英文拼写检查无 lint 工具能覆盖；以中文文档为主时价值有限（英文标识符/术语拼写为主），词典维护成本低 |
| EditorConfig | —（编辑器标准） | ✅ 已接入。编辑器保存时统一基础格式（缩进/换行/编码），与 lint 职责不重叠、零依赖，装完即生效 |
| EditorConfig | —（编辑器标准） | ✅ 已接入。编辑器保存时统一基础格式（缩进/换行/编码），与 lint 职责不重叠、零依赖，装完即生效 |
| stylelint | 17.14.1 | **不需要**。本模板为纯 TS 库、无 CSS；若未来出现样式文件，antfu config 的 `formatters.css` 只管格式化，届时再评估 stylelint |

---

## 六、职责抽象与组合矩阵

将「编码规范工具链」抽象为四个职责（slot），每个职责独立选型，工具可替代、组合可拼装：

```
Lint ── Format ── Hooks ── Commit
规则检查   格式化     钩子+增量    消息规范
```

### 6.1 分层模型：工具引擎 vs 规则预设

Lint 职责内部要分两层看——**真正可替代的是工具引擎，规则预设只是引擎之上的配置**：

```
工具引擎层（三选一，互相替代）        规则预设层（仅选了 ESLint 才存在）
────────────────────────────      ─────────────────────────────────
ESLint  ── 最大生态、最成熟          @antfu/eslint-config / 手写 flat config / airbnb / standard ...
oxlint  ── oxc 系、type-aware 已稳      （选了 oxlint / Biome，此层不存在）
Biome   ── 单二进制、lint+format 一体
```

`@antfu/eslint-config` 本质是 ESLint 的规则预设，不是独立工具——把它和 ESLint 并列在候选里是分层错误。同理，Format 职责也随引擎不同而并入或独立：Biome 内置 formatter、oxc 配 oxfmt、ESLint 则靠 `@stylistic`（antfu 预设已含）或 Prettier 独立工具。

### 6.2 各职责选型总表

| 职责 | 主推 | 备选 | 经典/老一代 |
|---|---|---|---|
| Lint（引擎） | ESLint（最大生态、最成熟） | oxlint + tsgolint（性能向） / Biome（单二进制） | — |
| Lint（规则预设，仅 ESLint） | @antfu/eslint-config | 手写 flat config | airbnb / standard |
| Format（格式化） | 并入 Lint 引擎（Biome / oxfmt / @stylistic） | Prettier | eslint-config-prettier 组合 |
| Hooks（钩子 + 增量检查） | lefthook（一体覆盖钩子+staged 过滤） | simple-git-hooks + lint-staged（两件套） | husky + lint-staged |
| Commit（消息规范） | commitlint + 共享 `.commitlintrc.yaml` | — | — |

### 6.3 组合替代关系

```
组合 A（本模板选择：ESLint 生态路线）
  Lint:    ESLint + @antfu/eslint-config（预设免手写）
  Format:  并入 Lint（@stylistic），JS/TS 无独立 formatter
  Hooks:   lefthook（一体覆盖钩子+增量）
  Commit:  commitlint + 共享配置

组合 B（性能向演进：oxc 全家桶）
  Lint:    oxlint + tsgolint（type-aware）
  Format:  oxfmt（beta，未 GA 时暂缓）
  Hooks:   同 A
  Commit:  同 A

组合 C（单二进制路线：Biome，生不逢时）
  Lint/Format: Biome（lint+format+import 排序一体）
  Hooks:   同 A
  Commit:  同 A
```

组合替代关系说明：
- **组合 A 的核心逻辑**：ESLint 是当前唯一「全场景生产就绪」的引擎——插件生态完整、Vue/Svelte/Astro template lint 成熟；配合 `@antfu/eslint-config` 预设几乎零配置
- **组合 B 何时启用**：oxfmt GA 后，追求极致性能时
- **组合 C 的评价**：Biome 的「单二进制、职责内聚」哲学很理想，但生不逢时——oxc（VoidZero/Vite 团队，tsdown/Rolldown 官方背景）同为「单二进制 + 高性能」竞品且势头更猛（type-aware lint 已稳定、oxfmt 已 beta），同一赛道被压制；加上 Vue/Svelte/Astro template 支持为 🟡 experimental、无插件系统、与 ESLint 生态互不相通，对本模板「纯 TS 库但可能扩展 .vue」的场景不是稳妥选择
- Commit 职责始终是 commitlint，与前三者完全解耦；Hooks 职责两个实现（lefthook / simple-git-hooks+lint-staged）对任何 Lint 引擎通用

---

## 七、推荐组合

### 组合 A（主推）：ESLint + @antfu/eslint-config + lefthook + commitlint

ESLint 是当前唯一「全场景生产就绪」的 lint 引擎（Vue/Svelte/Astro template lint 成熟、插件生态完整）；配合 `@antfu/eslint-config` 预设，lint 与 JS/TS 格式化都由 ESLint 完成，不引入 Prettier。

1. **catalog**（`pnpm-workspace.yaml` 追加）：

   ```yaml
   catalog:
     # ...已有
     eslint: ^10.9.1
     '@antfu/eslint-config': ^9.5.1
     lefthook: ^2.1.12
     '@commitlint/cli': ^21.2.2
     '@commitlint/config-conventional': ^21.2.2
   ```

2. **根 package.json**：

   ```jsonc
   {
     "scripts": {
       "lint": "eslint .",
       "lint:fix": "eslint . --fix",
       "commitlint": "commitlint --edit"
     }
   }
   ```

3. **根 `eslint.config.mjs`**：

   ```js
   import antfu from '@antfu/eslint-config'

   export default antfu({
     type: 'lib', // 库定位：自动放宽部分 app 向规则
     // 关键：antfu 通过 isPackageExists("typescript") 从根目录检测 TS 项目，typescript 只在子包时检测不到 → 所有 .ts 文件被静默忽略，必须显式开启
     typescript: true,
   })
   ```
   
   **重要陷阱**：antfu config 通过 `isPackageExists("typescript")` 从根目录检测 TS 项目；若 typescript 只在子包中，根目录检测会失败 → 所有 .ts 文件被静默忽略（ignoreTypeScript 被置 true）。**在 monorepo 模板中 typescript 通常不进根 package.json，此时 antfu config 默认不启用 TS 支持，lint 会静默跳过所有 .ts 文件。**必须显式开启** `typescript: true`（或配置 tsconfigPath 开启 type-aware）。

   ESLint 10 的「就近查找配置」使 root 一份配置即可覆盖全部 packages；若个别包需特调，在该包内放追加的 flat config 即可。

4. **根 `lefthook.yml`**：

   ```yaml
   pre-commit:
     commands:
       lint:
         glob: '*.{js,mjs,ts,json,jsonc,yaml,yml,toml,md}'
         run: pnpm eslint {staged_files} # 只检查不自动修复（见下文「实践备注」）
   commit-msg:
     commands:
       commitlint:
         run: pnpm commitlint --edit {1}
   pre-push:
     commands:
       lint:
         run: pnpm lint # 本地兜底（无 CI 场景），push 前做全仓 lint
   ```

   ```

   安装后执行一次 `pnpm exec lefthook install` 激活钩子（可挂到 `postinstall`）。

   ```

   安装后执行一次 `pnpm exec lefthook install` 激活钩子（可挂到 `postinstall`）。

5. **turbo / CI**：lint 是「全仓一次跑完」的全局任务，不进 turbo 任务图（per-package 跑 ESLint 反而重复加载配置）。CI 中在 `turbo run test check:pkg` 之外并行加一步：

   ```bash
   pnpm lint          # ESLint 全仓
   pnpm exec commitlint --from origin/main --to HEAD   # 如需在 CI 校验 PR 内 commit
   ```

6. **预提交钩子是否必要**：必要且代价极低。lefthook 的 `{staged_files}` 占位符只传匹配的 staged 文件给 eslint 做检查；commit-msg 校验拦截不规范 message。钩子合计通常 < 2s，不成为提交摩擦。

#### 实践备注（2026-09-03 落地后补充）

- **hooks 初始化是自动的**：lefthook 的 npm 包自带 postinstall，安装时自动执行 `lefthook install`（pnpm 输出可见 `sync hooks: ✔️`，无需手动执行
- **`staged_files` 只是 `run` 命令里的占位符**：lefthook 原生按 staged 文件过滤并传参，`{staged_files}` 是 `run` 命令里的占位符，不需要额外配置属性
- **静默 --fix 的隐患**：`run: eslint --fix {staged_files}` 时，eslint --fix 修改工作区文件后 lefthook 默认不重新暂存（`stage_fixed` 默认关闭），可能造成「修了但没提交」的假象——本模板选择**不加 `--fix`，pre-commit 只做检查，报错就让开发者自己跑 `pnpm lint:fix` 处理，避免静默修改被提交遗漏；如果要自动重暂存修复结果，可在 lefthook 中设置 `stage_fixed: true`
- **pre-push 钩子做本地兜底**：CI 不可用时，push 前做一次 `pnpm lint` 全仓检查，确保推送内容不红

### 组合 B（次选/性能向）：oxlint(+tsgolint) + oxfmt + lefthook + commitlint

与 [组合 A](#组合-a主推eslint--antfueslint-config--lefthook--commitlint) 的差异只在 Lint/Format 引擎层；catalog 中的 lefthook/commitlint 条目、根 `lefthook.yml`、`commitlint` 脚本、CI 步骤均同组合 A，以下只列引擎差异部分：

1. **catalog 追加**：

   ```yaml
   oxlint: ^1.81.0
   oxlint-tsgolint: ^7.0.2001 # type-aware 需要
   oxfmt: ^0.66.0 # beta，未 GA
   ```

2. **根 package.json**：

   ```jsonc
   {
     "scripts": {
       "lint": "oxlint .",
       "lint:fix": "oxlint . --fix",
       "format": "oxfmt ."
     }
   }
   ```

   - type-aware 检查：`oxlint . --type-aware`（需 `oxlint-tsgolint@^7`，依赖 tsconfig 布局规整）
   - `lefthook.yml` 的 `run` 改为 `pnpm oxlint --fix {staged_files}`；格式化可另加 `pnpm oxfmt --no-error-on-unmatched-pattern {staged_files}`
   - oxfmt 官方提供 `oxfmt --migrate prettier` / `--migrate biome` 一键迁移

3. **配置**：oxlint 可零配置（`.oxlintrc.json` 可选）；oxfmt 读取 `.editorconfig` 的 `insert_final_newline` 等。

### 组合 C（单二进制路线）：Biome + lefthook + commitlint

与 [组合 A](#组合-a主推eslint--antfueslint-config--lefthook--commitlint) 同样只列引擎差异部分；catalog 中的 lefthook/commitlint 条目、`lefthook.yml`、CI 步骤均同组合 A。

1. **catalog 追加**：`"@biomejs/biome": ^2.5.11`

2. **根 package.json**：

   ```jsonc
   {
     "scripts": {
       "lint": "biome check .",
       "lint:fix": "biome check --write ."
     }
   }
   ```

3. **根 `biome.json`**：

   ```jsonc
   {
     "$schema": "https://biomejs.dev/schemas/2.5.11/schema.json",
     "files": {
       "includes": ["**", "!**/dist", "!**/node_modules", "!**/pnpm-lock.yaml"]
     },
     "linter": {
       "enabled": true,
       "rules": { "recommended": true }
     },
     "formatter": {
       "enabled": true
     },
     "assist": {
       "actions": {
         "source": { "organizeImports": "on" }
       }
     }
   }
   ```

   - `linter.enabled` 是默认（可省略），写出来便于以后调整；`assist` 的 `organizeImports` 为 Biome v2 的 import 排序
   - `lefthook.yml` 的 `run` 改为 `pnpm biome check --write {staged_files}`；glob 可收窄为 `"*.{js,mjs,cjs,ts,mts,cts,json,jsonc}"`（Biome 不处理 md/yaml 等）

4. **已知代价**：无插件系统；type-aware 规则覆盖不及 typescript-eslint（内部库由 CI 的构建链路兜底）；Vue 支持 experimental（本模板无 .vue 文件，不受影响）

**对 cspell / EditorConfig 的建议**（已接入，记录引入原因）：`.editorconfig` 直接加（无依赖，编辑器保存时统一基础格式）；cspell 补充 lint 无法覆盖的英文拼写检查，词典覆盖项目技术术语即可零成本维护。

---

---

## 附一：官方规则与支持列表索引

以下链接为各工具的官方规则列表与「语言/框架支持度」文档，供查证具体某条规则是否被支持时使用：

| 工具 | 规则列表 | 支持度/兼容性 |
|---|---|---|
| ESLint | [Rules](https://eslint.org/docs/latest/rules/) + [typescript-eslint Rules](https://typescript-eslint.io/rules/) | — |
| @antfu/eslint-config | —（preset，规则即 ESLint 生态） | [GitHub README](https://github.com/antfu/eslint-config) |
| oxlint / oxfmt | [oxlint Rules 列表](https://oxc.rs/docs/guide/usage/linter/rules.html) | [框架兼容性](https://oxc.rs/compatibility.html)（oxlint 与 oxfmt 共用同一兼容性页，含 Vue/Svelte/Astro template linting 进度） |
| Biome | [Rules 列表](https://biomejs.dev/linter/) | [Language Support](https://biomejs.dev/internals/language-support/) |
| Prettier | —（无规则概念） | [Plugins](https://prettier.io/docs/en/plugins/) |

## 附二：版本快照（2026-09-03，npm registry dist-tags）

| 包 | latest | 发布日期 |
|---|---|---|
| eslint | 10.9.1 | 2026-08-24 |
| typescript-eslint | 8.69.0 | 2026-08-31 |
| @antfu/eslint-config | 9.5.1 | 2026-09-02 |
| oxlint | 1.81.0 | 2026-09-01 |
| oxlint-tsgolint | 7.0.2001 | 2026-07-21 |
| oxfmt | 0.66.0（beta） | 2026-09-01 |
| prettier | 3.9.6 | 2026-07-21 |
| @biomejs/biome | 2.5.11 | 2026-08-27 |
| lint-staged | 17.4.1 | 2026-08-27 |
| simple-git-hooks | 2.14.0 | 2026-08-28 |
| husky | 9.1.7 | 2024-11-18 |
| lefthook | 2.1.12 | 2026-08-28 |
| @commitlint/cli | 21.2.2 | 2026-08-13 |
| cspell | 10.2.0 | 2026-08-31 |
| stylelint | 17.14.1 | 2026-07-20 |
