import type { RouteLocationNormalized, RouteLocationNormalizedLoaded } from 'vue-router'
import type { RouteHandler, RouteMetaKeys, RouterGuardSetup } from '../route-meta'
import { nextTick } from 'vue'
import { matchRouteTarget } from '../route-meta'

/** createKeepAliveGuard 的处理函数集合 */
export interface KeepAliveHandlers {
  /** 向缓存列表写入组件名（通常即 KeepAliveManager.add） */
  add: (name: string | string[]) => void
  /** 从缓存列表移除组件名（通常即 KeepAliveManager.remove） */
  remove: (name: string | string[]) => void
  /** 守卫总开关；显式返回 false 时跳过本次处理 */
  enable: RouteHandler
  /** 自定义「是否清除该缓存」决策，覆盖默认 meta 规则 */
  shouldClearCache?: RouteHandler
}

/**
 * 创建 KeepAlive 路由守卫
 *
 * 默认清除规则（以 to 路由 meta 为准）：
 * - `meta[noKeepKey]` 命中 from 路由名 → 清除
 * - `meta[keepKey]` 为 boolean → 以其取值为准
 * - 其余情况 → from 路由名未命中白名单即清除
 */
export function createKeepAliveGuard(handlers: KeepAliveHandlers, metaKeys: RouteMetaKeys): RouterGuardSetup {
  return (router) => {
    router.afterEach(async (to, from) => {
      if (to.fullPath === from.fullPath) {
        return
      }

      if (handlers.enable(to, from, metaKeys) === false) {
        return
      }

      const componentName = getRouteComponentName(to)
      if (!componentName) {
        console.warn('[hooks-vue] 路由组件缺少 name，KeepAlive 缓存将失效（script setup 组件请用 defineOptions 命名）')
        return
      }

      const shouldClear = handlers.shouldClearCache
        ? handlers.shouldClearCache(to, from, metaKeys) ?? shouldClearByMeta(to, from, metaKeys)
        : shouldClearByMeta(to, from, metaKeys)

      if (shouldClear) {
        handlers.remove(componentName)
        // 等旧实例卸载完成再加入，避免 KeepAlive 直接复用旧实例
        await nextTick()
      }
      handlers.add(componentName)
    })
  }
}

/** 读取路由记录对应组件的 name；script setup 组件需 defineOptions 显式命名 */
function getRouteComponentName(to: RouteLocationNormalized): string | undefined {
  const component = to.matched.at(-1)?.components?.default
  if (component && 'name' in component && typeof component.name === 'string') {
    return component.name
  }
  return undefined
}

/**
 * 默认清除规则
 *
 * 以 to 路由 meta 判断（匹配目标为路由 name）：是否需要先移除缓存再重新加入（触发重新挂载）
 */
function shouldClearByMeta(
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  metaKeys: RouteMetaKeys,
): boolean {
  const noKeepMeta = to.meta[metaKeys.noKeepKey]
  const keepMeta = to.meta[metaKeys.keepKey]

  // 黑名单优先：to 显式声明「从 from 过来不缓存」
  if (matchRouteTarget(from.name, noKeepMeta)) {
    return true
  }
  // 白名单为 boolean 时直接以其取值为准
  if (typeof keepMeta === 'boolean') {
    return !keepMeta
  }
  // from 不在 to 的白名单里则清除
  return !matchRouteTarget(from.name, keepMeta)
}
