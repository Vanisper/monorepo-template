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
└── packages/
    ├── core/               # @mono/core —— 示例核心包
    └── utils/              # @mono/utils —— 示例，依赖 @mono/core
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

- **catalog**：`pnpm-workspace.yaml` 中统一管理共享依赖版本，子包用 `"catalog:"` 引用，避免版本漂移
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
