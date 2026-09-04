import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import type { CoreTitle } from './core'
import { computed, shallowRef, toValue, watchEffect } from 'vue'
import { createTitleCore } from './core'

/**
 * # 标题值
 *
 * 静态字符串、Ref 或 getter；ref/getter 形式在依赖变化时自动更新
 * （求值发生在响应式作用域内）
 */
export type Title = MaybeRefOrGetter<string>

/**
 * # createTitleManager 的配置项
 */
export interface TitleManagerOptions {
  /**
   * ## 应用主标题
   *
   * 如 "XX 管理系统"
   */
  appTitle: Title
  /**
   * ## 兜底标题
   *
   * 各层标题都为空时使用，默认为空串
   */
  fallbackTitle?: Title
  /**
   * ## 是否启用动态标题
   *
   * route/override 参与合成，默认 true
   */
  enableDynamicTitle?: boolean
}

/**
 * # createTitleManager 返回的管理器实例
 *
 * 各级只读状态 + 合成结果 + setter
 */
export interface TitleManager {
  /**
   * ## 应用主标题（只读，已求值）
   *
   * `ComputedRef` 在类型层面就表达了「不可赋值」
   */
  appTitle: ComputedRef<string>
  /**
   * ## 路由/页面标题（只读，已求值）
   */
  routeTitle: ComputedRef<string>
  /**
   * ## 覆盖/自定义标题（只读，已求值）
   *
   * 如 iframe 内部传出的标题
   */
  overrideTitle: ComputedRef<string>
  /**
   * ## 是否启用动态标题（只读）
   */
  dynamicTitleEnabled: ComputedRef<boolean>
  /**
   * ## 最终显示标题
   *
   * override > route > app 三级合成，各层都为空时用兜底标题
   */
  finalTitle: ComputedRef<string>
  /**
   * ## 设置路由标题
   *
   * 通常在 router.afterEach 调用；切换路由会顺带清空覆盖标题
   */
  setRouteTitle: (title: Title) => void
  /**
   * ## 设置覆盖标题
   *
   * iframe 或特殊业务场景；传空串显式清空
   */
  setOverrideTitle: (title: Title) => void
  /**
   * ## 设置应用主标题（替换标题源）
   *
   * 传静态值：切断此前的 ref/getter 响应式绑定；传 ref/getter：建立新的响应式绑定
   */
  setAppTitle: (title: Title) => void
  /**
   * ## 开关动态标题
   */
  setDynamicTitleEnabled: (enable: boolean) => void
}

/**
 * # Title 的 Ref 形态归一为 getter
 *
 * core 只存纯 JS 数据形态
 */
function toCoreTitle(title: Title): CoreTitle {
  if (typeof title === 'string' || typeof title === 'function') {
    return title
  }
  return () => (title as Ref<string>).value
}

/**
 * # 创建页面标题管理器
 *
 * Vue 适配层，模块级也可调用（纯状态工厂，无环境副作用）
 *
 * @description
 * - 投影为 computed：求值链穿过 core 存的 getter，ref/getter 源的变化
 *   天然触发重算，无需手动通知；源替换 / 开关变更则通过 trigger 生效
 * - 同步到 `document.title` 由 useTitle 挂载：状态与副作用分离
 */
export function createTitleManager(options: TitleManagerOptions): TitleManager {
  const core = createTitleCore({
    appTitle: toCoreTitle(options.appTitle),
    fallbackTitle: options.fallbackTitle !== undefined ? toCoreTitle(options.fallbackTitle) : undefined,
    enableDynamicTitle: options.enableDynamicTitle,
  })
  const trigger = shallowRef(0)

  function project<T>(read: () => T): ComputedRef<T> {
    return computed<T>(() => {
      // eslint-disable-next-line ts/no-unused-expressions
      trigger.value // 建立响应式依赖
      return read()
    })
  }

  function commit(mutate: () => boolean): void {
    if (mutate()) {
      trigger.value++
    }
  }

  return {
    appTitle: project(() => core.getAppTitle()),
    routeTitle: project(() => core.getRouteTitle()),
    overrideTitle: project(() => core.getOverrideTitle()),
    dynamicTitleEnabled: project(() => core.getDynamicTitleEnabled()),
    finalTitle: project(() => core.getFinalTitle()),
    setRouteTitle: title => commit(() => core.setRouteTitle(toCoreTitle(title))),
    setOverrideTitle: title => commit(() => core.setOverrideTitle(toCoreTitle(title))),
    setAppTitle: title => commit(() => core.setAppTitle(toCoreTitle(title))),
    setDynamicTitleEnabled: enable => commit(() => core.setDynamicTitleEnabled(enable)),
  }
}

/**
 * # 将标题源同步到 `document.title` 的挂载 hook
 *
 * @description
 * - 与 createTitleManager 配套：`useTitle(title.finalTitle)`，也可独立同步任意标题源
 * - 可在组件 setup 内调用（effect 随组件卸载自动停止），也可在模块级调用（effect 常驻应用生命周期）
 * - SSR 无 `document` 时为空操作
 */
export function useTitle(source: Title): void {
  if (typeof document === 'undefined') {
    return
  }
  watchEffect(() => {
    document.title = toValue(source)
  }, { flush: 'sync' })
}
