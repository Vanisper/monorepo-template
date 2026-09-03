import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { computed, readonly, ref, shallowRef, toValue, watchEffect } from 'vue'

/**
 * 标题值
 *
 * 静态字符串、Ref 或 getter；ref/getter 形式在依赖变化时自动更新（求值发生在响应式作用域内）
 */
export type Title = MaybeRefOrGetter<string>

/** createTitleManager 的配置项 */
export interface TitleManagerOptions {
  /** 应用主标题（如 "XX 管理系统"） */
  appTitle: Title
  /** 各层标题都为空时的兜底标题，默认为空串 */
  fallbackTitle?: Title
  /** 是否启用动态标题（route/override 合成），默认 true */
  enableDynamicTitle?: boolean
}

/**
 * createTitleManager 返回的管理器实例
 *
 * 各级只读状态 + 合成结果 + setter
 */
export interface TitleManager {
  /** 应用主标题（只读，已求值） */
  appTitle: Readonly<Ref<string>>
  /** 路由/页面标题（只读，已求值） */
  routeTitle: Readonly<Ref<string>>
  /**
   * 覆盖/自定义标题（只读，已求值）
   *
   * 如 iframe 内部传出的标题
   */
  overrideTitle: Readonly<Ref<string>>
  /** 是否启用动态标题（只读） */
  dynamicTitleEnabled: Readonly<Ref<boolean>>
  /**
   * 最终显示标题
   *
   * override > route > app 三级合成，各层都为空时用兜底标题
   */
  finalTitle: ComputedRef<string>
  /**
   * 设置路由标题（通常在 router.afterEach 调用）
   *
   * 切换路由会顺带清空覆盖标题
   */
  setRouteTitle: (title: Title) => void
  /**
   * 设置覆盖标题（iframe 或特殊业务场景）
   *
   * 传空串显式清空
   */
  setOverrideTitle: (title: Title) => void
  /**
   * 设置应用主标题（替换标题源）
   *
   * 传静态值：切断此前的 ref/getter 响应式绑定；传 ref/getter：建立新的响应式绑定
   */
  setAppTitle: (title: Title) => void
  /** 开关动态标题 */
  setDynamicTitleEnabled: (enable: boolean) => void
}

/**
 * 创建页面标题管理器（纯状态工厂，无环境副作用）
 *
 * - 模块级单例使用：在应用入口创建一次，router.afterEach 中调用 setRouteTitle
 * - 同步到 `document.title` 由 useTitle 挂载：状态与副作用分离，管理器可在任意环境创建与测试
 */
export function createTitleManager(options: TitleManagerOptions): TitleManager {
  // Title 统一归一成 getter 再存状态：合成层只面对一种形态，直接在响应式作用域内调用即可
  // （不能直接 shallowRef<Title>：MaybeRefOrGetter 的联合类型会被 vue 的条件类型展开出只读 ComputedRef 分支，setter 无法赋值）
  const asGetter = (title: Title): () => string => () => toValue(title)

  const fallback = asGetter(options.fallbackTitle ?? '')
  const appTitleState = shallowRef(asGetter(options.appTitle))
  const routeTitleState = shallowRef(asGetter(''))
  const overrideTitleState = shallowRef(asGetter(''))
  const dynamicTitleEnabled = ref<boolean>(options.enableDynamicTitle ?? true)

  const appTitle = computed(() => appTitleState.value())
  const routeTitle = computed(() => routeTitleState.value())
  const overrideTitle = computed(() => overrideTitleState.value())
  const finalTitle = computed(() => {
    // 兜底放在合成层而非各层 setter：只在所有层都为空时出场，单层传空串仍是合法的「清空」
    const app = appTitle.value || fallback()
    if (!dynamicTitleEnabled.value) {
      return app
    }
    const current = overrideTitle.value || routeTitle.value
    return current ? `${current} - ${app}` : app
  })

  return {
    appTitle,
    routeTitle,
    overrideTitle,
    dynamicTitleEnabled: readonly(dynamicTitleEnabled),
    finalTitle,
    setRouteTitle(title) {
      routeTitleState.value = asGetter(title)
      // 路由切换时清空覆盖标题，避免上个页面的覆盖残留
      overrideTitleState.value = asGetter('')
    },
    setOverrideTitle(title) {
      overrideTitleState.value = asGetter(title)
    },
    setAppTitle(title) {
      appTitleState.value = asGetter(title)
    },
    setDynamicTitleEnabled(enable) {
      dynamicTitleEnabled.value = enable
    },
  }
}

/**
 * 将标题源同步到 `document.title` 的挂载 hook
 *
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
