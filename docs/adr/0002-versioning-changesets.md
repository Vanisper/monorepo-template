# ADR 0002：版本管理选 Changesets，发布流程分步设计

## 状态

已采纳（2026-09）

## 背景

monorepo-template 需要版本管理与发布方案。使用场景以**内部自治**为主：包不发 npm，但要有清晰的版本历史、changelog 和 git tag；未来不排除个别包发 npm 的可能。要求：changelog 质量高、发布意图可评审、与 pnpm workspace 集成好。

## 决策

选择 **Changesets v3**，并把发布流程拆成四步（记录 → 版本 → tag → 可选 npm 发布），默认前三步，`publish:npm` 脚本默认注释掉。

## 候选方案

| 工具 | 工作流 | 排除/选用原因 |
|---|---|---|
| **Changesets v3** | changeset 文件 → version → tag → publish（分步） | ✅ 选用 |
| release-please | conventional-commits 自动推导 → 自动 PR | ❌ 不负责 npm 发布，changelog 质量依赖 commit 纪律 |
| semantic-release | 全自动 conventional-commits 推导 | ❌ 官方明确不支持 monorepo |
| bumpp + changelogen | 手动执行，conventional-commits 推导 changelog | ❌ 发布意图不可评审，内部流程适配成本高 |

### 理由

1. **发布意图可见**：changeset 文件随 PR 提交，版本变更在代码评审时一目了然，避免「合了代码才发现要发版」的隐形变更
2. **changelog 质量最高**：changeset 文件由开发者主动撰写，比 commit message 推导出的更准确
3. **pnpm workspace 一等集成**：官方支持 workspace 包过滤、版本对齐（fixed/linked）等 monorepo 专属能力
4. **分步流程**：正好满足「内部只到 tag，发 npm 是可选步骤」的设计，与 template 的内部定位天然契合

## 发布流程设计（本项目定制）

```
changeset → version → tag（内部到此结束）
                  ↘
                   publish:npm（默认注释掉，按需启用）
```

### 为什么拆成四步

- `version` 和 `tag` 分离：version 更新后需要手动 commit，再打 tag，保持历史干净
- `publish:npm` 默认注释掉，避免误操作；内部自治的包永远不会触碰 npm registry
- Changesets 会自动跳过 private 包和已发布过的版本，恢复到 `publish:npm` 时只需把注释从 `"//"` 块移回 `scripts`，无需改其他配置

## 已知短板

- 对 pnpm catalog 变更的 bump 检测有盲区：如果只改了 `pnpm-workspace.yaml` 里的 catalog 版本号，changesets 无法感知到这是 breaking change，需要手动在 changeset 中声明
- 对 conventional-commits 的自动推导完全缺失，需要开发者主动跑 `pnpm changeset`（这也是刻意的约束，不是缺点）

## 来源

- [changesets 官方文档](https://github.com/changesets/changesets)
- [完整调研报告](../research/2026-09-monorepo-tech-selection.md)
