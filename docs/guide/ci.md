# CI 工作流

`.github/workflows/ci.yml` 定义了模板的持续集成流程。

## 触发条件

- `push` 到 `main`
- `pull_request`（任何目标分支）

## 流水线结构

```
checkout → Setup pnpm → Setup Node → Install → Lint → Build → Test → Check packages
```

| 步骤 | 命令 | 说明 |
|---|---|---|
| checkout | `actions/checkout@v7` | 拉取代码 |
| Setup pnpm | `pnpm/action-setup@v6` | 自动读取根 `package.json` 的 `packageManager` 字段安装对应版本（与本地 corepack 同源） |
| Setup Node | `actions/setup-node@v7` | Node 22 + pnpm 缓存 |
| Install | `pnpm install --frozen-lockfile` | 严格按 lockfile 安装 |
| Lint | `pnpm lint` | ESLint 全仓检查 |
| Build | `pnpm build` | turbo 按拓扑构建所有包 |
| Test | `pnpm test` | Vitest 单元测试 |
| Check packages | `pnpm check:pkg` | publint + attw 产物校验 |

## 设计要点

- **pnpm 版本单一事实来源**：`packageManager: pnpm@11.24.0` 同时驱动本地 corepack 和 CI，不需要在 workflow 里重复写版本号（见 `ci.yml` 中 Setup pnpm 的注释）
- **lint 不进 turbo 任务图**：lint 是「全仓一次跑完」的全局任务，CI 中作为独立步骤执行；turbo 只编排 build / test / check:pkg
- **顺序**：lint 放最前面——失败成本低，能快速失败

## 扩展建议

- **commit 校验**：如需在 CI 校验 PR 内 commit message，可加一步 `pnpm exec commitlint --from origin/main --to HEAD`
- **多 Node 版本**：可在 `strategy.matrix` 加 Node 版本矩阵，但本模板 Node ≥ 22.18 为硬性要求（tsdown 限制），单版本足够
- **发布工作流**：如需自动发布 npm，参考 Changesets 官方 `changesets/action`，从 version PR 到 publish 全自动；本模板默认不启用
