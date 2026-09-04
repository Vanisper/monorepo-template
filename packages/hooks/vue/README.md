# @mono/hooks-vue

hooks 域的 Vue 场景逻辑复用包：无渲染的状态管理 hooks 与路由守卫，覆盖标题、开关、列表缓存、iframe 多页签、pc/mobile 适配等通用场景。

## 安装

```bash
pnpm add @mono/hooks-vue --filter <target-pkg>
```

依赖约定：

- `vue` 为 peerDependency
- `vue-router` 为 **optional** peerDependency——仅路由守卫需要它（且只是类型依赖），不使用守卫的项目无需安装

## 模块总览

| 模块 | 一句话 | 导入 |
| --- | --- | --- |
| `title` | 页面标题三级合成（override > route > app） | 根入口 |
| `flag` | 布尔开关状态机 | 根入口 |
| `unique-list` | 唯一列表（Set 去重、插入序、快照引用稳定） | 根入口 |
| `keep-alive` | KeepAlive 缓存列表 | 根入口 |
| `iframe` | iframe 多页签管理（LRU） | 根入口 |
| `mobile-adaptation` | pc/mobile 模式判定 | 根入口 |
| `keep-alive` 守卫 | 按路由 meta 维护缓存列表 | `@mono/hooks-vue/keep-alive/vue-router` |
| `iframe` 守卫 | 按 `meta.iframe` 自动开合页签 | `@mono/hooks-vue/iframe/vue-router` |

守卫走子路径导入：根入口的 d.ts 不携带 vue-router 类型，未安装它的消费方类型解析不受影响。

## 使用

### title

```ts
import { createTitleManager, useTitle } from '@mono/hooks-vue'

// 应用入口创建一次；各级标题源支持 string / Ref / getter
const title = createTitleManager({ appTitle: 'XX 管理系统', fallbackTitle: '无标题' })

// router.afterEach 中设置路由标题（会顺带清空覆盖标题）
title.setRouteTitle('用户管理')

// iframe 等特殊场景覆盖标题，传空串显式清空
title.setOverrideTitle('百度一下')

// 将最终标题同步到 document.title：setup 内调用随组件卸载停止，模块级常驻
useTitle(title.finalTitle)
```

### flag

```ts
import { createFlag } from '@mono/hooks-vue'

const dialog = createFlag(false, {
  afterChange: value => console.log('弹层', value ? '打开' : '关闭'),
})

dialog.toggle() // 翻转
dialog.toggle(true) // 置为指定值
dialog.reset() // 重置为创建时的初始状态
dialog.status.value // 派生状态（createStatus 可自定义派生）

// init 传 Ref 时源是单一事实来源：toggle/reset 回写源，源变化同步镜像
const source = ref(false)
const mirror = createFlag(source)
```

### unique-list

```ts
import { createUniqueList } from '@mono/hooks-vue'

const list = createUniqueList(['a'])

list.add(['b', 'a']) // 去重，支持批量
list.remove('a')
list.clear()
list.list.value // 只读快照：内容不变时保持同一引用，模板/计算属性可安心依赖
```

### keep-alive（多页签路由缓存）

```ts
import { createKeepAlive } from '@mono/hooks-vue'
import { createKeepAliveGuard } from '@mono/hooks-vue/keep-alive/vue-router'

const metaKeys = { keepKey: 'keep', noKeepKey: 'noKeep' }
const keepAlive = createKeepAlive(metaKeys)

// 绑定到 <KeepAlive :include="keepAlive.list.value" />
createKeepAliveGuard(
  { add: keepAlive.add, remove: keepAlive.remove, enable: () => true },
  metaKeys,
)(router)
```

路由表声明缓存策略（匹配目标为**路由 name**，KeepAlive `include` 用的才是组件 name）：

```ts
const routes = [
  { path: '/a', name: 'a', component: PageA, meta: { keep: true } }, // 缓存
  { path: '/b', name: 'b', component: PageB, meta: { keep: false } }, // 每次重新挂载
  { path: '/d', name: 'd', component: PageD, meta: { noKeep: ['b'] } }, // 从 b 过来不缓存
]
```

> 懒加载路由组件首次导航时可能尚未解析完成，本次导航不会加入缓存（后续导航正常）；script setup 组件需 `defineOptions({ name })` 显式命名。

### iframe（多页签 iframe 管理）

```ts
import { createIframeManager } from '@mono/hooks-vue'
import { createIframeGuard } from '@mono/hooks-vue/iframe/vue-router'

const metaKeys = { keepKey: 'keep', noKeepKey: 'noKeep' }
const iframe = createIframeManager(5) // 最多同时保留 5 个打开页签，超出按 LRU 关闭最旧

iframe.open({ path: '/report', src: 'https://example.com', title: () => `报表（${count.value}）` })
iframe.markLoaded('/report') // iframe onload 时调用
iframe.close(['/report']) // 支持批量

createIframeGuard(
  { open: iframe.open, close: iframe.close },
  metaKeys,
)(router)
```

路由侧声明（`query.iframe` / `query.title` 可覆盖 meta 值）：

```ts
const routes = [
  { path: '/report', name: 'report', component: Empty, meta: { iframe: 'https://example.com' } },
]
```

需要 `meta.iframe` 的类型提示时，在业务侧自行 augment：

```ts
declare module 'vue-router' {
  interface RouteMeta {
    iframe?: string | boolean
  }
}

export {}
```

### mobile-adaptation

```ts
import { createMobileAdaptation } from '@mono/hooks-vue'

// 工厂返回 useMobileAdaptation()，须在 setup 内调用（resize 监听挂组件生命周期）
const useMobileAdaptation = createMobileAdaptation({ thresholdWidth: 768 })

// 组件内
const { mode, enable } = useMobileAdaptation()
// mode.value: 'pc' | 'mobile'——移动 UA 恒 mobile，桌面按视口宽度判定
// enable / setWidth 输入变化时 mode 即时重算
```

## 架构：core / 适配层

各模块拆为两层：

- **`core.ts` 纯逻辑内核**：无框架依赖的纯状态 / 纯函数，变更方法返回是否实际变化，列表类提供快照引用稳定语义（内容不变 `getList()` 返回同一冻结引用）。未来 react / uniapp 侧适配可复用同一 core。
- **Vue 适配层**：`shallowRef` 版本号 + `computed` 读 core 快照——未变更的重复调用零响应式开销。
- **响应式源的归一**：Ref 在适配层归一为 `() => ref.value` 活引用存入 core，computed 求值链穿过它读到 ref——源的响应式绑定天然保真，无需通知机制。

数据所有权（各模块在注释中显式声明）：

1. **构造参数拷贝**：`initialList` 等仅作构造输入，外部改动不穿透
2. **源为事实来源**：flag 传 Ref 时 toggle/reset 回写源；title / iframe 的 title 传 Ref 时为活引用
3. **派生投影**：mobile-adaptation 的 `mode` 等只存输入、派生值恒为函数投影

## 相关文档

- [迁移与扩展记录](../../docs/guide/hooks-vue.md)：从 crab-net-frontend 迁入的 API 对照、包内扩展流程
