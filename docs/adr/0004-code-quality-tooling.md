# ADR 0004：编码规范工具链选 ESLint + @antfu/eslint-config + lefthook + commitlint

## 状态

已采纳（2026-09）

## 背景

monorepo-template 需要一套编码规范工具链，涵盖 Lint、Format、Hooks、Commit 四个职责。使用场景：内部自治、纯 TS 库定位、无 .vue/.css 文件。追求的是「稳定、依赖最少、配置最少、长期维护有保障」。

## 决策

采用 **组合 A（ESLint 生态路线）**：

| 职责 | 选型 | 备选 |
|---|---|---|
| Lint（引擎） | ESLint + @antfu/eslint-config | oxlint + tsgolint（性能向） / Biome（单二进制） |
| Format（格式化） | 并入 Lint 引擎（@stylistic） | oxfmt（GA 后） / Prettier |
| Hooks（钩子 + 增量检查） | lefthook（一体覆盖钩子+staged 过滤） | simple-git-hooks + lint-staged（两件套） |
| Commit（消息规范） | commitlint + 共享 `.commitlintrc.yaml` | — |

## 候选方案

| 工具 | 定位 | 排除/选用原因 |
|---|---|---|
| **ESLint + @antfu/eslint-config** | lint 引擎 + 规则预设 | ✅ 选用：ESLint 是当前唯一全场景生产就绪的 lint 引擎（Vue/Svelte/Astro template lint 成熟、插件生态完整） |
| oxlint + tsgolint | 性能向 linter | ❌ type-aware 已稳，但 oxfmt 未 GA，且与 ESLint 生态互不相通 |
| Biome | 单二进制 lint+format 一体 | ❌ 生不逢时：Vue/Svelte/Astro 支持为 🟡 experimental、无插件系统、与 ESLint 生态互不相通 |
| simple-git-hooks + lint-staged | 两个 JS 依赖 | ❌ lefthook 一个 Go 二进制覆盖 hooks + staged 过滤，依赖更少 |
| commitlint | commit 规范 | ✅ 选用：共享 cz-git 配置、中文交互、type-enum 扩展 |

### 理由

1. **ESLint 是当前唯一「全场景生产就绪」的 lint 引擎**（Vue/Svelte/Astro template lint 成熟、插件生态完整）；配合 `@antfu/eslint-config` 预设，lint 与 JS/TS 格式化都由 ESLint 完成，**零独立 formatter 依赖**
2. **lefthook 一个工具覆盖 hooks + staged 过滤**（替代 simple-git-hooks + lint-staged 两个 JS 依赖；Go 二进制、配置一份、不绑 Node 生态
3. **antfu 预设的「lint + format 一体」设计**：`@antfu/eslint-config` 内置 `@stylistic` 风格规则 + `eslint --fix` 自动修复，JS/TS 格式化由 lint 完成，免 Prettier，依赖最少
4. **commitlint + cz-git 共享配置**：cz-git 风格提交规范与 internal 使用场景契合

### 已落地的坑（实施过程中发现）

- **antfu config 的 typescript 检测陷阱**：antfu config 通过 `isPackageExists("typescript")` 从根目录检测 TS 项目，typescript 只在子包中时根目录检测不到 → 所有 .ts 文件被静默忽略；需在 `eslint.config.mjs` 显式 `typescript: true` 强制开启（已踩坑并记录，见 [getting-started.md](../guide/getting-started.md)
- **静默 --fix 的隐患**：`run: eslint --fix {staged_files}` 时，eslint --fix 会修改工作区文件但不会自动重新暂存（lefthook 的 `stage_fixed` 默认关闭），导致「代码被改了但提交的还是旧内容」的假象——本模板选择 pre-commit 只做检查（不加 `--fix`），报错让开发者自己跑 `pnpm lint:fix`
- **`.editorconfig` 的作用**：编辑器层的基础格式约定（缩进/换行/编码），与 lint 职责不重叠——lint 管代码风格，EditorConfig 在保存时就把基础格式弄对，让 lint 少干活

## 已知短板

- `@antfu/eslint-config` 是 antfu 个人化预设（README 明示升级时应 review 规则变化（不视为 breaking change），升级时需要对照 review
- antfu 的 typescript 检测（`isPackageExists`）对 monorepo 场景有盲区（typescript 只在子包中时检测失败），需要显式开启 `typescript: true`

## 来源

- [antfu/eslint-config FAQ](https://github.com/antfu/eslint-config)
- [lefthook 官方文档](https://lefthook.dev/)
- [完整调研报告](../research/2026-09-code-quality-tooling.md)
