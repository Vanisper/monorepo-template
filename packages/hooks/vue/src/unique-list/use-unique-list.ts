import type { ShallowRef } from 'vue'
import type { ListInput } from './core'
import { shallowReadonly, shallowRef } from 'vue'
import { addUnique, clearList, dedupe, removeItems } from './core'

/**
 * # useUniqueList 返回的唯一列表
 */
export interface UniqueList<T> {
  /**
   * ## 列表快照（只读）
   *
   * - 按插入顺序；有实际变更时才更换引用，模板 / computed 可放心依赖
   * - 唯一性是本列表的不变量，因此只读：所有写入经由 add / remove / clear
   */
  list: Readonly<ShallowRef<readonly T[]>>
  /**
   * ## 是否存在
   */
  has: (value: T) => boolean
  /**
   * ## 添加
   *
   * 自动去重，支持批量；有实际变化时返回 true
   */
  add: (input: ListInput<T>) => boolean
  /**
   * ## 移除
   *
   * 支持批量；有实际变化时返回 true
   */
  remove: (input: ListInput<T>) => boolean
  /**
   * ## 清空
   *
   * 原本非空时返回 true
   */
  clear: () => boolean
}

/**
 * # 唯一列表
 *
 * @description
 * - 状态存放于一个 `shallowRef`，写入走纯函数 reducer：reducer 无变化时返回同一引用，
 *   `shallowRef` 赋值同一引用不触发任何更新——重复操作零响应式开销
 * - `initial` 仅作构造种子（拷贝去重），此后外部对该数组的改动不穿透
 * - 可在 setup 或模块级调用；无副作用、无需清理
 */
export function useUniqueList<T = string>(initial: readonly T[] = []): UniqueList<T> {
  const state = shallowRef<readonly T[]>(dedupe(initial))

  function commit(next: readonly T[]): boolean {
    const changed = next !== state.value
    state.value = next
    return changed
  }

  return {
    list: shallowReadonly(state),
    // includes 与 Set 同为 SameValueZero：NaN 也能命中
    has: value => state.value.includes(value),
    add: input => commit(addUnique(state.value, input)),
    remove: input => commit(removeItems(state.value, input)),
    clear: () => commit(clearList(state.value)),
  }
}
