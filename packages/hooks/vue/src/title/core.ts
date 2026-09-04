/**
 * # 标题源形态（core 层）
 *
 * 无框架依赖；框架响应式形态由适配层归一为 getter 后存入
 */
export type CoreTitle = string | (() => string)

/**
 * # createTitleCore 的配置项
 */
export interface TitleCoreOptions {
  /**
   * ## 应用主标题
   */
  appTitle: CoreTitle
  /**
   * ## 兜底标题
   *
   * 各层标题都为空时使用，默认空串
   */
  fallbackTitle?: CoreTitle
  /**
   * ## 是否启用动态标题
   *
   * route/override 参与合成，默认 true
   */
  enableDynamicTitle?: boolean
}

/**
 * # 标题管理器内核实例
 *
 * 无框架依赖
 */
export interface TitleCore {
  // #region ---------[ getter ]---------
  /**
   * ## 应用主标题
   *
   * 求值结果
   */
  getAppTitle: () => string
  /**
   * ## 路由/页面标题
   *
   * 求值结果
   */
  getRouteTitle: () => string
  /**
   * ## 覆盖/自定义标题
   *
   * 求值结果；如 iframe 内部传出的标题
   */
  getOverrideTitle: () => string
  /**
   * ## 是否启用动态标题
   */
  getDynamicTitleEnabled: () => boolean
  /**
   * ## 最终显示标题
   *
   * override > route > app 三级合成，各层都为空时用兜底标题
   */
  getFinalTitle: () => string
  // #endregion

  // #region ---------[ action ]---------
  /**
   * ## 设置路由标题
   *
   * - 通常在 router.afterEach 调用
   * - 切换路由会顺带清空覆盖标题，避免上个页面的覆盖残留
   * - 有实际变化（源替换或覆盖被清）时返回 true
   */
  setRouteTitle: (title: CoreTitle) => boolean
  /**
   * ## 设置覆盖标题
   *
   * 传空串显式清空；有实际变化时返回 true
   */
  setOverrideTitle: (title: CoreTitle) => boolean
  /**
   * ## 设置应用主标题（替换标题源）
   *
   * 传静态值即切断绑定，所有权转回管理器；有实际变化时返回 true
   */
  setAppTitle: (title: CoreTitle) => boolean
  /**
   * ## 开关动态标题
   *
   * 有实际变化时返回 true
   */
  setDynamicTitleEnabled: (enable: boolean) => boolean
  // #endregion
}

function toValue(title: CoreTitle): string {
  return typeof title === 'function' ? title() : title
}

/**
 * # 创建标题管理器内核
 *
 * 纯状态，不依赖响应式
 *
 * @description
 * - 各层标题源归一为 `string | getter` 存储：string 基本类型按值比较，
 *   getter 按引用比较——「源替换」即变化
 * - 兜底放在合成层而非各层 setter：只在所有层都为空时出场，
 *   单层传空串仍是合法的「清空」
 * - getter 每次求值都读最新值：上层活引用（如响应式 ref 的包装）
 *   的变化天然反映到合成结果，无需通知机制参与
 */
export function createTitleCore(options: TitleCoreOptions): TitleCore {
  const fallback: CoreTitle = options.fallbackTitle ?? ''
  let appTitle: CoreTitle = options.appTitle
  let routeTitle: CoreTitle = ''
  let overrideTitle: CoreTitle = ''
  let dynamicTitleEnabled = options.enableDynamicTitle ?? true

  function compose(): string {
    const app = toValue(appTitle) || toValue(fallback)
    if (!dynamicTitleEnabled) {
      return app
    }
    const current = toValue(overrideTitle) || toValue(routeTitle)
    return current ? `${current} - ${app}` : app
  }

  return {
    getAppTitle: () => toValue(appTitle),
    getRouteTitle: () => toValue(routeTitle),
    getOverrideTitle: () => toValue(overrideTitle),
    getDynamicTitleEnabled: () => dynamicTitleEnabled,
    getFinalTitle: compose,

    setRouteTitle(title) {
      const changed = title !== routeTitle || overrideTitle !== ''
      routeTitle = title
      overrideTitle = ''
      return changed
    },
    setOverrideTitle(title) {
      const changed = title !== overrideTitle
      overrideTitle = title
      return changed
    },
    setAppTitle(title) {
      const changed = title !== appTitle
      appTitle = title
      return changed
    },
    setDynamicTitleEnabled(enable) {
      const changed = enable !== dynamicTitleEnabled
      dynamicTitleEnabled = enable
      return changed
    },
  }
}
