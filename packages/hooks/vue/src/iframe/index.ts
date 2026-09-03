import type { ComputedRef, Ref } from 'vue'
import { computed, readonly, ref } from 'vue'

/** 单个 iframe 页签记录 */
export interface IframeRecord {
  /** 路由 fullPath，作为记录唯一键 */
  path: string
  /** iframe 加载地址 */
  src: string
  /** 页签标题，支持 getter 动态计算 */
  title?: string | (() => string)
  /** 是否处于打开状态（LRU 关闭后为 false） */
  isOpen: boolean
  /** 是否加载中（重新打开时复位为 true） */
  isLoading: boolean
}

/** open 的入参 */
export type IframeOpenOptions = Pick<IframeRecord, 'path' | 'src' | 'title'>

/** createIframeManager 返回的 iframe 多页签管理器 */
export interface IframeManager {
  /** 全部记录（只读） */
  list: Readonly<Ref<readonly IframeRecord[]>>
  /** 打开中的记录 */
  openedList: ComputedRef<readonly IframeRecord[]>
  /** 打开（已存在则复用记录），并按 LRU 关闭超限的旧页签 */
  open: (data: IframeOpenOptions) => void
  /** 关闭（支持批量），关闭后从最近访问序中移除 */
  close: (path: string | string[]) => void
  /** 标记加载完成（iframe onload 时调用） */
  closeLoading: (path: string) => void
}

/**
 * 创建 iframe 多页签管理器
 *
 * 内部以 path 为键维护记录，按最近访问序做 LRU，
 * 同一时刻最多保留 `maxCache` 个打开页签
 */
export function createIframeManager(maxCache: number): IframeManager {
  const list = ref<IframeRecord[]>([])
  const recentPathList = ref<string[]>([])

  const openedList = computed(() => list.value.filter(item => item.isOpen))

  function findRecord(path: string): IframeRecord | undefined {
    return list.value.find(item => item.path === path)
  }

  function open(data: IframeOpenOptions): void {
    let record = findRecord(data.path)
    if (!record) {
      record = { ...data, isOpen: false, isLoading: true }
      list.value.push(record)
    }
    record.isOpen = true

    // 最近访问置顶
    recentPathList.value = [data.path, ...recentPathList.value.filter(path => path !== data.path)]

    // LRU：按最近访问序（新 → 旧）统计打开数，超出 maxCache 的旧页签关闭并复位加载态
    let openCount = 0
    for (const path of recentPathList.value) {
      const item = findRecord(path)
      if (!item?.isOpen) {
        continue
      }
      openCount++
      if (openCount > maxCache) {
        item.isOpen = false
        item.isLoading = true
      }
    }
  }

  function close(path: string | string[]): void {
    const paths = Array.isArray(path) ? path : [path]
    for (const p of paths) {
      const record = findRecord(p)
      if (record) {
        record.isOpen = false
        record.isLoading = true
      }
      recentPathList.value = recentPathList.value.filter(item => item !== p)
    }
  }

  function closeLoading(path: string): void {
    const record = findRecord(path)
    if (record) {
      record.isLoading = false
    }
  }

  return {
    list: readonly(list) as Readonly<Ref<readonly IframeRecord[]>>,
    openedList,
    open,
    close,
    closeLoading,
  }
}
