import type { ComputedRef } from 'vue'
import { computed, shallowRef } from 'vue'
import { createUniqueListCore } from './core'

/**
 * # 唯一列表管理器实例
 * Vue 响应式适配
 */
export interface UniqueListManager<T = string> {
  /**
   * ## 去重后的列表快照
   * - 按插入顺序；有实际变更时更换引用
   * - `ComputedRef` 在类型层面就表达了「不可赋值」，
   *   无需 `Readonly<Ref<...>>` 式的双重包装（后者会展开成 DeepReadonly 嵌套）
   */
  list: ComputedRef<readonly T[]>
  /**
   * ## 添加
   * 自动去重，支持批量
   */
  add: (input: T | readonly T[]) => void
  /**
   * ## 移除
   * 支持批量
   */
  remove: (input: T | readonly T[]) => void
  /**
   * ## 清空
   */
  clear: () => void
}

/**
 * # 创建唯一列表管理器
 * Vue 适配层，模块级也可调用
 *
 * @description
 * - 有实际变化才替换数组引用，模板 / 计算属性才能跟上
 * - 元素语义与核心相同：不过滤任何值
 * - KeepAlive 缓存列表用这个（`T` 默认为 `string`）
 */
export function createUniqueList<T = string>(initialList: readonly T[] = []): UniqueListManager<T> {
  const core = createUniqueListCore(initialList)

  const trigger = shallowRef(0)

  // computed 无 setter，类型天然只读；内部读取最新的 core 快照
  const list = computed<readonly T[]>(() => {
    // eslint-disable-next-line ts/no-unused-expressions
    trigger.value // 建立响应式依赖
    return core.getList()
  })

  function commit(mutate: () => boolean): void {
    if (mutate()) {
      trigger.value++
    }
  }

  return {
    list,
    add: input => commit(() => core.add(input)),
    remove: input => commit(() => core.remove(input)),
    clear: () => commit(() => core.clear()),
  }
}
