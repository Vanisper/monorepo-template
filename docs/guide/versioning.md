# 版本管理与发布

本项目采用 Changesets v3 做版本管理，发布流程设计为**分步执行**——内部自治的包走到 git tag 就结束，不触碰 npm registry。

## 工作流总览

```
1. pnpm changeset     # 记录变更
2. pnpm version       # 更新版本号 + 生成 changelog
3. pnpm tag             # 打 git tag
─────────────────────────────── 内部自治到此结束 ─────────────────────
4. pnpm publish:npm     # 可选：构建 + 发布 npm（默认注释掉，按需恢复）
```

## 1. 记录变更（每次开发）

```bash
pnpm changeset
```

按提示选择变更的包和类型（patch / minor / major），生成 `.changeset/` 下的变更说明文件，随 PR 一起提交。

```markdown
---
"@mono/core": patch
---

修复了版本号读取错误
```

## 2. 更新版本号

```bash
pnpm version
```

- 消费 `.changeset/` 下的文件，更新所有受影响包的版本号
- 生成 / 追加 `CHANGELOG.md`
- 完成后 **手动 `git add .` 并 commit**

### 版本计算规则（多次累积时如何 bump）

**一个包无论累积了多少个 changeset，每次发版只做一次 bump，取所有声明中最高的级别**（`major > minor > patch`），不是累加次数：

| 累积的 changeset | 发版结果 |
|---|---|
| patch + patch + patch | 一次 patch bump（0.1.0 → 0.1.1） |
| patch + minor | 一次 minor bump（0.1.0 → 0.2.0） |
| minor + minor | 一次 minor bump（0.1.0 → 0.2.0） |
| patch + minor + major | 一次 major bump（0.1.0 → 1.0.0） |

语义：一次发布就是一个新版本，多个变更合并进这个版本；3 个 minor changeset 也只升一次 minor。

版本号只升一次，但**所有累积的 changeset 消息都会进 CHANGELOG**，按 bump 类型分组（Major/Minor/Patch Changes），每条带 commit 链接：

```markdown
# @mono/hooks-vue

## 0.1.0

### Minor Changes

- abc1234: 新增 createTitleManager 标题管理器
- def5678: 支持 MaybeRefOrGetter 响应式标题

### Patch Changes

- ghi9012: 修复空标题兜底逻辑
```

随时可用 `pnpm changeset status` 预览当前累积的 bump（已按最高级别聚合）。

## 3. 打 git tag

```bash
pnpm tag
```

为每个当前版本号创建 git tag（如 `@mono/core@0.1.0`，格式为 `{包名}@{版本号}`。

> **注意**：在 `pnpm version` 之后、打 tag 之前，请先 `git add .` 提交 version 生成的变更，保持历史干净。

## 4. 可选：发布 npm

`publish:npm` 脚本默认被注释掉了（见根 `package.json` 的 `"//"` 字段）。需要时把它移回 `scripts`：

```jsonc
{
  "publish:npm": "pnpm build && changeset publish"
}
```

恢复后即可执行。发布前请确认：

- 已登录正确的 npm registry（`npm login`）
- 包名 / scope 已确认可用（`npm view @mono/core` 等）
- Changesets 会自动跳过 `"private": true` 的包和已发布过的版本，无需手动筛选

## 常用操作

```bash
# 查看所有包当前版本
pnpm changeset status

# 以预发布模式更新（如 alpha / beta）
pnpm changeset pre enter alpha
pnpm version          # 生成 0.1.0-alpha.1
pnpm changeset pre exit
```

## 版本策略选择

默认是**独立版本**（independent versioning），各包版本号各自演进。如果某些包需要严格对齐版本，在 `.changeset/config.json` 中配置：

```jsonc
{
  "fixed": [["@mono/core", "@mono/utils"]]
}
```

- `fixed`：组内包永远保持相同版本号（推荐对强关联包使用）
- `linked`：组内包版本联动，但可独立升 minor/major
- 默认：各包独立，互不影响

## ignore：让包不参与版本流

`.changeset/config.json` 的 `ignore` 列表让包彻底退出 bump / tag / Release 流程，分两种用法：

- **永久 ignore**（示例/教学包）：`@mono/core`、`@mono/utils` 这类占位示例包，本来就不该有版本与 tag
- **暂时 ignore**（未就绪包）：包还没有真实内容时（如当前只有占位的 `@mono/ui-vue`），先加入 ignore 避免无意义的 0.0.0 tag；等有真实内容要发布时，从列表中移除该行即可

### tag 的语义与「只打 bump 的包」

`changeset tag`（git-tag）的语义是**给所有非 ignore 包的当前版本打 tag**，没有「只给本次 bump 的包打 tag」的开关。两种机制的区别：

- `changeset publish`：只给 bump 的包打 tag（语义精确），但附带 npm 发布——本模板不发 npm，用不了
- `changeset git-tag`：给所有非 ignore 包打 tag——首次发布时会把全仓包都 tag 一遍

**本模板的处理惯例**：ignore 过滤掉不该进版本流的包（示例包、未就绪包）；偶有无用 tag 手动删除（`git push origin --delete <tag>`）。如果以后确实在意「只打 bump」，可以用 `changeset publish-plan` 输出本次 bump 的包列表，写自定义 release 脚本只给这些包打 tag（有路可走，暂不实现）。

## 跳过版本（不发版场景）

如果一组变更只影响内部脚本/配置，无实际代码变更，在 changeset 文件中省略包名即可（changeset 会提示你选哪些包）。

## 发版自动化（release.yml）

`.github/workflows/release.yml` 在每次 push 到 main 时运行 `changesets/action`，自动完成阶段 2-3：

- main 上有未消费的 changeset → 自动创建/更新 **`chore: version packages` PR**（跑 `changeset version`，消费 changeset、bump 版本号、生成 CHANGELOG）
- 该 PR 被合并后 → 执行 `publish-script`（`pnpm build && pnpm changeset tag`，**只打 tag、不发 npm**），并推送 tag、按各包 CHANGELOG 内容**自动创建 GitHub Release**

效果：你只需要在 feature PR 里写好 changeset 并合并，之后的发版动作（version PR → 合并 → tag → Release）全部自动。

### 落地前提与注意事项（首次配置必看）

- **仓库 Workflow permissions 必须允许写与创建 PR**：`Settings → Actions → General → Workflow permissions` 设为 `Read and write permissions`，并勾选 `Allow GitHub Actions to create and approve pull requests`。否则 `changesets/action` 创建 version PR 时会报 `HttpError: GitHub Actions is not permitted to create or approve pull requests`（可用 `gh api repos/<owner>/<repo>/actions/permissions/workflow` 查看与修改）
- **version PR 不触发 CI**：它由 `GITHUB_TOKEN` 创建，GitHub 不会为 token 创建的 PR 运行其他 workflow——这是 GitHub 的限制。表现为 PR 页面显示 `workflow awaiting approval`，需要点 `Approve workflows to run`（或 `gh api -X POST repos/<owner>/<repo>/actions/runs/<run_id>/approve`）。如果 main 的分支保护要求状态检查通过才能合并，需要配 PAT（Personal Access Token）替换 `github-token`，或接受手动放行
- 自动创建的 Release 内容是各包 CHANGELOG 的条目——这正是「一个包一个 changeset 文件、写库级别描述」的价值所在
