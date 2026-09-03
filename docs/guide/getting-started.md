# 快速上手

## 环境要求

- Node.js ≥ 22.18.0（tsdown 的硬性要求）
- pnpm ≥ 11.0.0

建议用 [corepack](https://nodejs.org/api/corepack.html) 或 `packageManager` 字段对齐 pnpm 版本（根 `package.json` 已锁定 `pnpm@11.24.0`）。

## 安装与构建

```bash
pnpm install   # 安装依赖（workspace 内所有包一起装）
pnpm build     # turbo 按依赖拓扑并行构建所有包
pnpm dev       # turbo watch，改源码自动重建
pnpm test      # Vitest 单元测试（依赖包会先自动构建）
pnpm lint      # ESLint 全仓检查（含 @stylistic 格式化）
pnpm lint:fix  # ESLint 全仓检查并自动修复
pnpm check:pkg # 构建 + publint + attw 产物校验
```

## 目录结构

```
monorepo-template/
├── package.json            # 根：turbo + changesets，全局脚本入口
├── pnpm-workspace.yaml         # workspace 定义 + catalog 依赖治理
├── turbo.json                # 任务编排（build 按 ^build 拓扑排序）
├── tsconfig.base.json        # 所有子包共享的 TS 基线配置
├── .changeset/               # 版本管理配置
├── packages/                 # 真实包（业务实现地，按域分）
│   ├── ui/                # UI 域（业务组件/大组件，按平台分层）
│   ├── hooks/             # hooks 域（逻辑复用，按平台分层）
│   └── tools/             # 工具域（平台无关基础库）
└── examples/
    └── demo/              # 示例包
        ├── core/          # @mono/core —— 示例核心包
        └── utils/         # @mono/utils —— 示例，依赖 @mono/core
```

## 常用命令

```bash
# 运行某个子包的脚本
pnpm --filter @mono/core build

# 查看依赖关系
pnpm why tsdown
```

## 快速验证

```bash
pnpm build       # 两个包应全部构建成功
pnpm check:pkg   # publint + attw 应全部全绿
```

## 核心概念速览

- **catalog**：`pnpm-workspace.yaml` 中统一管理共享依赖版本，子包用 `"catalog:<组名>"` 引用，避免版本漂移；按职责分组（build / test / lint / hooks / commit / check / workspace）
- **workspace:***：内部包互相依赖的写法，发布时自动替换为真实版本号
- **catalog: 协议验证**：`pnpm pack` 时会自动替换成真实版本号，无需担心发布产物

## 任务编排与 `^build`

turbo 的任务依赖拓扑定义在根 `turbo.json`：

```json
{
  "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
  "check:pkg": { "dependsOn": ["build"] },
  "test": { "dependsOn": ["^build"] }
}
```

- `build` 的 `^build`：构建当前包之前，先构建它的所有**内部依赖包**（`^` 前缀表示「依赖图上上游包的同名任务」）。例如 `@mono/utils` 依赖 `@mono/core`，跑 utils 的 build 时会自动先跑 core 的 build。
- `test` 的 `^build`：**这是有意的设计**。测试通过 workspace 软链 + package `exports` 解析内部包，拿到的是上游包的 **dist 产物**而非源码，所以跑测试前必须保证上游包已构建。`^build` 正好表达这个依赖，且构建有 turbo 缓存，几乎无成本。
  - 推论：如果上游包源码改了但没构建，下游包的测试会引用**旧产物**。日常开发建议 `pnpm dev`（watch）保持产物最新。
  - 若想让测试直接跑源码，可在各包 `vitest.config.ts` 中用 `resolve.alias` 把 `@mono/*` 映射到源码，届时 `test` 任务可去掉 `^build`。
- `check:pkg` 的 `build`（无 `^`）：publint / attw 校验的是本包自己的产物，只需依赖**本包**的 build，不需要拓扑。

## 编码规范与 Git hooks

模板接入 `ESLint + @antfu/eslint-config`（lint + 格式化一体，免 Prettier）+ `lefthook`（Git hooks）+ `commitlint`（提交规范）。

### 组成

| 工具 | 职责 | 配置文件 |
|---|---|---|
| ESLint + @antfu/eslint-config | lint + 格式化（@stylistic，免 Prettier） | 根 `eslint.config.mjs` |
| lefthook | Git hooks（pre-commit / commit-msg / pre-push） | 根 `lefthook.yml` |
| commitlint | commit message 规范（共享 cz-git 配置） | 根 `.commitlintrc.yaml` |
| cspell | 拼写检查 | 根 `cspell.json` |
| EditorConfig | 编辑器层的基础格式约定（缩进/换行/编码等） | 根 `.editorconfig` |

### EditorConfig 与 cspell 的引入原因与作用

**EditorConfig**
- **引入原因**：编辑器层面的基础格式约定，与 lint/formatter 职责不重叠——lint 管「代码风格与潜在 bug」，EditorConfig 管「编辑器如何写入文件」（缩进、换行、编码、行尾空白）。两者覆盖不同层：lint 事后检查 + 修复，EditorConfig 在编辑器保存时就把基本格式弄对，让 lint 少干活
- **起作用的时机**：分两类——**即时生效类**（编辑器打开文件时读取，按 Tab 就插对应空格，Tab 宽度显示调整；如 `indent_style`/`indent_size`/`tab_width`）和**保存时处理类**（Ctrl+S 时执行；如 `trim_trailing_whitespace` 删行尾空格、`insert_final_newline` 补末尾换行、`end_of_line` 统一换行符）。VS Code 需要装 EditorConfig 扩展才能执行保存时处理类属性
- **作用**：从源头上统一基础格式，减少「编辑器写入的格式与 lint 期望的格式不一致」的问题（比如有人在编辑器里用 tab、有人用空格），让 lint 只需要处理逻辑层面的规则

**cspell**
- **引入原因**：代码中的英文拼写错误（标识符、注释、文档里的英文单词）拼写错误没有工具能自动检查——TypeScript 只管类型对不对，ESLint 不管拼写对不对，cspell 补上这一环
- **起作用的时机**：手动跑 `pnpm spell`，或 CI 中 `cspell lint`；编辑器装 cspell 插件后可在写代码时实时提示
<!-- cspell:disable-next-line -->
- **作用**：捕获英文拼写错误（`connnection` → `connection` 等）；本模板以中文文档为主，cspell 主要价值是英文标识符和技术术语的拼写——词典已覆盖项目技术术语（tsdown、oxlint、lefthook 等）

### Hooks 工作流

```yaml
# lefthook.yml
pre-commit: eslint {staged_files} # 只检查不修复（见下文「静默 fix」说明）
commit-msg: commitlint --edit {1}
pre-push: pnpm lint # 本地兜底，CI 不可用时推前做全仓 lint
```

### 初始化时机

- **lefthook 钩子**：`pnpm install` 时自动安装（lefthook 的 postinstall 脚本自动执行 `lefthook install`，无需手动执行；但需在 `pnpm-workspace.yaml` 配置 `allowBuilds` 放行（pnpm 11 默认拦截依赖的 postinstall 脚本）
- **ESLint TS 检测陷阱**：antfu config 通过 `isPackageExists("typescript")` 从根目录检测 TS 项目，typescript 只在子包中时根目录检测不到 → 所有 .ts 文件被静默忽略；需在 `eslint.config.mjs` 显式 `typescript: true` 强制开启

### 静默 --fix 的隐患

`run: eslint --fix {staged_files}` 时，eslint --fix 会修改工作区文件，但 lefthook 默认**不重新暂存**（`stage_fixed` 默认关闭——「代码被改了但提交的还是旧内容」，这就是「静默 fix 陷阱。本模板选择**不加 `--fix`，pre-commit 只做检查，报错让开发者自己跑 `pnpm lint:fix` 处理。

### 目录排除（ignores）

ESLint 没有自定义排除规则，靠两层机制覆盖：

1. **antfu config 的内置默认忽略**：约 40 项常见模式（node_modules、dist、CHANGELOG、LICENSE、min 文件、lock 文件、`.idea`、`.cache` 等）
2. **`.gitignore` 集成**（`antfu/gitignore`）：读取项目根 `.gitignore`，覆盖 dist/、.turbo/、*.tsbuildinfo 等

当前全仓 `pnpm lint` 0 错误通过，所以**暂时不需要自定义排除**。如需排除某个目录，可在 `eslint.config.mjs` 中追加：

```js
export default antfu({
  type: 'lib',
  typescript: true,
  ignores: ['**/some-dir/**'],
})
```

### 常见问题

- **`.ts` 文件 lint 不到**：antfu config 根目录检测不到 typescript → 全部静默忽略。修复方法见上（`typescript: true`
- **eslint 忽略文件**：首次跑 antfu config 时会自动修复 json/yaml 排序、引号风格等，属正常行为
- **pnpm 的 `allowBuilds`**：pnpm 11 默认拦截依赖安装脚本，lefthook 需要显式 `allowBuilds: { lefthook: true }` 放行 postinstall，否则 `pnpm lint` 可用但 git hook 失效
- **eslint-plugin-pnpm 的 catalog 规则**：自动把根 package.json 的 devDependencies 也强制进 catalog，实现「全部进 catalog」的治理目标

### 验证钩子是否生效

```bash
# 1. lint 生效验证：故意写坏一个 .ts 文件
printf 'const a = 1\nexport const b: number = "x"\n' > examples/demo/core/src/bad.ts   # eslint 应报 2 个 error（unused + 双引号）
pnpm lint   # 应报错
rm examples/demo/core/src/bad.ts   # 清理

# pre-commit 验证：故意加未使用变量，commit 应被拦截
echo 'const unused = 1' > examples/demo/core/src/index.ts
git add examples/demo/core/src/index.ts && git commit -m "test"  # pre-commit 应报 unused-imports/no-unused-vars
git reset && git checkout -- examples/demo/core/src/index.ts   # 还原
```
