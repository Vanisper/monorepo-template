# ADR 0003：单仓管理选 pnpm workspaces + Turborepo

## 状态

已采纳（2026-09）

## 背景

monorepo-template 需要管理多个 TypeScript 包，核心诉求：依赖治理（版本不漂移）、任务编排（构建按依赖拓扑执行）、缓存提速、学习成本低。

## 决策

底座用 **pnpm workspaces + catalogs**（必选），任务编排用 **Turborepo**，构建和产物校验交给 **tsdown**。

## 候选方案

| 工具 | 职责 | 排除/选用原因 |
|---|---|---|
| **pnpm workspaces + catalogs** | 依赖安装 + 版本治理 | ✅ 必选底座 |
| **Turborepo** | 任务编排 + 缓存 | ✅ 选用 |
| Nx | 全功能 monorepo 工具 | ❌ 太重，学习成本高，本模板不需要生成器、graph 等高级功能 |
| Lerna | 曾为主流，现角色收缩为 version/publish | ❌ 版本管理已由 Changesets 覆盖 |
| Moon | Rust 工具链，性能强 | ❌ 社区太小，资料少 |
| pnpm v12 内置编排 | 官方新能力 | ❌ 目前功能仍不如 Turborepo 丰富，且已投入 turborepo |

### 理由

1. **pnpm catalogs 是独有的依赖治理方案**：多包共享依赖的版本集中定义在 `pnpm-workspace.yaml`，子包统一用 `"catalog:"` 引用，天然避免版本漂移；其他工具没有等价物
2. **Turborepo 专注缓存与编排**：配置极简（`turbo.json` 十几行），任务依赖拓扑（`^build`）、缓存命中（`Cached: N cached`）开箱即用，是目前最轻量的编排方案
3. **三者分工清晰**：pnpm 管依赖、turbo 管任务、tsdown 管构建，各司其职，没有功能重叠

## 未来考虑

pnpm v12 已内置 workspace 任务编排（`tasks` 配置 + `^build` 依赖图调度）。如果未来 pnpm 内置编排成熟且功能足够，可以考虑移除 Turborepo 进一步精简工具链。当前仍保留 Turborepo 的理由：

- 缓存能力更强（turbo 有文件级输入哈希，pnpm 内置编排的缓存粒度更粗）
- 已有配置成本低，切换收益不明显

## 来源

- [Turborepo 官方文档](https://turborepo.com/docs)
- [pnpm workspaces 文档](https://pnpm.io/workspaces)
- [pnpm catalogs 文档](https://pnpm.io/catalogs)
- [完整调研报告](../research/2026-09-monorepo-tech-selection.md)
