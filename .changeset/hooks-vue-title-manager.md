---
"@mono/hooks-vue": minor
---

新增 hooks 域 vue 平台包，首个能力：`createTitleManager` 页面标题管理器。

## createTitleManager(options)

应用名 / 路由 / 覆盖三级标题合成，并同步到 `document.title`。

- 合成优先级：override > route > app；可通过动态开关禁用合成（始终显示应用名）
- `Title` 类型为 `MaybeRefOrGetter<string>`，支持静态字符串、Ref、getter；ref/getter 形式在依赖变化时响应式更新（如未读数标题）
- setter 替换标题源：传静态值切断此前的响应式绑定，传 ref/getter 建立新的响应式绑定
- 传空串显式清空对应层；切换路由自动清空覆盖标题，避免上个页面的覆盖残留
- 各层标题都为空时回退到兜底标题
- 内部通过 `watchEffect`（flush: sync）将合成结果同步到 `document.title`

使用方式：应用入口创建一次（模块级单例），在 `router.afterEach` 中调用 `setRouteTitle`。
