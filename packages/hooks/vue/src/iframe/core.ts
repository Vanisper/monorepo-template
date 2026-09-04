/**
 * # iframe 页签记录
 * 无框架依赖
 */
export interface IframeRecord {
  /** 路由 fullPath，作为记录唯一键 */
  path: string
  /** iframe 加载地址 */
  src: string
  /** 页签标题，支持 getter 动态计算（框架响应式形态由适配层归一为 getter 后存入） */
  title?: string | (() => string)
  /** 是否处于打开状态（LRU 关闭后为 false） */
  isOpen: boolean
  /** 是否加载中（重新打开时复位为 true） */
  isLoading: boolean
}

/**
 * # iframe 页签管理器内核实例
 * 无框架依赖
 */
export interface IframeCore {
  /**
   * ## 获取全部记录快照
   * - 内容不变时多次读取返回同一引用，有实际变更时更换为新数组
   * - 返回已冻结的只读数组；记录对象以不可变更新维护，旧引用不会被篡改
   */
  getList: () => readonly IframeRecord[]
  /**
   * ## 获取打开中的记录快照
   * 引用稳定性语义同 getList
   */
  getOpenedList: () => readonly IframeRecord[]
  /**
   * ## 打开页签
   * - 已存在则复用记录（不更新 src/title），并置顶最近访问序
   * - 按最近访问序做 LRU，超出 `maxCache` 的旧页签关闭并复位加载态
   * - 对外可见状态有实际变化时返回 true（仅最近访问序变化不算）
   */
  open: (data: Pick<IframeRecord, 'path' | 'src' | 'title'>) => boolean
  /**
   * ## 关闭页签
   * - 支持批量；关闭后从最近访问序中移除
   * - 有实际变化时返回 true
   */
  close: (path: string | readonly string[]) => boolean
  /**
   * ## 标记加载完成
   * 有实际变化时返回 true
   */
  markLoaded: (path: string) => boolean
}

/**
 * # 创建 iframe 页签管理器内核
 * 纯状态，不依赖响应式
 *
 * @description
 * - 以 path 为键维护记录，不可变更新：每次实际变更整体重建快照
 * - LRU 语义：同一时刻最多保留 `maxCache` 个打开页签，超出时按最近访问序关闭最旧
 * @remarks 复杂度
 * - `getList` / `getOpenedList`：O(1)（读缓存快照）
 * - `open` / `close` / `markLoaded`：无实际变更时 O(k + n)（k 为入参数量，n 为记录数）；
 *   有实际变更时额外 O(n) 重建快照
 */
export function createIframeCore(maxCache: number): IframeCore {
  let records: IframeRecord[] = []
  let recentPaths: string[] = []
  let cachedList: readonly IframeRecord[] = Object.freeze([...records])
  let cachedOpenedList: readonly IframeRecord[] = Object.freeze([...records])

  function rebuild(): void {
    cachedList = Object.freeze([...records])
    cachedOpenedList = Object.freeze(records.filter(record => record.isOpen))
  }

  function findRecord(path: string): IframeRecord | undefined {
    return records.find(record => record.path === path)
  }

  function open(data: Pick<IframeRecord, 'path' | 'src' | 'title'>): boolean {
    const existing = findRecord(data.path)
    // 已存在的记录仅确保打开，不更新 src/title
    const opened = existing
      ? (existing.isOpen ? existing : { ...existing, isOpen: true })
      : { ...data, isOpen: true, isLoading: true }

    const nextRecords = existing
      ? records.map(record => (record === existing ? opened : record))
      : [...records, opened]

    // 最近访问置顶
    recentPaths = [data.path, ...recentPaths.filter(path => path !== data.path)]

    // LRU：按最近访问序（新 → 旧）统计打开数，超出 maxCache 的旧页签关闭并复位加载态
    let openCount = 0
    const toClose = new Set<string>()
    for (const path of recentPaths) {
      const record = nextRecords.find(item => item.path === path)
      if (!record?.isOpen) {
        continue
      }
      openCount++
      if (openCount > maxCache) {
        toClose.add(path)
      }
    }

    // 仅最近访问序变化（重复打开同一页签且无 LRU 关闭）对外不可见，保持快照引用
    if (opened === existing && toClose.size === 0) {
      return false
    }

    records = toClose.size
      ? nextRecords.map(record => (toClose.has(record.path) ? { ...record, isOpen: false, isLoading: true } : record))
      : nextRecords
    rebuild()
    return true
  }

  function close(path: string | readonly string[]): boolean {
    const paths = new Set(Array.isArray(path) ? path : [path])

    let changed = false
    const nextRecords = records.map((record) => {
      if (!paths.has(record.path) || !record.isOpen) {
        return record
      }
      changed = true
      return { ...record, isOpen: false, isLoading: true }
    })

    // 最近访问序的清理对外不可见，无论有无变化都要做
    recentPaths = recentPaths.filter(path => !paths.has(path))

    if (!changed) {
      return false
    }
    records = nextRecords
    rebuild()
    return true
  }

  function markLoaded(path: string): boolean {
    const existing = findRecord(path)
    if (!existing?.isLoading) {
      return false
    }
    records = records.map(record => (record === existing ? { ...record, isLoading: false } : record))
    rebuild()
    return true
  }

  return {
    getList: () => cachedList,
    getOpenedList: () => cachedOpenedList,
    open,
    close,
    markLoaded,
  }
}
