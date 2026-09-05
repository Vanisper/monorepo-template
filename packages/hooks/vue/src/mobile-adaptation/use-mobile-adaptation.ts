import type { ComputedRef, MaybeRef, Ref } from 'vue'
import type { ConfigurableNavigator, ConfigurableWindow } from '../browser/configurable'
import type { PageMode } from './core'
import { computed, toRef } from 'vue'
import { defaultNavigator, defaultWindow } from '../browser/configurable'
import { useMediaQuery } from '../browser/use-media-query'
import { isMobileUserAgent, narrowerThan, resolveMode } from './core'

/**
 * # useMobileAdaptation 的配置项
 */
export interface MobileAdaptationOptions extends ConfigurableWindow, ConfigurableNavigator {
  /**
   * ## pc / mobile 宽度阈值
   *
   * 视口宽度小于该值判定为 mobile（仅对非移动设备 UA 生效），默认 1024
   */
  thresholdWidth?: number
  /**
   * ## 是否启用判定
   *
   * 关闭后恒为 pc，默认 true。传 Ref 时直接借用该 ref
   */
  enabled?: MaybeRef<boolean>
}

/**
 * # useMobileAdaptation 返回的适配状态
 */
export interface MobileAdaptation {
  /**
   * ## 当前模式（只读派生）
   *
   * UA / 视口 / 启用开关任一输入变化即时重算，不存储独立的模式状态
   */
  mode: ComputedRef<PageMode>
  /**
   * ## 是否 mobile 模式（只读派生）
   */
  isMobile: ComputedRef<boolean>
  /**
   * ## 是否启用判定（可写）
   */
  enabled: Ref<boolean>
}

/**
 * # pc / mobile 模式适配
 *
 * @description
 * - 视口判定基于 `matchMedia`：只在跨越阈值时触发，无 resize 高频回调、无布局读取
 * - UA 在创建时判定一次：会话内 UA 视为不变量
 * - 监听随所在 effect scope 销毁；模块级调用一次全局共享即可（视口是全局状态）
 * - `window` / `navigator` 可注入：SSR 传 `null` 时恒为 pc（除非注入的 UA 为移动设备）
 */
export function useMobileAdaptation(options: MobileAdaptationOptions = {}): MobileAdaptation {
  const { thresholdWidth = 1024, window = defaultWindow, navigator = defaultNavigator } = options
  const enabled = toRef(options.enabled ?? true)

  const isMobileUA = isMobileUserAgent(navigator?.userAgent)
  const isNarrow = useMediaQuery(narrowerThan(thresholdWidth), { window })

  const mode = computed(() => resolveMode({ isMobileUA, isNarrow: isNarrow.value, enabled: enabled.value }))

  return {
    mode,
    isMobile: computed(() => mode.value === 'mobile'),
    enabled,
  }
}
