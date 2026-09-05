import type { ComputedRef } from 'vue'
import type { ConfigurableWindow } from './configurable'
import { computed, shallowRef } from 'vue'
import { defaultWindow } from './configurable'
import { useEventListener } from './use-event-listener'

/**
 * # 媒体查询是否命中（响应式）
 *
 * @description
 * - 基于 `matchMedia`：只在跨越阈值时收到 change 事件，无布局读取、无 resize 高频回调
 * - 不支持 `matchMedia`（SSR / 注入 null）时恒为 false
 * - 监听随所在 effect scope 销毁；模块级调用与应用同寿
 */
export function useMediaQuery(query: string, options: ConfigurableWindow = {}): ComputedRef<boolean> {
  const { window = defaultWindow } = options
  const mediaQuery = window && typeof window.matchMedia === 'function' ? window.matchMedia(query) : undefined

  const matches = shallowRef(mediaQuery?.matches ?? false)
  useEventListener<MediaQueryListEvent>(mediaQuery, 'change', (event) => {
    matches.value = event.matches
  }, { passive: true })

  return computed(() => matches.value)
}
