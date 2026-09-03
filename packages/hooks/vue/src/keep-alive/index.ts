import type { RouteMetaKeys } from '../route-meta'
import type { UniqueListManager } from '../unique-list'
import { createUniqueList } from '../unique-list'

/** createKeepAlive 返回的 KeepAlive 缓存列表管理器 */
export interface KeepAliveManager extends UniqueListManager {
  /** 路由 Meta 键配置原样透出，供守卫等场景共用 */
  metaKeys: RouteMetaKeys
}

/**
 * 创建 KeepAlive 缓存列表管理器
 *
 * 与 createKeepAliveGuard 配套：guard 按路由 meta 维护列表，
 * 业务侧将其绑定到 `<KeepAlive :include>` 即可实现多页签路由缓存
 */
export function createKeepAlive(metaKeys: RouteMetaKeys, initialList: string[] = []): KeepAliveManager {
  return {
    ...createUniqueList(initialList),
    metaKeys,
  }
}
