import type { ComputedRef, MaybeRef, MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import { computed, shallowRef, toRef, toValue } from 'vue'
import { composeTitle } from './core'

/**
 * # 标题源
 *
 * 静态字符串、Ref 或 getter；Ref / getter 形式在依赖变化时自动反映到合成结果
 */
export type TitleSource = MaybeRefOrGetter<string>

/**
 * # usePageTitle 的配置项
 */
export interface PageTitleOptions {
  /**
   * ## 应用主标题
   *
   * 如 "XX 管理系统"，默认空串
   */
  appTitle?: TitleSource
  /**
   * ## 兜底标题
   *
   * 应用主标题为空时使用，默认空串
   */
  fallbackTitle?: TitleSource
  /**
   * ## 是否启用动态标题
   *
   * route / override 参与合成，默认 true。传 Ref 时直接借用该 ref
   */
  dynamic?: MaybeRef<boolean>
  /**
   * ## 分隔符
   *
   * 默认 ` - `
   */
  separator?: string
}

/**
 * # usePageTitle 返回的页面标题
 */
export interface PageTitle {
  /**
   * ## 应用主标题（已求值）
   */
  appTitle: ComputedRef<string>
  /**
   * ## 路由 / 页面标题（已求值）
   */
  routeTitle: ComputedRef<string>
  /**
   * ## 覆盖标题（已求值）
   */
  overrideTitle: ComputedRef<string>
  /**
   * ## 最终标题
   *
   * override > route > app 三级合成，同步到 `document.title` 请配合 useDocumentTitle
   */
  finalTitle: ComputedRef<string>
  /**
   * ## 是否启用动态标题（可写）
   */
  dynamic: Ref<boolean>
  /**
   * ## 替换应用主标题源
   */
  setAppTitle: (source: TitleSource) => void
  /**
   * ## 设置路由标题
   *
   * 通常在 `router.afterEach` 调用；切换路由会顺带清空覆盖标题，避免上个页面的覆盖残留
   */
  setRouteTitle: (source: TitleSource) => void
  /**
   * ## 设置覆盖标题
   *
   * iframe 内部传出标题等场景；传空串显式清空
   */
  setOverrideTitle: (source: TitleSource) => void
}

/**
 * # 页面标题合成
 *
 * @description
 * - 每一层持有的是「标题源槽位」而非标题值：源归一为 getter 存入槽位，
 *   Ref / getter 源是活引用、只读消费，源的变化经 computed 求值链天然反映；
 *   setter 替换的是槽位里的源，不回写任何外部 ref
 * - 对外暴露已求值的只读 computed：各层标题是槽位的派生，最终标题是三层的派生
 * - `setRouteTitle` 顺带清空覆盖标题是本模块承载的领域规则，因此走方法而非暴露槽位
 * - 纯状态、无副作用，可在模块级创建一次全局共享
 */
export function usePageTitle(options: PageTitleOptions = {}): PageTitle {
  const appSource = sourceSlot(options.appTitle ?? '')
  const routeSource = sourceSlot('')
  const overrideSource = sourceSlot('')
  const fallbackSource = options.fallbackTitle ?? ''
  const dynamic = toRef(options.dynamic ?? true)

  const appTitle = computed(() => appSource.value())
  const routeTitle = computed(() => routeSource.value())
  const overrideTitle = computed(() => overrideSource.value())
  const finalTitle = computed(() => composeTitle({
    app: appTitle.value,
    route: routeTitle.value,
    override: overrideTitle.value,
    fallback: toValue(fallbackSource),
    dynamic: dynamic.value,
    separator: options.separator,
  }))

  return {
    appTitle,
    routeTitle,
    overrideTitle,
    finalTitle,
    dynamic,
    setAppTitle(source) {
      appSource.value = asGetter(source)
    },
    setRouteTitle(source) {
      routeSource.value = asGetter(source)
      overrideSource.value = asGetter('')
    },
    setOverrideTitle(source) {
      overrideSource.value = asGetter(source)
    },
  }
}

/**
 * 标题源归一为 getter
 *
 * 槽位不能直接存源：`shallowRef(ref)` 会原样返回入参 ref，槽位就成了外部 ref 本身，
 * setter 替换源时会写进外部 ref（回写）。包一层 getter 后槽位始终是本模块自有的
 */
function asGetter(source: TitleSource): () => string {
  return () => toValue(source)
}

function sourceSlot(initial: TitleSource): ShallowRef<() => string> {
  return shallowRef(asGetter(initial))
}
