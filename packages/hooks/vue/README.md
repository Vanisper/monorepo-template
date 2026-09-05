# @mono/hooks-vue

hooks 域的 Vue 逻辑复用包：无渲染的状态 hooks、浏览器副作用 hooks 与路由守卫，覆盖标题、开关、列表、iframe 多页签、pc/mobile 适配等后台系统常见场景。

## 安装

```bash
pnpm add @mono/hooks-vue --filter <target-pkg>
```

依赖约定：

- `vue` 为 peerDependency
- `vue-router` 为 **optional** peerDependency——仅路由守卫需要它（且只是类型依赖）；守卫走 `@mono/hooks-vue/vue-router` 子路径，根入口不引用 vue-router 类型，不使用守卫的项目无需安装

## 模块总览

| 模块 | 一句话 | 导入 |
| --- | --- | --- |
| `useToggle` | 布尔开关：拥有 / 借用两种形态 | 根入口 |
| `useUniqueList` | 唯一列表（去重、插入序、引用稳定） | 根入口 |
| `usePageTitle` / `useDocumentTitle` | 标题三级合成 + 同步到 `document.title` | 根入口 |
| `useIframeTabs` | iframe 多页签管理（LRU） | 根入口 |
| `useMobileAdaptation` | pc / mobile 模式判定 | 根入口 |
| `useMediaQuery` / `useEventListener` | 浏览器基础设施 | 根入口 |
| `useKeepAliveGuard` | 按路由 meta 维护 `<KeepAlive :include>` 列表 | `@mono/hooks-vue/vue-router` |
| `useIframeGuard` | 按路由 meta 自动开合 iframe 页签 | `@mono/hooks-vue/vue-router` |

## 三条约定

读任何一个 hook 之前先知道这三条，接口形态都由它们推出：

1. **状态只有一个存放处。** 传 ref 进来是「借用」——hook 直接在你的 ref 上操作，不复制、不 watch；传值进来是「拥有」——hook 创建 ref 并返还给你。任何情况下 hook 都不会为同一个数据维护第二份拷贝。
2. **状态是值本身时暴露可写 ref，写入有不变量时暴露只读派生 + 方法。** `useToggle` 的开关、`enabled`、`dynamic` 都是可写 ref，可直接 `v-model`；唯一列表、iframe 页签、标题合成的写入各有规则（去重 / LRU / 切路由清覆盖），走方法。
3. **副作用归属于创建它的 effect scope。** 在组件 setup 内调用随组件卸载自动清理；模块级调用与应用同寿；要手动控制就自建 `effectScope()`。触碰 DOM 的 hook 一律可注入宿主（`window` / `document` / `navigator`），SSR 传 `null`、测试传假对象。

## 使用

### useToggle

```ts
import { useToggle } from '@mono/hooks-vue'

// 拥有：hook 创建状态并返还，可直接 v-model
const [visible, toggle] = useToggle(false)
toggle() // 取反
toggle(true) // 置为指定值
visible.value = false // 与 toggle 写的是同一个 ref

// 借用：状态本来就在你手里，只拿一个翻转函数
const collapsed = ref(false)
const toggleCollapsed = useToggle(collapsed)
```

非 boolean 入参一律视为「未传」，`@click="toggle"` 收到的事件对象不会被误当成值。需要变化回调时在 ref 上 `watch`。

### useUniqueList

```ts
import { useUniqueList } from '@mono/hooks-vue'

const { list, has, add, remove, clear } = useUniqueList(['a'])

add(['b', 'a']) // 去重，支持批量；有实际变化时返回 true
remove('a')
list.value // 只读快照：内容不变时保持同一引用，模板 / computed 可安心依赖
```

### usePageTitle + useDocumentTitle

```ts
import { useDocumentTitle, usePageTitle } from '@mono/hooks-vue'

// 应用入口创建一次；各级标题源支持 string / Ref / getter
const title = usePageTitle({ appTitle: 'XX 管理系统', fallbackTitle: '无标题' })

// router.afterEach 中设置路由标题（会顺带清空覆盖标题）
title.setRouteTitle('用户管理')
// iframe 等特殊场景覆盖标题，传空串显式清空
title.setOverrideTitle('百度一下')
// 动态标题开关是可写 ref
title.dynamic.value = false

// 同步到 document.title 是独立的副作用 hook：组件内调用随卸载停止并恢复原标题，模块级常驻
useDocumentTitle(title.finalTitle)
```

`useDocumentTitle` 也可独立同步任意标题源；`document` 可注入。

### useIframeTabs

```ts
import { useIframeTabs } from '@mono/hooks-vue'

const iframe = useIframeTabs({ maxOpen: 5 }) // 同时最多 5 个打开页签，超出按 LRU 关闭最旧

iframe.open({ path: '/report', src: 'https://example.com', title: () => `报表（${count.value}）` })
iframe.markLoaded('/report') // iframe onload 时调用
iframe.close(['/report']) // 关闭（记录保留），支持批量
iframe.remove('/report') // 移除记录

iframe.openedTabs.value // 打开中的页签；标题在模板中用 toValue(tab.title) 读取
```

### useMobileAdaptation

```ts
import { useMobileAdaptation } from '@mono/hooks-vue'

// 模块级创建一次全局共享即可（视口是全局状态）；基于 matchMedia，只在跨越阈值时触发
const { mode, isMobile, enabled } = useMobileAdaptation({ thresholdWidth: 768 })
// mode.value: 'pc' | 'mobile'——移动 UA 恒 mobile，桌面按视口宽度判定
enabled.value = false // 关闭判定恒为 pc
```

### 路由守卫

守卫从子路径导入，签名统一为 `useXxxGuard(router, options)`，返回卸载函数。

```ts
import { useIframeTabs, useUniqueList } from '@mono/hooks-vue'
import { useIframeGuard, useKeepAliveGuard } from '@mono/hooks-vue/vue-router'

// KeepAlive：守卫向列表写组件名，列表绑定到 <KeepAlive :include="include.list.value">
const include = useUniqueList<string>()
useKeepAliveGuard(router, { include })

// iframe：守卫按 meta.iframe 开合页签
const iframe = useIframeTabs()
useIframeGuard(router, { tabs: iframe })
```

路由表声明（meta 键名可通过 `metaKeys` / `iframeKey` / `titleKey` 配置，默认如下）：

```ts
const routes = [
  { path: '/a', name: 'a', component: PageA, meta: { keepAlive: true } }, // 缓存
  { path: '/b', name: 'b', component: PageB, meta: { keepAlive: false } }, // 每次重新挂载
  { path: '/d', name: 'd', component: PageD, meta: { noKeepAlive: ['b'] } }, // 从 b 过来不缓存
  { path: '/report', name: 'report', component: Empty, meta: { iframe: 'https://example.com', title: '报表' } },
]
```

KeepAlive 守卫的匹配目标是**路由 name**，写进 `include` 的是**组件 name**：script setup 组件需 `defineOptions({ name })` 显式命名。iframe 守卫的 `query.iframe` / `query.title` 可覆盖 meta 值；需要 `meta.iframe` 的类型提示时在业务侧 augment `RouteMeta`。

## 相关文档

- [设计方法论与迁移记录](../../docs/guide/hooks-vue.md)：三条约定的推导、从 VueUse 借鉴了什么、各模块实现决策、从 crab-net-frontend 迁入的 API 对照
