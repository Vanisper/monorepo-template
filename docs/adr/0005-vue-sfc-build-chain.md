# ADR 0005：Vue SFC 组件构建链（unplugin-vue + css.inject + ESM-only + unbundle）

## 状态

已采纳（2026-09）

## 背景

ui 域（`packages/ui/vue`）需要支持 Vue SFC 组件库的构建与发布。tsdown 本身不处理 `.vue` 文件，需要接入官方 Vue 支持链路；同时 Vue 组件库的消费方是 Vite 类 bundler 应用，对产物形态（格式、CSS 处理、树摇粒度）有特定要求。

## 决策

| 决策点 | 选择 | 备选（排除原因） |
|---|---|---|
| SFC 编译 | `unplugin-vue/rolldown` + `dts.vue`（vue-tsc 生成 d.ts） | 无替代（tsdown 官方唯一 Vue 链路） |
| CSS 处理 | `@tsdown/css` + `css.inject: true`（JS 产物保留 CSS import，样式随 JS 自动跟随） | CSS 提取 + `./style.css` 子路径导出（attw 把 CSS 当 JS 模块解析报 Resolution failed，且需消费方手动引 CSS） |
| 产物格式 | **ESM-only** | ESM+CJS 双格式：`css.inject` 在 CJS 产物里生成 `import './style.css'`（CJS 不支持的语法，require 会炸；attw 报 Unexpected module syntax） |
| 产物粒度 | **unbundle 模式**（按组件结构输出，支持消费方树摇） | bundle 模式（单文件，组件库场景损失树摇粒度） |
| attw 校验 | `--profile esm-only` | 默认 strict profile（对 ESM-only 包误报 node16 CJS resolution failed） |
| typecheck | `vue-tsc --noEmit`，并**关闭 isolatedDeclarations** | tsc：不解析 .vue；SFC 模板展开代码无法满足 isolatedDeclarations（d.ts 由 vue-tsc 而非 oxc 生成，不需要该约束） |
| 组件导出形态 | 默认导出带 `install` 的插件对象（`app.use()`），install 内用**组件自身 name** 注册 | 具名导出 `installSmartFixedBlock`（命名太具体）；硬编码字符串注册名（魔法值） |

### 理由

1. **ESM-only 是 Vue 组件库的正解**：消费方（Vite/rolldown 应用）天然 ESM，css.inject 的样式跟随机制也只兼容 ESM；tsdown 官方也推荐 ESM
2. **unbundle 是组件库树摇的前提**：bundle 成单文件后消费方无法按组件树摇；unbundle 按模块输出后，引一个组件只带入一个组件的代码 + CSS
3. **isolatedDeclarations 只适用于纯 TS 库源码**：对 Vue SFC 模板展开代码不成立；它对 hooks 域（纯 TS）保留，对 ui 域（SFC）关闭——约束按场景分，不是全仓一刀切

## 旧的认知修正（本次迁移中踩过的坑）

- `dts: { isolatedDeclarations: true }`：该键在 rolldown-plugin-dts 0.27 已移除（自动从 tsconfig 检测），运行时静默忽略
- `dts: { oxc: true }`：该键在 tsdown 0.23 已移除（报 `Cannot create property 'stripInternal' on boolean`）——**正确写法是 `dts: true`**，isolatedDeclarations 由 tsconfig 声明、tsdown 自动检测
- `pnpm version`：被 pnpm 内置命令截获，跑 changeset version 要用 `pnpm run version`
- `publishConfig.access`：scoped 包（`@mono/*`）发布默认即 restricted，无需显式配置

## 来源

- [tsdown Vue Support](https://tsdown.dev/recipes/vue-support)
- [tsdown unbundle 模式](https://tsdown.dev/options/unbundle)
- rolldown-plugin-dts 0.27.14 / tsdown 0.23.0 本地类型与报错实测
