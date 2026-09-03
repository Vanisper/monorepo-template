---
'@mono/hooks-vue': minor
---

新增五个 hooks 模块：`flag`（布尔开关）、`unique-list`（唯一列表）、`keep-alive`（多页签路由缓存列表与守卫）、`iframe`（iframe 多页签管理与守卫）、`mobile-adaptation`（pc/mobile 模式判定），以及守卫共享的 `route-meta` 工具模块。

路由守卫对 vue-router 仅为类型依赖，已声明为 optional peerDependency——不使用守卫的场景无需安装 vue-router。
