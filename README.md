# monorepo-template

前端单仓多库（monorepo）模板项目，TypeScript 方向。

[![CI](https://github.com/Vanisper/monorepo-template/actions/workflows/ci.yml/badge.svg)](https://github.com/Vanisper/monorepo-template/actions/workflows/ci.yml)

## 技术栈

- **包管理**：pnpm workspaces + [catalogs](https://pnpm.io/catalogs) — 依赖版本统一治理
- **任务编排**：Turborepo — 构建拓扑排序 + 缓存
- **打包**：tsdown — 基于 Rolldown 的 TS 库打包器（ESM/CJS 双格式 + oxc 极速 d.ts）
- **版本管理**：Changesets v3 — changeset → version → tag → 可选 npm 发布（分步流程）
- **测试**：Vitest — 原生 TS/ESM 支持，与 Vite 同源的测试框架
- **编码规范**：ESLint + @antfu/eslint-config — lint + 格式化一体（免 Prettier），内置 pnpm catalog 规则
- **Git Hooks**：lefthook — 一个 Go 二进制覆盖钩子管理 + staged 文件过滤
- **提交规范**：commitlint — 共享 Conventional Commits 配置（cz-git 风格）
- **产物校验**：publint + arethetypeswrong

## 目录结构

```
packages/
├── core/    # @mono/core — 示例核心包
└── utils/   # @mono/utils — 演示对 core 的 workspace 依赖
```

## 快速开始

```bash
pnpm install
pnpm build       # 构建所有包
pnpm test        # 单元测试（Vitest）
pnpm lint        # ESLint 检查（lint + 格式化）
pnpm check:pkg   # 构建 + 产物校验（publint + attw）
pnpm dev         # watch 模式
```

## 发布（分步）

```bash
pnpm changeset     # 1. 记录变更
pnpm version       # 2. 更新版本号 + changelog
pnpm tag           # 3. 打 git tag（内部自治到此结束）
# 可选：如需发布 npm，恢复 package.json 中注释掉的 publish:npm 脚本
```

## 文档

完整文档在 [`docs/`](./docs/)：

- [快速上手](./docs/guide/getting-started.md)
- [新增子包](./docs/guide/add-package.md)
- [依赖管理](./docs/guide/dependency-management.md)
- [版本发布](./docs/guide/versioning.md)
- [技术决策（ADR）](./docs/adr/)
