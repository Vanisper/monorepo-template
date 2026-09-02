# monorepo-template 文档

本目录是 monorepo-template 的文档中心。当前处于规划阶段，本文档同时承担「文档导航」与「文档规划」两个职责：已有的文档给出链接，未写的文档给出大纲，完成后更新状态。

## 目录结构

```
docs/
├── README.md                              # 本文档：导航 + 规划
├── guide/                                 # 使用指南（面向使用模板的人）
├── adr/                                   # 技术决策记录（Architecture Decision Records）
└── research/
    └── 2026-09-monorepo-tech-selection.md # 技术选型调研（✅ 已完成）
```

## 文档清单与规划

### guide/ 使用指南

| 文档 | 状态 | 内容大纲 |
|---|---|---|
| `getting-started.md` | ✅ 已完成 | 环境要求（Node ≥ 22.18、pnpm ≥ 11）；clone 后 `pnpm install`；`pnpm build` / `pnpm dev` / `pnpm check:pkg` 各脚本说明；目录结构速览 |
| `add-package.md` | ✅ 已完成 | 新增子包的标准步骤：建目录、package.json 模板（exports / files / publishConfig）、tsconfig 继承 base、tsdown 配置、catalog 引用、turbo 任务自动生效；以 `@mono/core` 为参照 |
| `dependency-management.md` | ✅ 已完成 | catalog 治理规则：什么依赖进 catalog、workspace:* 引用内部包、如何升级共享依赖；pnpm 常用命令（`pnpm why` / `--filter`） |
| `versioning.md` | ✅ 已完成 | Changesets 分步工作流：`changeset` → `version` → `tag`；内部自治包不发 npm 的用法；恢复 `publish:npm` 的条件与步骤；`fixed`/`linked` 版本策略何时启用 |
| `ci.md` | ✅ 已完成 | CI 工作流：触发条件、流水线结构、各步骤说明、设计要点 |

### adr/ 技术决策记录

| 文档 | 状态 | 内容大纲 |
|---|---|---|
| `0001-build-tool-tsdown.md` | ✅ 已完成 | 为什么选 tsdown 而非 tsup/unbuild/Rollup/Vite lib mode；isolatedDeclarations 取舍；来源引用 research 调研 |
| `0002-versioning-changesets.md` | ✅ 已完成 | 为什么选 Changesets 而非 conventional-commits 系；分步发布设计（内部只到 tag）；已知短板（catalog 变更 bump 盲区） |
| `0003-monorepo-turbo.md` | ✅ 已完成 | 为什么用 pnpm + Turborepo 组合而非 Nx/Lerna/纯 pnpm v12 编排；未来迁回 pnpm 内置编排的触发条件 |
| `0004-code-quality-tooling.md` | ✅ 已完成 | 编码规范工具链四职责（Lint/Format/Hooks/Commit）选型：ESLint+antfu+lefthook+commitlint、踩坑记录（typescript 检测陷阱、静默 fix、staged_files 陷阱、静默 fix 的隐患） |

### research/ 调研原始资料

| 文档 | 状态 | 内容大纲 |
|---|---|---|
| `2026-09-monorepo-tech-selection.md` | ✅ 已完成 | 三类技术栈（打包/版本/单仓管理）候选工具对比，含官方来源链接；ADR 的事实依据 |

## 写作约定

- 一律使用中文；代码块、命令、字段名保持英文原文。
- 文档面向「半年后的自己」：写清前提与原因，不只写操作步骤。
- guide 面向操作，adr 面向「为什么」；同一个话题 adr 引用 guide 的操作细节，guide 不重复论证选型。
- 调研类结论必须注明来源链接（继承 research 报告的惯例）。
- 文档与代码同步：改动脚本、配置、目录结构时，同步更新对应 guide 文档。

## 优先级（已全部完成）

1. ✅ `getting-started.md` + `add-package.md` —— 模板的使用入口，最先写
2. ✅ `versioning.md` —— 分步发布是本项目的非标准用法，容易忘记，尽早落文
3. ✅ 三篇 adr —— 趁选型记忆新鲜时补，可从 research 报告摘编

## 后续可选

- ✅ 根 README.md：模板项目对外的门面
- ✅ CI 工作流文档：`guide/ci.md`
