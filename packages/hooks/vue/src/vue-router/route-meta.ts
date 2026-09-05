import type { RouteLocationNormalized, RouteLocationNormalizedLoaded } from 'vue-router'

/**
 * # 缓存策略的路由 Meta 键
 *
 * 路由表通过 `meta[keepKey]` / `meta[noKeepKey]` 声明缓存策略；键名可配置以避开业务既有字段
 */
export interface RouteMetaKeys {
  /** 缓存白名单键，值为 `boolean | string | string[]` */
  keepKey: string
  /** 显式不缓存黑名单键，值为 `string | string[]` */
  noKeepKey: string
}

/** 默认 Meta 键 */
export const DEFAULT_ROUTE_META_KEYS: RouteMetaKeys = Object.freeze({
  keepKey: 'keepAlive',
  noKeepKey: 'noKeepAlive',
})

/** 补全用户传入的部分键配置 */
export function resolveRouteMetaKeys(keys?: Partial<RouteMetaKeys>): RouteMetaKeys {
  return { ...DEFAULT_ROUTE_META_KEYS, ...keys }
}

/**
 * # 路由守卫决策函数
 *
 * 返回 boolean 为显式决策；返回 undefined 表示交回默认规则
 */
export type RouteHandler = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  metaKeys: RouteMetaKeys,
) => boolean | undefined

/**
 * # 路由守卫过滤函数
 *
 * 返回 false 时守卫跳过本次导航
 */
export type RouteFilter = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
) => boolean

/**
 * ## 判断路由名是否命中配置目标
 *
 * `config` 为 string 时全等比较、为数组时包含比较，其余类型一律不命中
 */
export function matchRouteTarget(targetName: RouteLocationNormalized['name'], config: unknown): boolean {
  if (!config || typeof targetName !== 'string') {
    return false
  }
  if (typeof config === 'string') {
    return targetName === config
  }
  return Array.isArray(config) && config.includes(targetName)
}
