import type {
  LocationQuery,
  RouteLocationNormalized,
  RouteLocationNormalizedLoaded,
  RouteMeta,
} from 'vue-router'
import type { RouteHandler, RouteMetaKeys, RouterGuardSetup } from '../_route-meta'
import type { IframeOpenOptions } from './index'
import { matchRouteTarget } from '../_route-meta'

/** createIframeGuard 的处理函数集合 */
export interface IframeGuardHandlers {
  /** 打开 iframe（通常即 IframeManager.open） */
  open: (options: IframeOpenOptions) => void
  /** 关闭 iframe（通常即 IframeManager.close） */
  close: (path: string) => void
  /** 自定义 from 路由的关闭决策，覆盖默认 keepAlive meta 规则 */
  shouldClose?: RouteHandler
}

/**
 * 创建 iframe 多页签路由守卫
 *
 * - 进入带 `meta.iframe` 的路由 → 打开对应页签，`query.iframe` / `query.title` 可覆盖 meta 值
 * - 离开带 `meta.iframe` 的路由 → 默认关闭；`meta[keepKey]` 命中 to 路由名时保持打开
 */
export function createIframeGuard(handlers: IframeGuardHandlers, metaKeys: RouteMetaKeys): RouterGuardSetup {
  return (router) => {
    router.afterEach((to, from) => {
      if (to.fullPath === from.fullPath) {
        return
      }

      const toIframeMeta = readIframeMeta(to.meta)
      if (toIframeMeta !== undefined) {
        // meta.iframe 为 true 时地址必须来自 query.iframe，两者都缺则无法打开
        const src = readQueryString(to.query, 'iframe') ?? (typeof toIframeMeta === 'string' ? toIframeMeta : undefined)
        if (src) {
          handlers.open({
            path: to.fullPath,
            src,
            title: readQueryString(to.query, 'title') ?? readMetaTitle(to.meta),
          })
        }
      }

      if (readIframeMeta(from.meta) !== undefined) {
        const defaultShouldClose = !shouldKeepIframe(to, from, metaKeys)
        const shouldClose = handlers.shouldClose
          ? handlers.shouldClose(to, from, metaKeys) ?? defaultShouldClose
          : defaultShouldClose
        if (shouldClose) {
          handlers.close(from.fullPath)
        }
      }
    })
  }
}

/**
 * 读取 `meta.iframe`：iframe 地址，或 true 表示地址来自 query.iframe
 *
 * 库内不发布 `declare module 'vue-router'` 全局扩展以避免污染业务路由类型，
 * 需要类型提示时在业务侧 augment（示例见 docs/guide/hooks-vue.md）
 */
function readIframeMeta(meta: RouteMeta): string | boolean | undefined {
  const value = meta.iframe
  return typeof value === 'string' || typeof value === 'boolean' ? value : undefined
}

/** 从 query 取第一个 string 值 */
function readQueryString(query: LocationQuery, key: string): string | undefined {
  const value = query[key]
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' ? first : undefined
}

/** 读取 `meta.title`（RouteMeta 无内置 title 声明，业务侧 augment 后此处同样兼容） */
function readMetaTitle(meta: RouteMeta): string | undefined {
  const value = meta.title
  return typeof value === 'string' ? value : undefined
}

/**
 * 默认保持规则（以 from 路由 meta 为准，匹配目标为路由 name）
 *
 * - `meta[noKeepKey]` 命中 to 路由名 → 强制不保持
 * - `meta[keepKey]` 存在 → 命中 to 路由名才保持
 * - 其余 → 不保持
 */
function shouldKeepIframe(
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  metaKeys: RouteMetaKeys,
): boolean {
  const noKeepMeta = from.meta[metaKeys.noKeepKey]
  const keepMeta = from.meta[metaKeys.keepKey]

  if (matchRouteTarget(to.name, noKeepMeta)) {
    return false
  }
  if (keepMeta) {
    return matchRouteTarget(to.name, keepMeta)
  }
  return false
}
