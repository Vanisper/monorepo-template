---
'@mono/hooks-vue': minor
---

新增五个 hooks 模块：`flag`（布尔开关）、`unique-list`（唯一列表）、`keep-alive`（多页签路由缓存列表与守卫）、`iframe`（iframe 多页签管理与守卫）、`mobile-adaptation`（pc/mobile 模式判定），以及守卫共享的 `_route-meta` 工具模块（下划线前缀标明工具定位，类型仍从根入口导出）。

路由守卫对 vue-router 仅为类型依赖，已声明为 optional peerDependency——不使用守卫的场景无需安装 vue-router。守卫走子路径导入（`@mono/hooks-vue/keep-alive/vue-router`、`@mono/hooks-vue/iframe/vue-router`），根入口不携带 vue-router 类型。

`createTitleManager` 纯净化：不再内置 `document.title` 副作用，同步改由 `useTitle(source)` 挂载（破坏性变更——原用法需显式调用 `useTitle(title.finalTitle)` 才会同步标题）。
