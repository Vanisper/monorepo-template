import type { RouteLocationNormalized, RouteLocationNormalizedLoaded, Router } from 'vue-router'
import type { RouteFilter, RouteHandler, RouteMetaKeys } from './route-meta'
import { nextTick } from 'vue'
import { tryOnScopeDispose } from '../shared/try-on-scope-dispose'
import { matchRouteTarget, resolveRouteMetaKeys } from './route-meta'

/**
 * # KeepAlive 缓存列表的写入口
 *
 * `useUniqueList<string>()` 的返回值即满足此形态
 */
export interface KeepAliveInclude {
  add: (name: string) => unknown
  remove: (name: string) => unknown
}

/**
 * # useKeepAliveGuard 的配置项
 */
export interface KeepAliveGuardOptions {
  /**
   * ## 缓存列表
   *
   * 守卫按路由 meta 向其写入组件名；业务侧将其绑定到 `<KeepAlive :include>`
   */
  include: KeepAliveInclude
  /**
   * ## 路由 Meta 键
   *
   * 默认 `keepAlive` / `noKeepAlive`
   */
  metaKeys?: Partial<RouteMetaKeys>
  /**
   * ## 过滤
   *
   * 返回 false 跳过本次导航（如 iframe 路由不参与缓存）
   */
  filter?: RouteFilter
  /**
   * ## 自定义「是否清除该缓存」决策
   *
   * 显式返回 boolean 时覆盖默认 meta 规则
   */
  shouldClearCache?: RouteHandler
}

/**
 * # 安装 KeepAlive 路由守卫
 *
 * @description
 * - 默认清除规则（以 to 路由 meta 为准，匹配目标为**路由 name**）：
 *   `meta[noKeepKey]` 命中 from → 清除；`meta[keepKey]` 为 boolean → 取其值；
 *   其余 → from 未命中白名单即清除
 * - 清除分两段：`beforeResolve` 中移除并等一轮 tick，让 KeepAlive 在 from 页面仍为当前页时
 *   卸载旧实例；`afterEach` 中再加入。若在导航完成后才移除，KeepAlive 会把同类型的新旧 vnode
 *   视为同一个而跳过卸载，旧实例成为孤儿（onUnmounted 永不触发）
 * - 缓存键是组件 name：script setup 组件需 `defineOptions({ name })` 显式命名
 * - 返回卸载函数；处于 effect scope 内时随 scope 销毁自动卸载
 */
export function useKeepAliveGuard(router: Router, options: KeepAliveGuardOptions): () => void {
  const { include, filter, shouldClearCache } = options
  const metaKeys = resolveRouteMetaKeys(options.metaKeys)

  function skip(to: RouteLocationNormalized, from: RouteLocationNormalizedLoaded): boolean {
    return to.fullPath === from.fullPath || filter?.(to, from) === false
  }

  const stopBeforeResolve = router.beforeResolve(async (to, from) => {
    if (skip(to, from)) {
      return
    }
    const componentName = getRouteComponentName(to)
    if (!componentName) {
      return
    }
    const shouldClear = shouldClearCache?.(to, from, metaKeys) ?? shouldClearByMeta(to, from, metaKeys)
    if (shouldClear) {
      include.remove(componentName)
      // 等 KeepAlive 的 include 监听（post flush）执行完：此时 from 仍是当前页，旧实例被真正卸载
      await nextTick()
    }
  })

  const stopAfterEach = router.afterEach((to, from) => {
    if (skip(to, from)) {
      return
    }
    const componentName = getRouteComponentName(to)
    if (!componentName) {
      console.warn('[hooks-vue] 路由组件缺少 name，KeepAlive 缓存将失效（script setup 组件请用 defineOptions 命名）')
      return
    }
    include.add(componentName)
  })

  const stop = (): void => {
    stopBeforeResolve()
    stopAfterEach()
  }
  tryOnScopeDispose(stop)
  return stop
}

/** 读取路由记录对应组件的 name */
function getRouteComponentName(to: RouteLocationNormalized): string | undefined {
  const component = to.matched.at(-1)?.components?.default
  if (component && 'name' in component && typeof component.name === 'string') {
    return component.name
  }
  return undefined
}

/** 默认清除规则：以 to 路由 meta 判断是否需要先移除缓存再重新加入 */
function shouldClearByMeta(
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  metaKeys: RouteMetaKeys,
): boolean {
  const noKeepMeta = to.meta[metaKeys.noKeepKey]
  const keepMeta = to.meta[metaKeys.keepKey]

  if (matchRouteTarget(from.name, noKeepMeta)) {
    return true
  }
  if (typeof keepMeta === 'boolean') {
    return !keepMeta
  }
  return !matchRouteTarget(from.name, keepMeta)
}
