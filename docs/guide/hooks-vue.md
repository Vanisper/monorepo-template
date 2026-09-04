# hooks 域：@mono/hooks-vue

hooks 域承载跨场景的逻辑复用（与 ui 域分工：hooks 无渲染，ui 有渲染）。域结构与 ui 域一致、按平台分层，当前实现到 `packages/hooks/vue`。

## 模块一览

| 模块 | 一句话 | 分层 |
| --- | --- | --- |
| `title` | 页面标题三级合成（override > route > app） | manager + `useTitle` 挂载 |
| `flag` | 布尔开关状态机 | core + vue 适配 |
| `unique-list` | 唯一列表（Set 去重、插入序、快照引用稳定） | core + vue 适配 |
| `keep-alive` | KeepAlive 缓存列表 + 路由守卫 | 组合 unique-list + 守卫 |
| `iframe` | iframe 多页签管理（LRU）+ 路由守卫 | core + vue 适配 + 守卫 |
| `mobile-adaptation` | pc/mobile 模式判定 | core（纯函数）+ vue 适配 |
| `_route-meta` | 守卫共享的 Meta 键配置与匹配工具（下划线前缀：工具模块而非 hook，排序上前置） | — |

## 各 hook 简要说明

### title

页面标题的合成与写入。`createTitleManager` 维护 app / route / override 三级标题源（均支持 string / Ref / getter），合成出 `finalTitle`；`useTitle(source)` 负责把标题源同步到 `document.title`（setup 内调用随组件卸载停止，模块级常驻，SSR 空操作）。典型用法：应用入口创建管理器，`router.afterEach` 里 `setRouteTitle`，iframe 等特殊场景用 `setOverrideTitle`。

### flag

布尔开关状态机：`toggle(target?)` 翻转或置值、`reset()` 回到创建时快照、`createStatus` 派生、`afterChange` 回调。`init` 传 Ref 时源是单一事实来源（见[所有权约定](#数据所有权与单一事实来源)），传静态值时所有权归管理器。适合弹层开关、折叠态、请求进行中等一切布尔语义的状态。

### unique-list

以 Set 去重的字符串（泛型 `T`）列表，按插入序输出。core 提供 `getList()` 冻结快照——内容不变时返回同一引用、有实际变更时换新数组；增删方法返回是否实际变更。keep-alive 的缓存列表直接由它组合。

### keep-alive

管理 `<KeepAlive :include>` 的组件名列表。`createKeepAlive(metaKeys)` 基于唯一列表组合；`createKeepAliveGuard`（子路径导入）挂在 `router.afterEach` 上，按路由 meta（`keepKey` / `noKeepKey` 白黑名单，匹配路由 name）决定「移除后重加（重新挂载）」还是直接缓存。多页签后台的路由缓存就靠它。

### iframe

iframe 多页签的记录管理与 LRU 淘汰。`open` 复用已存在记录并置顶最近访问序，超出 `maxCache` 个打开页签时关闭最旧；`close` 批量关闭；`markLoaded` 在 iframe onload 时标记加载完成。`title` 支持 string / Ref / getter（Ref 在适配层归一为 getter）。配套 `createIframeGuard`（子路径导入）按 `meta.iframe` 自动开合页签。

### mobile-adaptation

pc/mobile 模式判定：UA 是移动设备则恒 mobile；桌面设备按视口宽度与阈值（默认 1024）判定。`mode` 是判定函数的**纯投影**（输入变化即时重算，不存储独立状态）；`useMobileAdaptation()` 须在 setup 内调用（resize 监听挂组件生命周期，按消费者计数清理）。

## 分层形态：core / 适配层

除 title 外，各模块拆为两层（拉模式）：

- **`core.ts` 纯逻辑内核**：无框架依赖的纯状态 / 纯函数。契约：变更方法返回 boolean 表达「是否有实际变化」；列表类提供**快照 + 引用稳定**语义（内容不变 `getList()` 返回同一冻结引用）——这让「响应式」成为适配层的可选增强，未来任何框架（react、uniapp 侧）都能用引用比较做跳过更新。core 当前仅包内存在，等出现第二个平台消费方再考虑集中为平台无关包。
- **vue 适配层**：`shallowRef` 版本号（trigger）+ `computed` 读 core 快照。`commit(mutate)` 只在 core 报告实际变化时 bump trigger——未变更的重复调用不触发任何响应式更新。`ComputedRef` 在类型层面即表达只读，无需 `Readonly<Ref>` 双重包装。

title 是特例：暂未 core 化（合成逻辑与 vue ref 深度耦合，且无跨端迫切性），但已做「纯状态工厂 + `useTitle` 副作用挂载」分离。

> 后续演化方向：core 增加订阅能力（subscribe / dispatch 统一变更入口 / 批量通知），适配层退化为纯转发并删除 commit——对齐 headless core 方法论（TanStack query-core 同款 DNA）。当前拉模式是这条路上的中间台阶，切换时机另定。

## 数据所有权与单一事实来源

每个 hook 明确声明数据的所有权归属，三种形态：

1. **构造参数拷贝**（unique-list / iframe / flag 静态值）：`initialList` 等仅作构造输入，管理器内部拷贝持有，外部数组后续改动不穿透。
2. **源为事实来源**（flag 传 Ref / title 传 Ref / iframe title 传 Ref）：管理器是镜像或活引用（getter），本地变更**回写源**而非私改镜像。flag 的实现须用 `flush: 'sync'` 的 watch 单路径同步——本地对齐 + watch 回流的双路径会在「回写后源又被改回原值」时因 watcher 净零变化跳过而脱节。
3. **派生投影**（mobile-adaptation 的 mode / 各处 status、openedList、finalTitle）：只存输入，派生值恒为函数投影，输入变化即时重算——不存储可偏离的独立状态。

## 工厂与副作用挂载的形态

状态与副作用分离：状态工厂保持纯净（可在任意环境创建与测试），环境副作用归挂载层所有。具体分三类：

- **纯状态工厂，直接返回管理器**：`createTitleManager` / `createFlag` / `createUniqueList` / `createKeepAlive` / `createIframeManager`。无生命周期副作用，可在模块级创建、任意位置使用。
- **返回须在 setup 内调用的函数**：`createMobileAdaptation` 返回 `useMobileAdaptation()`。resize 监听的注册与清理依赖组件生命周期，必须挂到组件实例上。
- **挂载 hook**：`useTitle(source)`。将标题源同步到 `document.title` 的 DOM 副作用，与 `createTitleManager` 配套（`useTitle(title.finalTitle)`）也可独立使用。

## 守卫的导入与产物

守卫**不进根入口**：根 barrel 若重导出守卫，其 d.ts 会带上 vue-router 类型引用，未安装 vue-router 的消费方在类型解析阶段即报错——与 optional peerDependency 的意图冲突。守卫走子路径导入：

```ts
import { createIframeGuard } from '@mono/hooks-vue/iframe/vue-router'
import { createKeepAliveGuard } from '@mono/hooks-vue/keep-alive/vue-router'
```

产物校验（check:pkg）因此分两遍 attw：根入口按默认档位全量严格校验（含 node10 / node16 CJS）；子路径入口用 `--profile esm-only`——node10 解析不读 exports 字段、无法支持任何子路径导出，属预期失败而非缺陷。

## 路由守卫的 Meta 约定

两个守卫（keep-alive / iframe）通过 `RouteMetaKeys`（`keepKey` / `noKeepKey`）读取路由 Meta，键名可配置以避开业务既有字段。**匹配目标是路由 `name`，不是组件 name**——KeepAlive `include` 用组件 name，但 Meta 白名单/黑名单匹配路由 name，两者别混淆。

`meta.iframe` 语义：iframe 地址，或 `true` 表示地址来自 `query.iframe`（两者皆缺则不打开）；`query.iframe` / `query.title` 可覆盖 meta 值。

> **限制**：KeepAlive 守卫通过 `to.matched` 读取组件 name，懒加载路由组件在首次导航时可能尚未解析完成，本次导航不会加入缓存（后续导航正常）。

库内不发布 `declare module 'vue-router'` 全局扩展（避免污染业务路由类型），需要类型提示时在业务侧自行 augment：

```ts
declare module 'vue-router' {
  interface RouteMeta {
    iframe?: string | boolean
  }
}

export {}
```

## 从 crab-net-frontend 迁入的适配记录

以下为源实现（`crab-net-frontend/packages/composables`）与本包的 API 差异，源项目迁移时按此对照：

| 源 API | 本包 API | 变化 |
| --- | --- | --- |
| `createXxx()` 返回 `useXxx()` | 直接返回管理器对象 | 去掉无状态的双层闭包，与 `createTitleManager` 统一 |
| `changeFlag` / `resetFlag` | `toggle` / `reset` | 命名向社区惯例靠拢 |
| `uniqueList.clean()` | `clear()` | 同上 |
| `createStatus(flag: Ref)` / `afterChange(value, flag)` | `createStatus(flag: boolean)` / `afterChange(value)` | core 化后回调收纯值 |
| flag 的 `init` Ref 单向同步 | 双向同步（回写源） | 源是单一事实来源；重复同值不算变化、不触发 afterChange |
| `list` 深层响应式数组 | core 冻结快照 + 引用稳定 | 适配层以 `computed` 投影；空串 / null / undefined 不再被过滤——唯一性管理只管唯一性，值语义归调用方 |
| `createKeepAliveGuard(handlers, metaKeys)` | 同名同形 | 保留「配置 → 安装」两段式，守卫确有配置期与安装期 |
| `KeepAliveMetaKeys`（iframe 内重复定义） | `RouteMetaKeys`（`_route-meta` 模块） | 去重，名称不再绑定 keep-alive |
| `isTargetRouteMatch`（两处重复） | `matchRouteTarget`（`_route-meta` 模块导出） | 去重；`config` 从 `any` 收紧为 `unknown` |
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
