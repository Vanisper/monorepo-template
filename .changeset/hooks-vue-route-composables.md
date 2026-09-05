---
'@mono/hooks-vue': minor
---

**Breaking**

- `createTitleManager` 拆为 `usePageTitle`（纯状态）与 `useDocumentTitle`（同步到 `document.title` 的副作用）。原用法需改为：`const title = usePageTitle(options)` + `useDocumentTitle(title.finalTitle)`
- `usePageTitle` 的 `enableDynamicTitle` 选项改名为 `dynamic`，返回值上的 `dynamicTitleEnabled` / `setDynamicTitleEnabled` 合并为可写 ref `dynamic`

**Added**

- `useToggle`：布尔开关，传 boolean 返回 `[ref, toggle]`，传 Ref 只返回 `toggle`（直接操作调用方的 ref）
- `useUniqueList`：唯一列表，只读引用稳定快照 + `has / add / remove / clear`
- `useIframeTabs`：iframe 多页签（LRU、不可变更新）
- `useMobileAdaptation`：pc / mobile 模式判定，基于 `matchMedia`
- `useMediaQuery` / `useEventListener` / `tryOnScopeDispose`：浏览器与 scope 基础设施；触碰 DOM 的 hook 均支持注入 `window` / `document` / `navigator`
- 子路径 `@mono/hooks-vue/vue-router`：`useKeepAliveGuard(router, options)`、`useIframeGuard(router, options)`，返回卸载函数；`vue-router` 为 optional peerDependency，根入口不引用其类型
