# hooks-vue：设计方法论与迁移记录

包的使用文档见 [packages/hooks/vue/README.md](../../packages/hooks/vue/README.md)。本文记录仓库级信息：hook 接口形态背后的方法论、从 VueUse 借鉴了什么、各模块的实现决策、从 crab-net-frontend 迁入的适配对照与包内扩展流程。

## 方法论：三条原则

### 1. 状态只有一个存放处（SSOT）

hook 面对入参只有两种姿态，没有第三种：

- **借用**：入参是 ref → 直接在它上面读写。`shallowRef(existingRef)` 与 `toRef(existingRef)` 都原样返回入参，这不是巧合，是 Vue 在 API 层面对这条原则的表态
- **拥有**：入参是值 → hook 创建 ref，并**必须把它返还**。否则状态被锁在闭包里，调用方只能经由 hook 的方法间接触碰，模板 `v-model` 一类的直接绑定就被挡住了

`useToggle` 的重载（传 ref 只返回 `toggle`，传值返回 `[ref, toggle]`）就是这两种姿态在类型上的直接表达。

反例（本包早期版本踩过）：flag 接受 `init: Ref`，内部再建一个 ref 镜像它、watch 入参同步到镜像、`toggle` 又回写入参。同一个数据有两个存放处、两条同步路径，「回写后源被改回原值时 watcher 净零变化跳过、镜像与源脱节」这类 bug 是结构性的，不是实现技巧能修的。规则改成「不镜像」后问题消失。

推论——hook 的方法不是状态的唯一入口：`toggle()` 和 `visible.value = !visible.value` 写的是同一个 ref，所以不需要任何同步机制；变化回调由调用方在 ref 上 `watch`，无论谁写都触发，hook 不必提供 `afterChange` 这类钩子。

### 2. 存放处就是值时暴露可写 ref；写入有不变量时暴露只读派生 + 方法

判断标准是**写入是否携带规则**：

- `useToggle` 的开关、`useMobileAdaptation` 的 `enabled`、`usePageTitle` 的 `dynamic`：写什么就是什么，暴露可写 ref（借用形态下就是调用方自己的 ref）
- `useUniqueList` 的列表（唯一性）、`useIframeTabs` 的页签（LRU、不可变更新）、`usePageTitle` 的 route / override（切路由清覆盖）：写入必须过规则，暴露只读派生 + 方法

「派生」在这里是字面意义：`mode`、`finalTitle`、`openedTabs` 都是 `computed` 对输入的纯投影，不存储可偏离的独立状态。

### 3. 副作用归属于创建它时所在的 effect scope

- 组件 setup 内调用 → 随组件卸载自动清理；模块级调用 → 与应用同寿；需要手动控制 → 自建 `effectScope()` 包裹再 `scope.stop()`
- 实现上统一走 `tryOnScopeDispose`（有 scope 才注册），而非 `onUnmounted`：后者在 `effectScope` 里不生效，且在 setup 外调用会告警
- 同时返回卸载函数（`useEventListener`、`useDocumentTitle`、两个守卫）作为模块级场景的逃生口
- 触碰 DOM 的 hook 一律可注入宿主（`window` / `document` / `navigator`，默认取全局）：SSR 传 `null`、测试传假对象、非浏览器宿主传自己的对象。这是「提供回调让用户写 DOM」问题的正确解法——回调有默认值，注入只在需要时出场

副作用与状态分离也是这条原则的推论：`usePageTitle` 是纯状态（可模块级创建全局共享），`useDocumentTitle` 是副作用（谁挂载谁负责清理），两者用 `finalTitle` 这个只读 computed 对接。

## core / 适配层：core 是纯函数，不是有状态对象

本包保留「core 无框架依赖」的分层，但 core 的形态是**纯函数（reducer / 决策函数）**，状态住在 Vue 响应式里：

```ts
// core：(state, input) => state，无变化返回同一引用
const next = addUnique(list.value, items)
// 适配层：shallowRef 赋同一引用不会触发更新——引用稳定、零开销空操作、变化检测三件事一次解决
list.value = next
```

为什么不是 TanStack 那种持有状态的 core 对象：TanStack 的领域（缓存、异步、GC、定时器）需要一个长寿命 store，所以 core 自带 subscribe。UI 状态 hook 里，`shallowRef` 本身就是 store + subscribe；再用非响应式对象持有状态、用 trigger 计数器桥接到 computed，是重新发明一遍响应式系统。纯 reducer 反而更「headless」——React 侧直接 `useReducer` 即可复用，无需 subscribe。

哪些逻辑值得进 core：有独立于框架的复杂度、值得裸测的——iframe 的 LRU 与不可变更新、唯一列表的去重与引用稳定、标题合成、模式判定、路由 meta 匹配。布尔翻转这种一行逻辑不值得，`useToggle` 没有 core。

## 从 VueUse 借鉴了什么

读 `useToggle`、`useTitle`、`tryOnScopeDispose`、`useMediaQuery` 源码得到的、已落进本包的东西：

- `toRef(source)` 作为「值 / ref / getter」归一的标准手段（Vue 3.3+ 内置），本包 `enabled` / `dynamic` 用它实现借用与拥有的统一
- `tryOnScopeDispose` 与 `ConfigurableWindow / ConfigurableDocument` 两个基础设施模式，原样吸收为 `shared/` 与 `browser/`
- `useTitle` 的 `restoreOnUnmount`：副作用不只要停止，还要**恢复**现场，本包 `useDocumentTitle` 的 `restoreOnDispose` 同义
- `useMediaQuery` 用 `matchMedia` 而非 `resize`：只在跨越阈值时触发、无布局读取，`useMobileAdaptation` 据此重写

没有照搬的：VueUse 的 `useToggle` 用 `arguments.length` 区分「传了 undefined」与「没传」，本包用 `typeof value === 'boolean'`——`@click="toggle"` 会把事件对象传进来，这在 VueUse 是文档里的已知坑，类型判断直接消掉它。

## 各模块实现决策

### 路由守卫：单一子路径 + `beforeResolve` / `afterEach` 两段

- 守卫对 vue-router 只是类型依赖，声明为 optional peerDependency。守卫与 `RouteMetaKeys` 等共享类型全部收进 `@mono/hooks-vue/vue-router` 一个子路径；根入口的 d.ts 只引用 `vue`。之前把共享类型放在根入口导出时，dts 打包会让根入口间接 `import from 'vue-router'`，与 optional 的意图冲突（`check:pkg` 对子路径用 `--profile esm-only`：node10 解析不读 exports 字段，预期失败）
- 守卫签名统一为 `useXxxGuard(router, options)`，一段式安装、返回卸载函数。原「配置 → 安装」两段式没有真实的分离需求
- **KeepAlive 守卫的清除必须发生在 `beforeResolve`**：在 from 页面仍为当前页时从 `include` 移除并 `await nextTick()`，KeepAlive 的 include 监听（post flush）此时执行，缓存的旧实例与当前页类型不同，会被真正 `unmount`。若等到 `afterEach` 再移除，KeepAlive 会把同类型的新旧 vnode 视为同一个（`isSameVNodeType`），只重置标记不卸载，旧实例成为孤儿——`onUnmounted` 永不触发，其 watcher / 定时器随之泄漏。此问题在源实现与本包早期版本中都存在，由真实 `<KeepAlive>` 的端到端测试（`use-keep-alive-guard.dom.test.ts`，happy-dom 环境）暴露并锁定
- 懒加载路由组件在 `beforeResolve` / `afterEach` 时已由 vue-router 解析并写回 `record.components`，守卫能读到组件 name；`defineAsyncComponent` 包装的组件不在此列（测试 `懒加载路由组件在 afterEach 时已解析` 锁定）
- 缓存键是组件 name 而 meta 匹配的是路由 name，这是 Vue KeepAlive `include` 的固有限制；同一组件多路由（详情页不同参数）需业务侧配合 `:key`

### 标题：源槽位归一为 getter

`usePageTitle` 每一层持有的是「标题源槽位」（`shallowRef<() => string>`）。源归一为 getter 而不是直接存 `TitleSource`，原因有二：`shallowRef(ref)` 原样返回入参，槽位会变成外部 ref 本身，`setAppTitle` 就成了回写；`MaybeRefOrGetter` 的联合类型经 `shallowRef` 的条件类型展开后含只读 `ComputedRef` 分支，setter 无法赋值。包一层 getter 后槽位永远是模块自有的、类型是简单的。

### iframe：状态整体不可变

`IframeTabsState = { tabs, recent }` 作为一个整体放在 `shallowRef` 里。reducer 无变化返回同一 state；仅访问序变化（重复打开已打开页签）时 `tabs` 子结构保持原引用，`computed(() => state.value.tabs)` 求出同一数组，依赖它的模板不重算。

### mobile-adaptation：去掉工厂双层

原 `createMobileAdaptation()` 返回 `useMobileAdaptation()`、后者须在 setup 内调用，是为了把 resize 监听挂到组件生命周期上。改用 `matchMedia` 后监听极轻，直接由原则 3 接管：`useMobileAdaptation()` 一层调用，在哪个 scope 创建就归哪个 scope。视口是全局状态，模块级创建一次共享即可。

## 从 crab-net-frontend 迁入的适配记录

源实现在 `crab-net-frontend/packages/composables`，本包 API 对照：

| 源 API | 本包 API | 变化 |
| --- | --- | --- |
| `createFlag(init, { createStatus, afterChange })` 返回管理器 | `useToggle(init)` 返回 `[ref, toggle]` 或 `toggle` | 状态即可写 ref；派生与回调由调用方 `computed` / `watch`，不再内置 |
| `createUniqueList()` 返回 `{ list, add, remove, clean }` | `useUniqueList()` 返回 `{ list, has, add, remove, clear }` | `clean → clear`；方法返回是否实际变化；不再过滤空串 / null / undefined |
| `createKeepAlive(metaKeys)` | 直接用 `useUniqueList<string>()` | 管理器本身不消费 `metaKeys`，去掉这层壳 |
| `createKeepAliveGuard(handlers, metaKeys)(router)` | `useKeepAliveGuard(router, { include, metaKeys?, filter?, shouldClearCache? })` | 一段式；`enable` 必填 → `filter` 可选；`metaKeys` 有默认值；返回卸载函数；清除移至 `beforeResolve` |
| `createIframeManager(maxCache)` | `useIframeTabs({ maxOpen })` | 新增 `remove`；`closeLoading → markLoaded`；记录不可变更新 |
| `createIframeGuard(handlers, metaKeys)(router)` | `useIframeGuard(router, { tabs, metaKeys?, iframeKey?, titleKey?, filter?, shouldClose? })` | 一段式；meta 键名可配置；`meta.iframe: true` 且无 query 时跳过（源实现会把 boolean 当 src） |
| `createMobileAdaptation(options)` 返回 `useMobileAdaptation` | `useMobileAdaptation(options)` | 去掉双层；`resize` + `clientWidth` → `matchMedia`；`enable` 可写 Ref 走 `toRef` 借用 / 拥有；`setWidth` 随之取消 |
| `createTitleManager` 内置 `document.title` 同步 | `usePageTitle` + `useDocumentTitle` | 状态与副作用分离；`enableDynamicTitle → dynamic` 可写 ref；主标题与兜底都为空时不带分隔符 |

源实现的行为修复：

1. mobile-adaptation 在 `onMounted` 回调内注册 `onUnmounted`——此时无活跃实例，清理从不生效、监听泄漏
2. KeepAlive 守卫在 `afterEach` 中先移除再加入——旧实例成为孤儿（见上文）
3. iframe 守卫 `meta.iframe: true` 且无 `query.iframe` 时把 boolean 当 src
4. iframe 记录就地变更——旧快照被篡改

## 包内扩展流程

新增 hook 时先按三条原则决定形态：入参是借用还是拥有、暴露 ref 还是派生 + 方法、副作用如何归属与注入。有独立复杂度的逻辑进 `core.ts` 并裸测。验证路径：`pnpm typecheck && pnpm test`（包内）→ 根级 `pnpm lint / spell` → 变更走 changeset（`@mono/hooks-vue` 按语义化级别）。新增包才需要 [add-package.md](./add-package.md) 的完整流程。
