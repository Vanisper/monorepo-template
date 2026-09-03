# hooks 域：@mono/hooks-vue

hooks 域承载跨场景的逻辑复用（与 ui 域分工：hooks 无渲染，ui 有渲染）。域结构与 ui 域一致、按平台分层，当前实现到 `packages/hooks/vue`。

## 模块清单

| 模块 | 职责 | 依赖 |
| --- | --- | --- |
| `title` | 页面标题管理（override > route > app 三级合成） | vue |
| `flag` | 布尔开关（翻转/重置/派生状态/变化回调） | vue |
| `unique-list` | 唯一字符串列表（去重/批量增删/清空） | vue |
| `keep-alive` | KeepAlive 缓存列表 + 路由守卫 | vue、vue-router* |
| `iframe` | iframe 多页签管理（LRU）+ 路由守卫 | vue、vue-router* |
| `mobile-adaptation` | pc/mobile 模式判定（UA 优先 + 宽度阈值兜底） | vue |
| `route-meta` | 上述守卫共享的路由 Meta 键配置与匹配工具 | vue-router* |

带 * 者对 vue-router 仅为 **type-only 依赖**：守卫的运行时代码不 import vue-router（`Router` 实例由调用方传入），因此 vue-router 声明为 **optional peerDependency**——不用守卫的项目无需安装。

## 工厂的两种形态

包内工厂分两类，以是否有生命周期副作用为界：

- **直接返回管理器**：`createTitleManager` / `createFlag` / `createUniqueList` / `createKeepAlive` / `createIframeManager`。无生命周期副作用，可在模块级创建、任意位置使用。
- **返回须在 setup 内调用的函数**：`createMobileAdaptation` 返回 `useMobileAdaptation()`。resize 监听的注册与清理依赖组件生命周期，必须挂到组件实例上。

## 路由守卫的 Meta 约定

两个守卫（keep-alive / iframe）通过 `RouteMetaKeys`（`keepKey` / `noKeepKey`）读取路由 Meta，键名可配置以避开业务既有字段。**匹配目标是路由 `name`，不是组件 name**——KeepAlive `include` 用组件 name，但 Meta 白名单/黑名单匹配路由 name，两者别混淆。

`meta.iframe` 语义：iframe 地址，或 `true` 表示地址来自 `query.iframe`（两者皆缺则不打开）；`query.iframe` / `query.title` 可覆盖 meta 值。

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
| `createKeepAliveGuard(handlers, metaKeys)` | 同名同形 | 保留「配置 → 安装」两段式，守卫确有配置期与安装期 |
| `KeepAliveMetaKeys`（iframe 内重复定义） | `RouteMetaKeys`（route-meta 模块） | 去重，名称不再绑定 keep-alive |
| `isTargetRouteMatch`（两处重复） | `matchRouteTarget`（route-meta 模块导出） | 去重；`config` 从 `any` 收紧为 `unknown` |
| `MOBILE_WIDTH_THRESHOLD = 1024` 魔法值 | `thresholdWidth` 配置项（默认 1024） | 参数化 |
| `mode` 初始恒为 `'pc'` | 按 UA 初始化 | 移动 UA 在 mounted 前状态也正确；UA 判定加 SSR 防御 |

两处行为修复（源实现的 bug）：

1. **mobile-adaptation 的监听清理从不生效**：源实现在 `onMounted` 回调内注册 `onUnmounted`，此时已无活跃组件实例，注册静默失败、resize 监听泄漏。本包将清理注册移到 setup 同步期。
2. **iframe 守卫的 `src` 类型不安全**：源实现 `meta.iframe: true` 且无 `query.iframe` 时会把 boolean 直接当 src 使用，本包改为两者皆缺则跳过打开。

新增模块时的验证路径与「包内扩展」通用流程一致：`pnpm typecheck && pnpm test`（包内）→ 根级 `pnpm lint / spell` → 变更走 changeset（`@mono/hooks-vue` 按语义化级别）。新增包才需要 [add-package.md](./add-package.md) 的完整流程。
