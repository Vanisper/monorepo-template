/**
 * # 唯一列表的纯函数内核
 *
 * @description
 * - 无框架依赖、无内部状态：每个函数都是 `(list, input) => list` 形态的 reducer
 * - 契约：**无实际变化时返回入参 `list` 的同一引用**，有变化时返回新的冻结数组——
 *   上层用引用比较即可判断是否变化，`shallowRef` 赋值同一引用时不会触发更新
 * - 以 Set 语义去重（SameValueZero），保持插入顺序；**不过滤任何值**——
 *   空串、`null`、`undefined`、`NaN` 都是合法元素，值语义归调用方
 * - 批量用 `Array.isArray` 判定；`T` 自身为数组时无法与「一批元素」区分，请拆开传入
 */

/** 单值或一批值：与 Set 一致，单值（含 null / undefined）原样入列，只有数组才当批量 */
export type ListInput<T> = T | readonly T[]

function toItems<T>(input: ListInput<T>): readonly T[] {
  return Array.isArray(input) ? input : [input as T]
}

function freeze<T>(items: Iterable<T>): readonly T[] {
  return Object.freeze(Array.from(items))
}

/**
 * ## 去重
 *
 * 返回按首次出现顺序去重后的冻结数组；用于把外部传入的初始列表归一为内部形态
 */
export function dedupe<T>(list: readonly T[]): readonly T[] {
  return freeze(new Set(list))
}

/**
 * ## 添加
 *
 * - 已存在的元素跳过；全部已存在时返回入参同一引用
 * - 复杂度：O(n + k)，n 为列表长度、k 为入参数量
 */
export function addUnique<T>(list: readonly T[], input: ListInput<T>): readonly T[] {
  const set = new Set(list)
  const before = set.size
  for (const item of toItems(input)) {
    set.add(item)
  }
  return set.size === before ? list : freeze(set)
}

/**
 * ## 移除
 *
 * - 未命中任何元素时返回入参同一引用
 * - 复杂度：O(n + k)
 */
export function removeItems<T>(list: readonly T[], input: ListInput<T>): readonly T[] {
  const targets = new Set(toItems(input))
  const next = list.filter(item => !targets.has(item))
  return next.length === list.length ? list : freeze(next)
}

/** 共享的空列表：清空后各实例返回同一引用，比较与缓存更省心 */
const EMPTY: readonly never[] = Object.freeze([])

/**
 * ## 清空
 *
 * 原本已空时返回入参同一引用
 */
export function clearList<T>(list: readonly T[]): readonly T[] {
  return list.length === 0 ? list : EMPTY
}
