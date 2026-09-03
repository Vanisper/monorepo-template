import type { ComputedRef, Ref } from 'vue'
import { computed, readonly, ref, watchEffect } from 'vue'

export type Title = string | (() => string)

export interface TitleManagerOptions {
  /** 应用主标题（如 "XX 管理系统"） */
  appTitle: Title
  /** 各层标题都为空时的兜底标题，默认为空串 */
  fallbackTitle?: Title
  /** 是否启用动态标题（route/override 合成），默认 true */
  enableDynamic?: boolean
}

export interface TitleManager {
  /** 应用主标题（只读） */
  appTitle: Readonly<Ref<string>>
  /** 路由/页面标题（只读） */
  routeTitle: Readonly<Ref<string>>
  /** 覆盖/自定义标题（只读），如 iframe 内部传出的标题 */
  overrideTitle: Readonly<Ref<string>>
  /** 是否启用动态标题（只读） */
  isDynamicEnable: Readonly<Ref<boolean>>
  /** 最终显示标题 */
  finalTitle: ComputedRef<string>
  /** 设置路由标题（通常在 router.afterEach 调用）；切换路由会顺带清空覆盖标题 */
  setRouteTitle: (title: Title) => void
  /** 设置覆盖标题（iframe 或特殊业务场景） */
  setOverrideTitle: (title: Title) => void
  /** 设置应用主标题 */
  setAppTitle: (title: Title) => void
  /** 开关动态标题 */
  setDynamicEnable: (enable: boolean) => void
}

function resolveTitle(title: Title | undefined, fallback: string): string {
  const resolved = typeof title === 'function' ? title() : title
  return resolved || fallback
}

/**
 * 创建页面标题管理器（模块级单例使用：在应用入口创建一次，router.afterEach 中调用 setRouteTitle）。
 * 副作用：创建后立即通过 watchEffect 将 finalTitle 同步到 document.title。
 */
export function createTitleManager(options: TitleManagerOptions): TitleManager {
  const fallback = resolveTitle(options.fallbackTitle, '')

  const appTitle = ref<string>(resolveTitle(options.appTitle, fallback))
  const routeTitle = ref<string>('')
  const overrideTitle = ref<string>('')
  const isDynamicEnable = ref<boolean>(options.enableDynamic ?? true)

  const finalTitle = computed(() => {
    if (!isDynamicEnable.value) {
      return appTitle.value
    }
    const current = overrideTitle.value || routeTitle.value
    return current ? `${current} - ${appTitle.value}` : appTitle.value
  })

  watchEffect(() => {
    document.title = finalTitle.value
  }, { flush: 'sync' })

  return {
    appTitle: readonly(appTitle),
    routeTitle: readonly(routeTitle),
    overrideTitle: readonly(overrideTitle),
    isDynamicEnable: readonly(isDynamicEnable),
    finalTitle,
    setRouteTitle(title) {
      routeTitle.value = resolveTitle(title, fallback)
      // 路由切换时清空覆盖标题，避免上个页面的覆盖残留
      overrideTitle.value = ''
    },
    setOverrideTitle(title) {
      overrideTitle.value = resolveTitle(title, fallback)
    },
    setAppTitle(title) {
      appTitle.value = resolveTitle(title, fallback)
    },
    setDynamicEnable(enable) {
      isDynamicEnable.value = enable
    },
  }
}
