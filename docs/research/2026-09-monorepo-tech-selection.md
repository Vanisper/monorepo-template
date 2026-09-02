# 前端 Monorepo 模板项目技术选型调研（TypeScript）

> 调研日期：2026-09-02。所有结论均以各工具的官方文档、GitHub 仓库与官方 blog 为准，并附来源链接。
> 背景：为「前端单仓多库（monorepo）模板项目」做技术选型，覆盖三大主题：Lib 库打包、版本管理、单仓多库管理。

---

## 〇、2025–2026 年生态大背景（影响所有选型的关键事件）

- **Vite 8 于 2026-03-12 正式发布，Rolldown（Rust）成为默认且唯一的打包器**，取代原来 esbuild（dev）+ Rollup（build）的双引擎架构；Rolldown 1.0 于 2026-05 达到稳定。来源：[Vite 8.0 is out!](https://vite.dev/blog/announcing-vite8)、[Vite 8 Beta 公告](https://main.vitejs.dev/blog/announcing-vite8-beta)。
- **Cloudflare 于 2026-06-04 宣布收购 VoidZero**（尤雨溪创立，维护 Vite / Vitest / Rolldown / Oxc 的公司），官方承诺所有项目保持 MIT 开源、vendor-neutral，并设立 100 万美元 Vite 生态基金。来源：[Cloudflare 官方公告（转述）](https://www.publickey1.jp/blog/26/cloudflareviterolldownvoidzeroastrovitecloudflare.html)、[Pulse 2.0 报道](https://pulse2.com/cloudflare-acquires-voidzero-to-build-the-future-of-the-ai-native-web/)。
- **tsup 官方宣布停止积极维护，推荐迁移到 tsdown**（README 顶部警告）。来源：[egoist/tsup](https://github.com/egoist/tsup)、[相关 issue #1391](https://github.com/egoist/tsup/issues/1391)。
- **pnpm 已发布 v12**（当前 12.2.x），并在 12.x 中内置了 workspace 任务编排（`tasks` 配置 + `^build` 依赖图调度），开始向 Turborepo 的领地延伸。来源：[pnpm releases](https://github.com/pnpm/pnpm/releases)。
- **Changesets v3 已正式发布**（`@changesets/cli@3.x`，ESM-only，要求 Node `^22.11 || ^24 || >=26`）。来源：[changesets releases](https://github.com/changesets/changesets/releases)。

---

## 一、Lib 库打包工具

### 1.1 候选工具对比

| 工具 | 底层引擎 | 输出格式 | d.ts 生成方案 | Rolldown 系 | 维护状态（2026-09） |
|---|---|---|---|---|---|
| **tsdown** | Rolldown + Oxc（Rust） | ESM / CJS / IIFE / UMD，支持 unbundle（bundleless）模式 | 默认 rolldown-plugin-dts；开启 `isolatedDeclarations` 后改用 oxc-transform 生成，极快 | ✅ 原生 | ✅ 活跃，Rolldown 官方项目，要求 Node ≥ 22.18 |
| **tsup** | esbuild（JS 部分） | ESM / CJS / IIFE | tsc（慢）或 API Extractor | ❌ | ⚠️ **官方停止积极维护**，README 建议迁移 tsdown |
| **unbuild** | Rollup + esbuild + mkdist | ESM / CJS + bundleless（mkdist 转译） | rollup-plugin-dts / untyped | ❌ | ✅ 维护中（unjs），最新 v3.6.x，迭代节奏较慢 |
| **Rollup（原生）** | Rollup 4 | 全格式，完全可控 | 需自配 `@rollup/plugin-typescript` 或 `rollup-plugin-dts` | ❌（但 Rolldown 兼容其插件生态） | ✅ 活跃，但定位是通用 bundler，配置成本高 |
| **Vite library mode** | Vite 8 = Rolldown | ESM / CJS / UMD（lib 模式） | 需自配（`vite-plugin-dts` 等社区插件） | ✅（Vite 8 起） | ✅ 活跃；官方定位仍是「应用优先」，lib mode 是附属能力 |
| **tsc 直出** | TypeScript compiler | 逐文件转译（bundleless） | tsc 原生 `.d.ts`，类型最保真 | ❌ | ✅ 永远可用；无 tree-shaking 优化、无压缩 |

### 1.2 各工具优缺点

**tsdown** —— 当前新项目的首选。
- 优点：开箱即用（自动检测 `exports`/`types` 字段决定是否生成 d.ts）；兼容 tsup 的主要选项，迁移平滑；支持 Rollup / Rolldown / unplugin 插件生态；`isolatedDeclarations` 模式下 d.ts 由 oxc 生成，速度相比 tsc 有数量级提升；官方定位「将成为 Rolldown-Vite Library Mode 的基础」，与 Vite 生态长期绑定。来源：[tsdown 官网](https://tsdown.dev/guide/)、[tsdown dts 文档](https://tsdown.dev/options/dts)、[GitHub rolldown/tsdown](https://github.com/rolldown/tsdown)。
- 缺点：要求 Node ≥ 22.18；相对年轻（2024 年起），边缘场景仍需 rolldown-plugin-dts 补齐；Windows/老 Node 环境的团队需注意版本门槛。

**tsup** —— 不建议新项目采用。
- 优点：生态存量巨大、资料最多。
- 缺点：官方已宣布停止积极维护（"This project is not actively maintained anymore. Please consider using tsdown instead."）；d.ts 走 tsc 很慢，esbuild 不产类型。来源：[egoist/tsup README](https://github.com/egoist/tsup)。

**unbuild** —— unjs/Nuxt 生态内的合理选择。
- 优点：`build.config.ts` 声明式配置；rollup 打包 + mkdist bundleless 两种产物可同时输出；自动从 `package.json` 推断 entries/externals。最新 v3.6.1（含 `inlineDependencies`、并行构建等增强）。来源：[unjs/unbuild releases](https://github.com/unjs/unbuild/releases)。
- 缺点：仍是 Rollup+esbuild 组合，性能不如 Rust 系；配置模型与主流（tsup/tsdown）不同，出了 unjs 生态资料较少；`isolatedDeclarations`/oxc 加速路径不在其路线图上。

**Rollup 原生** —— 最大控制力、最高维护成本。
- 优点：插件生态最成熟，产物完全可控；Rolldown 兼容大部分 Rollup 插件，未来可平移。
- 缺点：TS 支持、d.ts、双格式 exports 全要自己拼；模板项目若追求「开箱即用」不应裸用。

**Vite library mode** —— 适合「应用+库」同仓且已重度使用 Vite 的场景。
- 优点：Vite 8 后底层即 Rolldown，dev/build 行为一致；配置熟悉。
- 缺点：lib mode 本质是 Rolldown 配置的薄封装，d.ts 依赖社区插件（如 `vite-plugin-dts`，走 tsc，慢）；tsdown 官方已声明要成为其 lib mode 基础，长期看二者会融合。来源：[tsdown FAQ](https://tsdown.dev/guide/faq)。

**tsc 直出 / bundleless** —— 最稳的「零 bundler」路线。
- 优点：类型 100% 保真、产物逐文件对应源码，天然利于 tree-shaking 与跨包源码跳转（配合 `publishConfig` + `tsx`/`source` 条件可实现 internal package 免构建）。
- 缺点：无压缩、无单文件产物；对「要发 CJS+ESM 双格式且要 minify」的库不够。
- **配套校验工具（无论选哪个打包器都建议加）**：[publint](https://publint.dev/)（检查 package.json 发布配置）和 [arethetypeswrong (attw)](https://arethetypeswrong.github.io/)（检查 ESM/CJS 下的类型解析正确性），均有 CLI 可进 CI。

### 1.3 d.ts 生成方案小结

| 方案 | 速度 | 保真度 | 说明 |
|---|---|---|---|
| tsc `--declaration` | 慢 | 最高 | 传统方案，tsup/unbuild/插件默认走它 |
| `isolatedDeclarations`（TS 5.5+ 引入）+ oxc-transform | 极快 | 高（要求显式类型标注） | tsdown 开启该 tsconfig 后自动切换；同时利于跨包增量类型检查 |
| rolldown-plugin-dts | 快 | 高 | tsdown 默认的 d.ts **打包**（合并为单个 .d.ts）方案 |
| API Extractor | 慢 | 最高（可做 API 审查报告） | 微软系，适合需要 API 变更审计的大型项目，模板项目一般不需要 |

---

## 二、项目版本管理工具（monorepo 版本号 / changelog / 发布）

### 2.1 两种工作流范式

- **Changeset 文件工作流**：每个 PR 附带一个 `.changeset/*.md` 文件，显式声明「哪个包、什么级别的 bump、 changelog 文案」。发布时由工具汇总。代表：Changesets。
- **Conventional Commits 自动推导**：从 `feat:`/`fix:`/`BREAKING CHANGE` 提交信息推导版本号与 changelog。代表：release-please、semantic-release、changelogen、Nx release（可选）。

### 2.2 候选工具对比

| 工具 | 范式 | Monorepo 支持 | 独立/固定版本 | pnpm 集成 | 维护状态（2026-09） |
|---|---|---|---|---|---|
| **Changesets** | changeset 文件 | 原生设计目标 | 均支持（`linked`/`fixed` 配置） | ✅ 一等支持（`workspace:` 协议感知） | ✅ v3 已发布，核心维护者含 Vite 团队成员（bluwy、Andarist） |
| **release-please** | conventional commits | manifest 模式支持多包 | 支持 linked 版本策略 | 可用但非 pnpm 原生 | ✅ googleapis 维护（注明「非 Google 官方产品」），偏 Google 系项目 |
| **semantic-release** | conventional commits | 官方明确不支持 monorepo（需 multi-semantic-release 等社区封装） | — | 一般 | ✅ 活跃（v25.0.9，2026-08；v26 beta 要求 Node ≥ 22.22） |
| **bumpp** | 手动/交互式 bump | `-r` 递归 bump monorepo 全部包 | 独立版本 | ✅（antfu 系，pnpm 友好） | ✅ 活跃（antfu-collective），新增 `--pr` 发布 PR 工作流 |
| **changelogen** | conventional commits | 主要面向单包；monorepo 需自行编排 | — | ✅ unjs 系 | ✅ 维护中（v0.6.x），更新频率一般 |
| **Lerna version/publish** | conventional commits 或手动 | 原生 | fixed / independent 均支持 | 兼容 | ✅ Nx 团队托管，v9（2025-09，支持 OIDC trusted publishing） |
| **Nx release** | conventional commits 为主，可编程定制 | 原生 | 均支持（release groups） | 兼容 | ✅ 活跃（Nx 22，2025-10） |

### 2.3 各工具优缺点

**Changesets** —— 前端开源库 monorepo 的事实标准。
- 优点：发布意图在 PR 评审时即可见（changelog 文案人工撰写，质量最高）；`changesets/action` 自动生成「Version Packages」发布 PR，合并即发布；支持预发布（pre-release）流程；v3 已 ESM 化并持续演进。被 Radix UI、tRPC、Vercel 系仓库等广泛采用。来源：[changesets/changesets](https://github.com/changesets/changesets)、[changesets.dev](https://changesets.dev)。
- 缺点：贡献者需要额外学习「写 changeset 文件」这一动作；已知与 pnpm catalog 变更的联动存在盲区（[issue #1707](https://github.com/changesets/changesets/issues/1707)：catalog 升级依赖版本时不触发 bump 检测）。

**release-please** —— 「发布 PR 机器人」路线。
- 优点：Google 出品的 manifest 模式可同时管理多包多语言；Release PR 持续累积、合并即打 tag + GitHub Release，流程优雅。来源：[googleapis/release-please](https://github.com/googleapis/release-please)。
- 缺点：不负责发布到 npm（只到 tag/GitHub Release，还需自接 publish 步骤）；changelog 质量完全取决于提交信息纪律；配置（manifest + config JSON）在前端社区相对小众。

**semantic-release** —— 全自动派。
- 优点：提交即发布，零人工步骤，插件生态庞大。
- 缺点：**官方明确不支持 monorepo**（[issue #1681](https://github.com/semantic-release/semantic-release/issues/1681)），需社区封装；全自动意味着对提交信息错误零容忍，回滚心智成本高；无「发布前集中审阅 changelog」的环节。

**bumpp + changelogen（unjs 系）** —— 轻量手动路线。
- 优点：bumpp 交互式选版本、`-r` 递归 bump、支持 `bump.config.ts` 与 `--pr` 发布 PR 流程；changelogen 从 conventional commits 生成漂亮的 changelog 并可直接发 GitHub Release（vueuse、nuxt 在用）。组合灵活、依赖少。来源：[antfu-collective/bumpp](https://github.com/antfu-collective/bumpp)、[unjs/changelogen](https://github.com/unjs/changelogen)。
- 缺点：changelogen 对 monorepo 多包changelog 没有一等支持（需逐包跑）；整体是「工具」而非「框架」，流程要自己拼。

**Lerna version / Nx release** —— 与任务编排工具绑定。
- Lerna v9 仍在维护（Nx 团队托管），`lerna version/publish` 支持 fixed/independent 两种模式与 OIDC trusted publishing，但其 legacy 包管理能力已进入维护模式，定位收缩为「version/publish + 任务缓存（底层是 Nx）」。来源：[lerna releases](https://github.com/lerna/lerna/releases)、[Lerna 官方说明](https://lerna.js.org/docs/introduction)。
- Nx release 可编程性最强（version/changelog/publish 三段独立定制、release groups 支持独立版本），但只在「已经选了 Nx」时才有意义。来源：[Nx Manage Releases 文档](https://nx.dev/docs/features/manage-releases)。

---

## 三、单仓多库管理工具（workspace + 任务编排 + 依赖治理）

### 3.1 候选工具对比

| 工具 | 定位 | 任务缓存/编排 | 依赖治理 | 学习成本 | 维护状态（2026-09） |
|---|---|---|---|---|---|
| **pnpm workspaces** | 包管理 + workspace | v12 起内置 `tasks` 编排（`^build` 依赖图调度、并发限制、`--dry-run` 任务图），无内容寻址缓存 | ✅ Catalogs（9.5+）、`overrides`、严格 node_modules | 低 | ✅ 活跃，v12.2.x |
| **Turborepo** | 任务编排/缓存层 | ✅ 内容哈希缓存、远程缓存、`turbo query`（GraphQL 查询包/任务图，2.9 转正）、watch、边界规则 | 不管依赖（交给包管理器） | 低-中 | ✅ 活跃（Vercel），2.9（2026-03），2.10 canary 中，3.0 以 future flags 渐进过渡 |
| **Nx** | 全栈 build 平台 | ✅ 缓存、分布式任务执行（Nx Cloud）、affected 图、AI 自愈 CI、插件生成器 | 有依赖规则/边界治理（module boundaries） | 中-高 | ✅ 活跃，Nx 22（2025-10），2026 roadmap 主打 AI agent 与 polyglot |
| **Lerna** | version/publish + 任务缓存（底层 Nx） | 复用 Nx 缓存 | legacy 包管理已入维护模式 | 低 | ✅ 维护中但角色收缩，新项目不建议作为编排主力 |
| **Moon** | Rust 任务编排 + 工具链管理 | ✅ 缓存、受影响检测、自带工具链版本管理（proto） | 有一定治理 | 中 | ✅ 活跃（moonrepo），社区规模小于 Turbo/Nx |

### 3.2 各工具优缺点

**pnpm workspaces + catalogs**
- 优点：模板项目的必选项（磁盘效率、严格隔离、`workspace:*` 协议）；**catalogs**（`pnpm-workspace.yaml` 中集中声明依赖版本，子包用 `catalog:` 引用）已成为 monorepo 依赖治理的标准做法，antfu 等社区领袖背书；pnpm 12 新增 workspace 任务编排后，**小型 monorepo 可以只用 pnpm 一个工具**完成依赖管理 + 任务调度。来源：[pnpm Catalogs 文档](https://pnpm.io/catalogs)、[antfu: Categorize Your Dependencies](https://antfu.me/posts/categorize-deps)、[pnpm releases](https://github.com/pnpm/pnpm/releases)。
- 缺点：pnpm 的任务编排目前**没有内容寻址缓存**（改动检测靠 git/拓扑而非文件哈希），CI 提速能力远不及 Turbo/Nx；catalog 与 Changesets 的联动有已知盲区（见 2.3）。

**Turborepo**
- 优点：只做「任务编排+缓存」一件事且做得好；2.9 大幅优化 Time to First Task（大仓最高提升 96%）、`turbo query affected` 可替代已废弃的 `turbo-ignore` 构建灵活 CI；与 pnpm + Changesets 是社区最经典的组合。来源：[Turborepo 2.9 blog](https://turborepo.dev/blog/2-9)。
- 缺点：远程缓存的高级体验与 Vercel 绑定（可自托管但生态弱）；3.0 临近，需留意 future flags 迁移；不管依赖治理，必须与 pnpm 搭配。

**Nx**
- 优点：能力最全（缓存 + 分布式 CI + 代码生成器 + 依赖边界规则 + 内置 release）；2026 roadmap 重点投入 AI agent 协作与自愈 CI；多语言（polyglot）支持最好。来源：[Nx 2026 Roadmap](https://nx.dev/blog/nx-2026-roadmap)、[Nx 22 release](https://nx.dev/blog/nx-22-release)。
- 缺点：学习曲线与概念负担明显高于 Turbo；对「纯 TS 库模板」来说 80% 能力用不上；plugin/生成器体系带来额外的配置与升级成本。

**Lerna**
- 现状：Nx 公司托管后存活下来，v9 支持 OIDC trusted publishing；但 legacy 包管理功能已进入维护模式，官方自己建议依赖管理交给包管理器、任务缓存交给 Nx。新项目没有引入理由（除非只要它的 `version/publish`）。来源：[lerna CHANGELOG](https://github.com/lerna/lerna/blob/main/packages/lerna/CHANGELOG.md)、[Legacy Package Management](https://lerna.js.org/docs/legacy-package-management)。

**Moon**（简要）
- Rust 编写、速度快、自带工具链管理（统一 Node/pnpm 版本）；设计严谨但社区与生态（插件、模板、Stack Overflow 答案量）远小于 Turbo/Nx，作为模板项目会增加使用者的学习成本。来源：[moonrepo 官方对比页](https://moonrepo.dev/docs/comparison)。

---

## 四、推荐组合

### 方案 A（主推）：面向开源/团队协作的现代 TS 库模板

> **pnpm workspaces（+ catalogs）+ Turborepo + tsdown + Changesets + publint/attw**

| 关注点 | 选型 | 理由 |
|---|---|---|
| 包管理/依赖治理 | pnpm v12 + catalogs | workspace 事实标准；catalogs 统一依赖版本，消除版本漂移 |
| 任务编排/缓存 | Turborepo 2.9+ | 只做编排与缓存，心智简单；`turbo query affected` 支撑 CI 按需构建 |
| 库打包 | tsdown | Rolldown 官方库打包器，tsup 官方指定的继任者；开启 `isolatedDeclarations` 后 d.ts 走 oxc，构建与类型生成都极快；未来与 Vite lib mode 融合，路线最稳 |
| 版本/发布 | Changesets v3 | 前端 monorepo 事实标准；changeset 文件让发布意图可评审，changelog 质量最高；与 pnpm workspace 一等集成 |
| 发布校验 | publint + attw | 低成本拦住 exports/类型解析错误，进 CI |

### 方案 B（备选）：极简/个人或小型团队、unjs 风格模板

> **pnpm v12（自带任务编排）+ tsdown（或 unbuild）+ bumpp + changelogen**

- 仓内包数量少（<10）、CI 时间不是瓶颈时，可省掉 Turborepo：pnpm 12 的 `tasks` 编排（`^build` 依赖调度、并发限制）已够用，少一层工具。
- 版本管理走「conventional commits + 手动触发」：bumpp `-r` 交互式 bump + changelogen 生成 changelog/GitHub Release，零机器人、零 changeset 文件，适合提交信息纪律好的小团队；若使用 unjs 生态（Nuxt 模块等），打包器可换成 unbuild 以保持生态一致。

### 明确不推荐

- **tsup**：官方已停止积极维护，新项目勿入。
- **semantic-release（monorepo 场景）**：官方不支持 monorepo，社区封装脆弱。
- **Lerna 作为编排工具**：角色已收缩为 version/publish，且该功能可被 Changesets 覆盖。
- **裸 Rollup / 裸 Vite lib mode 作为模板默认**：配置成本高或 d.ts 体验不佳，除非有特殊产物需求。
- **Nx**：能力过剩，除非模板还要承载应用、后端或多语言项目。

---

## 附：主要信息来源汇总

- tsdown：[官网](https://tsdown.dev/guide/) · [dts 文档](https://tsdown.dev/options/dts) · [FAQ（与 tsup 对比）](https://tsdown.dev/guide/faq) · [GitHub](https://github.com/rolldown/tsdown)
- tsup：[GitHub（停维护声明）](https://github.com/egoist/tsup) · [issue #1391](https://github.com/egoist/tsup/issues/1391)
- unbuild：[GitHub releases](https://github.com/unjs/unbuild/releases)
- Vite/Rolldown：[Vite 8 发布公告](https://vite.dev/blog/announcing-vite8) · [Cloudflare 收购 VoidZero](https://www.publickey1.jp/blog/26/cloudflareviterolldownvoidzeroastrovitecloudflare.html)
- Changesets：[GitHub](https://github.com/changesets/changesets) · [releases（v3）](https://github.com/changesets/changesets/releases) · [catalog 联动 issue #1707](https://github.com/changesets/changesets/issues/1707)
- release-please：[googleapis/release-please](https://github.com/googleapis/release-please)
- semantic-release：[releases](https://github.com/semantic-release/semantic-release/releases) · [monorepo 立场 issue #1681](https://github.com/semantic-release/semantic-release/issues/1681)
- bumpp：[antfu-collective/bumpp](https://github.com/antfu-collective/bumpp) · changelogen：[unjs/changelogen](https://github.com/unjs/changelogen)
- pnpm：[Catalogs 文档](https://pnpm.io/catalogs) · [releases（v12 任务编排）](https://github.com/pnpm/pnpm/releases)
- Turborepo：[2.9 blog](https://turborepo.dev/blog/2-9) · [releases](https://github.com/vercel/turborepo/releases)
- Nx：[Manage Releases](https://nx.dev/docs/features/manage-releases) · [Nx 22 blog](https://nx.dev/blog/nx-22-release) · [2026 Roadmap](https://nx.dev/blog/nx-2026-roadmap)
- Lerna：[releases](https://github.com/lerna/lerna/releases) · [与 Nx 的关系](https://lerna.js.org/docs/lerna-and-nx)
- Moon：[官方对比页](https://moonrepo.dev/docs/comparison)
- 校验工具：[publint](https://publint.dev/) · [arethetypeswrong](https://arethetypeswrong.github.io/)
