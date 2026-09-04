---
'@mono/hooks-vue': minor
---

新增五个 hooks 模块：`flag`（布尔开关）、`unique-list`（唯一列表）、`keep-alive`（多页签路由缓存列表与守卫）、`iframe`（iframe 多页签管理与守卫）、`mobile-adaptation`（pc/mobile 模式判定），以及守卫共享的 `common/route-meta` 工具。

各模块拆为「core / 适配层」两层：core 为无框架依赖的纯逻辑（快照引用稳定、变更方法返回是否实际变化），vue 适配层以 `computed` 投影——未变更的重复调用不触发响应式更新。`title` 同步纳入分层：合成逻辑进 `createTitleCore`，Ref/getter 源由适配层归一为活 getter，响应式绑定经求值链天然保真（对外 API 不变）。

`flag`：`createStatus` / `afterChange` 回调收纯值（`boolean`）；`init` 只收 boolean 种子（数据所有权在管理器内部，不对入参引用做响应反馈，受控场景由调用方显式 watch 表达）；重复置为同值不算变化、不触发 `afterChange`。

`unique-list`：不再过滤空串、`null`、`undefined`——唯一性管理只管唯一性，值语义归调用方。

`mobile-adaptation`：`mode` 为判定函数的纯投影（宽度 / 启用开关变化即时重算，不存储独立状态）；`setMode(width)` 改名 `setWidth(width)`。

`iframe`：记录改为不可变更新，旧快照引用天然对应旧状态。

路由守卫对 vue-router 仅为类型依赖，已声明为 optional peerDependency——不使用守卫的场景无需安装 vue-router。守卫走子路径导入（`@mono/hooks-vue/keep-alive/vue-router`、`@mono/hooks-vue/iframe/vue-router`），根入口不携带 vue-router 类型。

`createTitleManager` 纯净化：不再内置 `document.title` 副作用，同步改由 `useTitle(source)` 挂载（破坏性变更——原用法需显式调用 `useTitle(title.finalTitle)` 才会同步标题）。
