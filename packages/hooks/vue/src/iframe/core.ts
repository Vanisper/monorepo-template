/**
 * # iframe 多页签的纯函数内核
 *
 * @description
 * - 无框架依赖、无内部状态：每个变更函数都是 `(state, input) => state` 形态的 reducer
 * - 契约：**无实际变化时返回入参 `state` 的同一引用**；有变化时返回新状态，
 *   且未变化的子结构（如 `tabs` 数组）保持原引用——上层按引用比较即可跳过更新
 * - 状态不可变：页签对象不就地修改，旧快照引用天然对应旧状态
 */

/** 页签记录 */
export interface IframeTab {
  /** 路由 fullPath，作为记录唯一键 */
  path: string
  /** iframe 加载地址 */
  src: string
  /** 页签标题；框架响应式形态由适配层归一为 getter 后存入 */
  title?: string | (() => string)
  /** 是否处于打开状态（LRU 淘汰或显式关闭后为 false，记录仍保留） */
  isOpen: boolean
  /** 是否加载中（重新打开时复位为 true） */
  isLoading: boolean
}

/** 打开页签的输入 */
export type IframeOpenInput = Pick<IframeTab, 'path' | 'src' | 'title'>

/** 多页签状态 */
export interface IframeTabsState {
  /** 全部记录，按首次打开顺序 */
  tabs: readonly IframeTab[]
  /** 打开中页签的最近访问序（新 → 旧），只存 path */
  recent: readonly string[]
}

/** 单个或一批 path */
export type PathInput = string | readonly string[]

function freeze<T>(items: readonly T[]): readonly T[] {
  return Object.freeze(items)
}

function toPaths(input: PathInput): ReadonlySet<string> {
  return new Set(typeof input === 'string' ? [input] : input)
}

/** 空状态：各实例共享同一引用 */
export const EMPTY_IFRAME_STATE: IframeTabsState = Object.freeze({
  tabs: freeze<IframeTab>([]),
  recent: freeze<string>([]),
})

/**
 * ## 打开页签
 *
 * - 已存在的记录复用（不更新 src / title），仅确保打开并置顶最近访问序
 * - 按最近访问序做 LRU：打开数超出 `maxOpen` 时关闭最旧的页签并复位其加载态
 * - 仅最近访问序变化时 `tabs` 保持原引用
 */
export function openIframeTab(state: IframeTabsState, input: IframeOpenInput, maxOpen: number): IframeTabsState {
  const existing = state.tabs.find(tab => tab.path === input.path)
  const opened: IframeTab = existing
    ? (existing.isOpen ? existing : { ...existing, isOpen: true, isLoading: true })
    : { ...input, isOpen: true, isLoading: true }

  let tabs = existing
    ? (opened === existing ? state.tabs : freeze(state.tabs.map(tab => (tab === existing ? opened : tab))))
    : freeze([...state.tabs, opened])

  const recent = [input.path, ...state.recent.filter(path => path !== input.path)]

  // LRU：超出 maxOpen 的旧页签关闭，并从最近访问序移除
  const evicted = new Set(recent.slice(Math.max(0, maxOpen)))
  if (evicted.size) {
    tabs = freeze(tabs.map(tab => (evicted.has(tab.path) ? { ...tab, isOpen: false, isLoading: true } : tab)))
  }
  const nextRecent = evicted.size ? recent.filter(path => !evicted.has(path)) : recent

  if (tabs === state.tabs && isSameOrder(nextRecent, state.recent)) {
    return state
  }
  return { tabs, recent: freeze(nextRecent) }
}

/**
 * ## 关闭页签
 *
 * 支持批量；记录保留、状态置为关闭并从最近访问序移除。未命中任何打开中的页签时返回原状态
 */
export function closeIframeTabs(state: IframeTabsState, input: PathInput): IframeTabsState {
  const targets = toPaths(input)
  let changed = false
  const tabs = state.tabs.map((tab) => {
    if (!targets.has(tab.path) || !tab.isOpen) {
      return tab
    }
    changed = true
    return { ...tab, isOpen: false, isLoading: true }
  })
  if (!changed) {
    return state
  }
  return { tabs: freeze(tabs), recent: freeze(state.recent.filter(path => !targets.has(path))) }
}

/**
 * ## 移除页签记录
 *
 * 支持批量；记录整体删除（含已关闭的）。未命中时返回原状态
 */
export function removeIframeTabs(state: IframeTabsState, input: PathInput): IframeTabsState {
  const targets = toPaths(input)
  const tabs = state.tabs.filter(tab => !targets.has(tab.path))
  if (tabs.length === state.tabs.length) {
    return state
  }
  return { tabs: freeze(tabs), recent: freeze(state.recent.filter(path => !targets.has(path))) }
}

/**
 * ## 标记加载完成
 *
 * 记录不存在或已非加载中时返回原状态
 */
export function markIframeLoaded(state: IframeTabsState, path: string): IframeTabsState {
  const existing = state.tabs.find(tab => tab.path === path)
  if (!existing?.isLoading) {
    return state
  }
  return {
    tabs: freeze(state.tabs.map(tab => (tab === existing ? { ...tab, isLoading: false } : tab))),
    recent: state.recent,
  }
}

function isSameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index])
}
