import type { LocationQuery, RouteLocationNormalized, RouteLocationNormalizedLoaded, RouteMeta, Router } from 'vue-router'
import type { IframeOpenOptions } from '../iframe/use-iframe-tabs'
import type { RouteFilter, RouteHandler, RouteMetaKeys } from './route-meta'
import { tryOnScopeDispose } from '../shared/try-on-scope-dispose'
import { matchRouteTarget, resolveRouteMetaKeys } from './route-meta'

/**
 * # iframe 页签的写入口
 *
 * `useIframeTabs()` 的返回值即满足此形态
 */
export interface IframeTabsTarget {
  open: (options: IframeOpenOptions) => unknown
  close: (path: string) => unknown
}

/**
 * # useIframeGuard 的配置项
 */
export interface IframeGuardOptions {
  /**
   * ## 页签管理
   */
  tabs: IframeTabsTarget
  /**
   * ## 保持策略的路由 Meta 键
   *
   * 默认 `keepAlive` / `noKeepAlive`，与 KeepAlive 守卫共用同一套声明
   */
  metaKeys?: Partial<RouteMetaKeys>
  /**
   * ## iframe 地址的 Meta 键
   *
   * 默认 `iframe`；值为地址字符串，或 true 表示地址来自 `query[iframeKey]`
   */
  iframeKey?: string
  /**
   * ## 页签标题的 Meta 键
   *
   * 默认 `title`；`query[titleKey]` 可覆盖
   */
  titleKey?: string
  /**
   * ## 过滤
   *
   * 返回 false 跳过本次导航
   */
  filter?: RouteFilter
  /**
   * ## 自定义 from 路由的关闭决策
   *
   * 显式返回 boolean 时覆盖默认 meta 规则
   */
  shouldClose?: RouteHandler
}

/**
 * # 安装 iframe 多页签路由守卫
 *
 * @description
 * - 进入带 `meta[iframeKey]` 的路由 → 打开对应页签，`query[iframeKey]` / `query[titleKey]` 可覆盖 meta 值；
 *   `meta[iframeKey]` 为 true 且 query 缺地址时跳过打开
 * - 离开带 `meta[iframeKey]` 的路由 → 默认关闭；`meta[keepKey]` 命中 to 路由名时保持打开
 * - 库内不发布 `declare module 'vue-router'` 全局扩展以免污染业务路由类型，需要类型提示时在业务侧 augment
 * - 返回卸载函数；处于 effect scope 内时随 scope 销毁自动卸载
 */
export function useIframeGuard(router: Router, options: IframeGuardOptions): () => void {
  const { tabs, iframeKey = 'iframe', titleKey = 'title', filter, shouldClose } = options
  const metaKeys = resolveRouteMetaKeys(options.metaKeys)

  const stop = router.afterEach((to, from) => {
    if (to.fullPath === from.fullPath || filter?.(to, from) === false) {
      return
    }

    const toIframe = readIframeMeta(to.meta, iframeKey)
    if (toIframe !== undefined) {
      const src = readQueryString(to.query, iframeKey) ?? (typeof toIframe === 'string' ? toIframe : undefined)
      if (src) {
        tabs.open({
          path: to.fullPath,
          src,
          title: readQueryString(to.query, titleKey) ?? readMetaString(to.meta, titleKey),
        })
      }
    }

    if (readIframeMeta(from.meta, iframeKey) !== undefined) {
      const close = shouldClose?.(to, from, metaKeys) ?? !shouldKeepByMeta(to, from, metaKeys)
      if (close) {
        tabs.close(from.fullPath)
      }
    }
  })

  tryOnScopeDispose(stop)
  return stop
}

/** 读取 iframe meta：地址字符串，或 true 表示地址来自 query */
function readIframeMeta(meta: RouteMeta, key: string): string | boolean | undefined {
  const value = meta[key]
  return typeof value === 'string' || typeof value === 'boolean' ? value : undefined
}

/** 读取 meta 中的字符串值 */
function readMetaString(meta: RouteMeta, key: string): string | undefined {
  const value = meta[key]
  return typeof value === 'string' ? value : undefined
}

/** 从 query 取第一个 string 值 */
function readQueryString(query: LocationQuery, key: string): string | undefined {
  const value = query[key]
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first : undefined
}

/**
 * 默认保持规则（以 from 路由 meta 为准，匹配目标为路由 name）：
 * `meta[noKeepKey]` 命中 to → 不保持；`meta[keepKey]` 存在 → 命中 to 才保持；其余 → 不保持
 */
function shouldKeepByMeta(
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  metaKeys: RouteMetaKeys,
): boolean {
  const noKeepMeta = from.meta[metaKeys.noKeepKey]
  const keepMeta = from.meta[metaKeys.keepKey]

  if (matchRouteTarget(to.name, noKeepMeta)) {
    return false
  }
  return keepMeta ? matchRouteTarget(to.name, keepMeta) : false
}
