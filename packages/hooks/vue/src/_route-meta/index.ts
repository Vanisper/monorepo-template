// 守卫共享的基础设施（非 hook 模块）：前缀 _ 让它在 src 下排在各 hook 之前，
// 与「工具而非业务 hook」的定位一致；类型与工具仍从根 barrel 导出（KeepAliveManager.metaKeys 等公共 API 依赖）
import type { RouteLocationNormalized, RouteLocationNormalizedLoaded, Router } from 'vue-router'

/**
 * KeepAlive 系路由 Meta 键配置
 *
 * 路由表通过 `meta[keepKey]` / `meta[noKeepKey]` 声明缓存策略，
 * 键名可配置以避免与业务既有 meta 字段冲突
 */
export interface RouteMetaKeys {
  /** 缓存白名单键，值为 `boolean | string | string[]` */
  keepKey: string
  /** 显式不缓存黑名单键，值为 `string | string[]` */
  noKeepKey: string
}

/**
 * 路由守卫决策函数
 *
 * 返回 `boolean` 为显式决策；返回 `undefined` 表示交回默认规则
 */
export type RouteHandler = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  metaKeys: RouteMetaKeys,
) => boolean | undefined

/** 二段式守卫的第二段：在路由实例上完成安装 */
export type RouterGuardSetup = (router: Router) => void

/**
 * 判断路由名是否命中配置目标
 *
 * `config` 为 string 时全等比较、为数组时包含比较，其余类型一律不命中
 */
export function matchRouteTarget(targetName: RouteLocationNormalized['name'], config: unknown): boolean {
  if (!config || !targetName || typeof targetName !== 'string') {
    return false
  }
  if (typeof config === 'string') {
    return targetName === config
  }
  if (Array.isArray(config)) {
    return config.includes(targetName)
  }
  return false
}
