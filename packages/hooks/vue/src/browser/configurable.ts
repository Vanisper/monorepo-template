/**
 * # 可注入的宿主全局对象
 *
 * @description
 * - 触碰 DOM 的 hook 一律通过 options 接收宿主对象，默认取运行环境的全局值
 * - 注入点服务于三类场景：SSR（传 `null` 显式跳过）、测试（传假对象）、
 *   非浏览器宿主（iframe 内操控父窗口、Electron 等）
 * - 默认值在模块加载时求一次：宿主对象在会话内视为不变量
 */

/** 默认 window：无浏览器环境时为 undefined */
export const defaultWindow: Window | undefined = typeof window !== 'undefined' ? window : undefined

/** 默认 document：无浏览器环境时为 undefined */
export const defaultDocument: Document | undefined = typeof document !== 'undefined' ? document : undefined

/** 默认 navigator：无浏览器环境时为 undefined */
export const defaultNavigator: Navigator | undefined = typeof navigator !== 'undefined' ? navigator : undefined

/** 接收 window 注入的 options 片段 */
export interface ConfigurableWindow {
  /**
   * ## 宿主 window
   *
   * 默认取全局 window；传 `null` 表示无宿主（SSR）
   */
  window?: Window | null
}

/** 接收 document 注入的 options 片段 */
export interface ConfigurableDocument {
  /**
   * ## 宿主 document
   *
   * 默认取全局 document；传 `null` 表示无宿主（SSR）
   */
  document?: Document | null
}

/** 接收 navigator 注入的 options 片段 */
export interface ConfigurableNavigator {
  /**
   * ## 宿主 navigator
   *
   * 默认取全局 navigator；传 `null` 表示无宿主（SSR）
   */
  navigator?: Navigator | null
}
