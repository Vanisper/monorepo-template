import type { ComputedRef } from 'vue'
import { computed, ref } from 'vue'

/** createUniqueList 返回的唯一列表管理器 */
export interface UniqueListManager {
  /** 去重后的列表（按插入顺序） */
  list: ComputedRef<string[]>
  /** 添加（自动去重，支持批量） */
  add: (name: string | string[]) => void
  /** 移除（支持批量） */
  remove: (name: string | string[]) => void
  /** 清空 */
  clear: () => void
}

/**
 * 创建唯一字符串列表管理器
 *
 * 内部以 Set 去重，`list` 按插入顺序输出；KeepAlive 缓存列表的基础实现
 */
export function createUniqueList(initialList: string[] = []): UniqueListManager {
  const setRef = ref<Set<string>>(new Set(initialList))
  const list = computed(() => Array.from(setRef.value))

  function add(name: string | string[]): void {
    const items = Array.isArray(name) ? name : [name]
    // 过滤空串：路由名、组件名场景下空值只会是脏数据
    for (const item of items) {
      if (item) {
        setRef.value.add(item)
      }
    }
  }

  function remove(name: string | string[]): void {
    const items = Array.isArray(name) ? name : [name]
    for (const item of items) {
      setRef.value.delete(item)
    }
  }

  function clear(): void {
    setRef.value = new Set()
  }

  return { list, add, remove, clear }
}
