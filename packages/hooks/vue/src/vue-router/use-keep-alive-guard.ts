import type { RouteLocationNormalized, RouteLocationNormalizedLoaded, Router } from 'vue-router'
import type { RouteFilter, RouteHandler, RouteMetaKeys } from './route-meta'
import { nextTick } from 'vue'
import { tryOnScopeDispose } from '../shared/try-on-scope-dispose'
import { matchRouteTarget, resolveRouteMetaKeys } from './route-meta'

/**
 * # KeepAlive 缓存列表的读写入口
 *
 * `useUniqueList<string>()` 的返回值即满足此形态；自定义容器（如 store）实现这三个方法即可对接
 */
export interface KeepAliveInclude {
  add: (name: string) => unknown
  remove: (name: string) => unknown
  /** 导航失败时守卫据此判断是否需要把移除的名字放回去 */
  has: (name: string) => boolean
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
 * - 两段之间用一条 pending 记录传递本次导航的决策：filter / 组件名 / 是否移除了原本在列表里的名字。
 *   导航未真正进入目标页时按记录把名字放回去——否则「to 与当前页同一组件」的中止导航会让活跃实例
 *   失去缓存资格，列表内容也与实际不符。未进入分两种：afterEach 收到 failure（中止 / 重复 / 取消）
 *   当场恢复；被后续守卫重定向或抛错时原导航不触发 afterEach，记录会残留到下一次 beforeResolve，
 *   在那里视同失败先结算再处理新导航
 * - 并发导航下单槽位记录依赖三个不变量：remove 后、await 前登记（挂起期间记录已在）；
 *   每次 beforeResolve 开头结算残留（此时残留必属于已被挤掉或已死亡的导航——vue-router 只让最新一次成功）；
 *   afterEach 只消费 `to` 归属本次导航的记录，被取消导航的回调不碰后来者的记录。三条成立则任一时刻
 *   最多一条有效记录，无需 Map
 * - 缓存键是组件 name：script setup 组件需 `defineOptions({ name })` 显式命名
 * - 返回卸载函数；处于 effect scope 内时随 scope 销毁自动卸载
 */
export function useKeepAliveGuard(router: Router, options: KeepAliveGuardOptions): () => void {
  const { include, filter, shouldClearCache } = options
  const metaKeys = resolveRouteMetaKeys(options.metaKeys)

  /** 本次导航在 beforeResolve 中做出的决策，供 afterEach 消费 */
  interface PendingNavigation {
    to: RouteLocationNormalized
    /** to 路由的组件名；缺失时 afterEach 告警 */
    componentName: string | undefined
    /** beforeResolve 中从列表移除、且原本就在列表里的名字，导航失败时放回 */
    removed: string | undefined
  }
  let pending: PendingNavigation | undefined

  /** 导航未进入目标页：把 beforeResolve 中移除的名字放回列表 */
  function restoreRemoved(record: PendingNavigation | undefined): void {
    if (record?.removed) {
      include.add(record.removed)
    }
  }

  const stopBeforeResolve = router.beforeResolve(async (to, from) => {
    // 上一条记录未被 afterEach 消费 = 上一次导航被重定向或抛错，视同失败结算
    restoreRemoved(pending)
    pending = undefined
    if (to.fullPath === from.fullPath || filter?.(to, from) === false) {
      return
    }

    const componentName = getRouteComponentName(to)
    const toClear = componentName && (shouldClearCache?.(to, from, metaKeys) ?? shouldClearByMeta(to, from, metaKeys))
      ? componentName
      : undefined

    // 先登记再挂起：挂起期间若有新导航进来，它能在自己的 beforeResolve 开头结算这条记录
    pending = { to, componentName, removed: toClear && include.has(toClear) ? toClear : undefined }
    if (toClear) {
      include.remove(toClear)
      // 等 KeepAlive 的 include 监听（post flush）执行完：此时 from 仍是当前页，旧实例被真正卸载
      await nextTick()
    }
  })

  const stopAfterEach = router.afterEach((to, _from, failure) => {
    const current = pending
    // 被 filter 跳过的导航没有记录；记录不属于本次导航（本次已被挤掉、记录是后来者的）则留给它的主人
    if (!current || current.to !== to) {
      return
    }
    pending = undefined
    if (failure) {
      restoreRemoved(current)
      return
    }
    if (!current.componentName) {
      console.warn('[hooks-vue] 路由组件缺少 name，KeepAlive 缓存将失效（script setup 组件请用 defineOptions 命名）')
      return
    }
    include.add(current.componentName)
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
