import type { ComputedRef } from 'vue'
import type { TitleSource } from '../title/use-page-title'
import type { IframeOpenInput, IframeTab, IframeTabsState, PathInput } from './core'
import { computed, isRef, shallowRef } from 'vue'
import { closeIframeTabs, EMPTY_IFRAME_STATE, markIframeLoaded, openIframeTab, removeIframeTabs } from './core'

/**
 * # open 的入参
 *
 * title 复用包内 TitleSource 形态（string / Ref / getter）
 */
export interface IframeOpenOptions {
  /** 路由 fullPath，作为记录唯一键 */
  path: string
  /** iframe 加载地址 */
  src: string
  /** 页签标题 */
  title?: TitleSource
}

/**
 * # useIframeTabs 的配置项
 */
export interface IframeTabsOptions {
  /**
   * ## 同时保持打开的页签上限
   *
   * 超出按 LRU 关闭最旧页签，默认 5
   */
  maxOpen?: number
}

/**
 * # useIframeTabs 返回的多页签管理
 */
export interface IframeTabs {
  /**
   * ## 全部记录（只读）
   *
   * 含已关闭的；模板中读取标题请用 `toValue(tab.title)`
   */
  tabs: ComputedRef<readonly IframeTab[]>
  /**
   * ## 打开中的记录（只读）
   */
  openedTabs: ComputedRef<readonly IframeTab[]>
  /**
   * ## 打开
   *
   * 已存在则复用记录并置顶访问序；超出上限按 LRU 关闭最旧。有实际变化时返回 true
   */
  open: (options: IframeOpenOptions) => boolean
  /**
   * ## 关闭
   *
   * 支持批量；记录保留。有实际变化时返回 true
   */
  close: (paths: PathInput) => boolean
  /**
   * ## 移除记录
   *
   * 支持批量；记录整体删除。有实际变化时返回 true
   */
  remove: (paths: PathInput) => boolean
  /**
   * ## 标记加载完成
   *
   * iframe onload 时调用。有实际变化时返回 true
   */
  markLoaded: (path: string) => boolean
}

/** Title 的 Ref 形态归一为 getter：core 只存纯 JS 形态 */
function toCoreInput(options: IframeOpenOptions): IframeOpenInput {
  const { title } = options
  return { ...options, title: isRef(title) ? () => title.value : title }
}

/**
 * # iframe 多页签管理
 *
 * @description
 * - 状态存放于一个 `shallowRef<IframeTabsState>`，写入走纯函数 reducer：
 *   reducer 无变化返回同一引用即不触发更新；仅访问序变化时 `tabs` 引用不变，
 *   依赖它的 computed / 模板同样不重算
 * - title 的 Ref / getter 形态是活引用：管理器只读消费，源变化在读取处自然反映
 * - 纯状态、无副作用，可在模块级创建一次全局共享
 */
export function useIframeTabs(options: IframeTabsOptions = {}): IframeTabs {
  const { maxOpen = 5 } = options
  const state = shallowRef<IframeTabsState>(EMPTY_IFRAME_STATE)

  function commit(next: IframeTabsState): boolean {
    const changed = next !== state.value
    state.value = next
    return changed
  }

  const tabs = computed(() => state.value.tabs)

  return {
    tabs,
    openedTabs: computed(() => tabs.value.filter(tab => tab.isOpen)),
    open: input => commit(openIframeTab(state.value, toCoreInput(input), maxOpen)),
    close: paths => commit(closeIframeTabs(state.value, paths)),
    remove: paths => commit(removeIframeTabs(state.value, paths)),
    markLoaded: path => commit(markIframeLoaded(state.value, path)),
  }
}
