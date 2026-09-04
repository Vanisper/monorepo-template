# hooks-vue：迁移与扩展记录

包的使用文档见 [packages/hooks/vue/README.md](../../packages/hooks/vue/README.md)。本文记录仓库级信息：分层形态的实现决策、从 crab-net-frontend 迁入的适配对照、包内扩展流程。

## 分层形态的实现决策

各模块拆为「core / 适配层」两层（拉模式）：

- **`core.ts` 纯逻辑内核**：无框架依赖的纯状态 / 纯函数。契约：变更方法返回 boolean 表达「是否有实际变化」；列表类提供**快照 + 引用稳定**语义（内容不变 `getList()` 返回同一冻结引用）。core 当前仅包内存在，等出现第二个平台消费方（react / uniapp 侧）再考虑集中为平台无关包。
- **vue 适配层**：`shallowRef` 版本号（trigger）+ `computed` 读 core 快照。`commit(mutate)` 只在 core 报告实际变化时 bump trigger——未变更的重复调用不触发任何响应式更新。`ComputedRef` 在类型层面即表达只读，无需 `Readonly<Ref>` 双重包装。
- **响应式源（Ref / getter）的归一**：core 只存纯 JS 形态（string / getter），适配层把 Ref 归一为 `() => ref.value` 活引用。computed 的求值链穿过这个 getter 读到 ref——**源的响应式绑定天然保真**，源变化直接触发投影重算，无需通知机制参与；trigger 只负责「源替换 / 状态结构变更」。title、iframe 的 title 传 Ref 均走此路径。
- **守卫不进根入口**：根 barrel 若重导出守卫，其 d.ts 会带上 vue-router 类型引用，未安装 vue-router 的消费方在类型解析阶段即报错——与 optional peerDependency 的意图冲突，因此守卫走子路径导出。产物校验（check:pkg）分两遍 attw：根入口按默认档位全量严格校验；子路径入口用 `--profile esm-only`——node10 解析不读 exports 字段、无法支持任何子路径导出，属预期失败而非缺陷。

> 后续演化方向：core 增加订阅能力（subscribe / dispatch 统一变更入口 / 批量通知），适配层退化为纯转发并删除 commit——对齐 headless core 方法论（TanStack query-core 同款 DNA）。当前拉模式是这条路上的中间台阶，切换时机另定。

### 数据所有权 / 单一事实来源

判断单位是**每个数据项**（不是整个 hook），所有权必须唯一，规则：

- **内部拥有 → 入参是种子**：管理器管理的数据，入参仅构造时拷贝，变更只走管理器暴露的接口，不对入参引用做响应反馈。unique-list / keep-alive / iframe 记录 / flag 的值均属此类。
- **外部拥有 → 管理器只读**：外部数据源（title 的各级标题源、iframe 的 title）管理器只读消费（活引用求值链）或显式换源 setter，绝不回写。

> 反例教训：flag 曾支持 `init` 传 Ref——watch 感染 + toggle 回写，同一个数据项两个主人（内部管理 + 外部源），实现上出现「回写后源被改回原值时 watcher 净零变化跳过、镜像与源脱节」的坑。该坑是所有权设计错误的症状而非实现技巧问题，已收缩 `init` 为纯 boolean 种子。受控开关场景由调用方显式 `watch(source, v => flag.toggle(v))` 表达。

- **派生投影**（mobile-adaptation 的 mode / 各处 status、openedList、finalTitle）：只存输入，派生值恒为函数投影，输入变化即时重算——不存储可偏离的独立状态。

## 从 crab-net-frontend 迁入的适配记录

以下为源实现（`crab-net-frontend/packages/composables`）与本包的 API 差异，源项目迁移时按此对照：

| 源 API | 本包 API | 变化 |
| --- | --- | --- |
| `createXxx()` 返回 `useXxx()` | 直接返回管理器对象 | 去掉无状态的双层闭包，与 `createTitleManager` 统一 |
| `changeFlag` / `resetFlag` | `toggle` / `reset` | 命名向社区惯例靠拢 |
| `uniqueList.clean()` | `clear()` | 同上 |
| `createStatus(flag: Ref)` / `afterChange(value, flag)` | `createStatus(flag: boolean)` / `afterChange(value)` | core 化后回调收纯值 |
| flag 的 `init` Ref 单向同步 | `init` 只收 boolean 种子 | 数据所有权在管理器内部：不对入参引用做响应反馈，变更只走接口；受控场景调用方显式 watch |
| `list` 深层响应式数组 | core 冻结快照 + 引用稳定 | 适配层以 `computed` 投影；空串 / null / undefined 不再被过滤——唯一性管理只管唯一性，值语义归调用方 |
| `createKeepAliveGuard(handlers, metaKeys)` | 同名同形 | 保留「配置 → 安装」两段式，守卫确有配置期与安装期 |
| `KeepAliveMetaKeys`（iframe 内重复定义） | `RouteMetaKeys`（`common/route-meta`） | 去重，名称不再绑定 keep-alive |
| `isTargetRouteMatch`（两处重复） | `matchRouteTarget`（`common/route-meta` 导出） | 去重；`config` 从 `any` 收紧为 `unknown` |
| `MOBILE_WIDTH_THRESHOLD = 1024` 魔法值 | `thresholdWidth` 配置项（默认 1024） | 参数化 |
| `mode` 初始恒为 `'pc'` | 按 UA 初始化，且为 `resolveMode` 纯投影 | 输入（宽度 / 启用开关）变化即时重算 |
| `setMode(width)` | `setWidth(width)` | 存的是观测量宽度，setter 命名与之对齐 |
| `closeLoading()` | `markLoaded()` | 命名澄清：标记加载完成而非关闭页签 |
| `enable` 可写 Ref | `enable` 只读 + `setEnabled()` | 只读状态 + setter 惯例统一；监听按消费者计数，最后一个卸载才移除 |

行为修复（源实现的 bug 或隐患）：

1. **mobile-adaptation 的监听清理从不生效**：源实现在 `onMounted` 回调内注册 `onUnmounted`，此时已无活跃组件实例，注册静默失败、resize 监听泄漏。本包将清理注册移到 setup 同步期。
2. **iframe 守卫的 `src` 类型不安全**：源实现 `meta.iframe: true` 且无 `query.iframe` 时会把 boolean 直接当 src 使用，本包改为两者皆缺则跳过打开。
3. **iframe 记录的就地变更**：源实现直接 mutate 记录对象，本包改为不可变更新——旧快照引用天然对应旧状态。

## 包内扩展流程

新增模块时的验证路径与「包内扩展」通用流程一致：`pnpm typecheck && pnpm test`（包内）→ 根级 `pnpm lint / spell` → 变更走 changeset（`@mono/hooks-vue` 按语义化级别）。新增包才需要 [add-package.md](./add-package.md) 的完整流程。
