# ADR 0001：打包工具选 tsdown

## 状态

已采纳（2026-09）

## 背景

monorepo-template 需要一个能把 TypeScript 库打包成可发布 npm 包的工具，要求：ESM/CJS 双格式输出、类型声明生成、速度快、长期维护有保障。

## 决策

选择 **tsdown**（Rolldown 官方出品的库打包器），替代原方案的 tsup。

### 候选方案

| 工具 | 关键特征 | 排除/选用原因 |
|---|---|---|
| **tsdown** | Rolldown + Oxc（Rust）；支持 ESM/CJS/IIFE/UMD；d.ts 由 oxc 生成（开启 isolatedDeclarations 后） | ✅ 选用 |
| tsup | esbuild；生态存量大 | ❌ 官方已宣布停止积极维护，README 推荐迁移 tsdown |
| unbuild | Rollup + esbuild + mkdist | ❌ 仅在 unjs/Nuxt 生态内推荐，通用性不够 |
| Rollup 原生 | 完全可控 | ❌ 配置成本过高 |
| Vite lib mode | Vite 8 = Rolldown | ❌ d.ts 体验差，官方定位仍是「应用优先」 |
| tsc 直出 | TypeScript compiler | ❌ 无 tree-shaking 优化 |

### 理由

1. **官方背书**：tsdown 是 Rolldown 团队的官方项目，Vite 8 已将 Rolldown 设为默认打包器，整个生态持续走强
2. **d.ts 速度快**：开启 `isolatedDeclarations` 后，类型声明由 oxc-transform（Rust）生成，速度比 tsc 快一个数量级（实测单包构建 ~60ms）
3. **tsup 已死**：egoist/tsup 的 README 顶部明确声明不再积极维护，新项目不应再依赖
4. **开箱即用**：自动检测 `exports`/`types` 字段决定是否生成 d.ts，无需手动配置插件链

### 已知限制

- 要求 Node ≥ 22.18.0
- 相对年轻（2024 年起），边缘场景（如 UMD 细节）仍需 rolldown-plugin-dts 补齐
- 需要配合 `isolatedDeclarations` 写代码（所有导出需显式类型注解），对不熟悉的人有一定学习成本

## 来源

- [tsdown 官网](https://tsdown.dev/guide/)
- [tsdown dts 文档](https://tsdown.dev/options/dts)
- [egoist/tsup README](https://github.com/egoist/tsup)（停维护声明）
- [完整调研报告](../research/2026-09-monorepo-tech-selection.md)
