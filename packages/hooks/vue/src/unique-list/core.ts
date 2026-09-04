/**
 * # 唯一列表管理器实例
 *
 * 无框架依赖
 */
export interface UniqueListCore<T = string> {
  /**
   * ## 获取去重后的列表快照
   *
   * - 按插入顺序
   * - 内容不变时多次读取返回同一引用，有实际变更时更换为新数组；
   *   上层可直接用引用比较判断是否需要更新
   * - 返回已冻结的只读数组，外部修改不影响内部状态
   */
  getList: () => readonly T[]
  /**
   * ## 获取当前元素数量
   */
  getSize: () => number

  /**
   * ## 是否存在
   */
  has: (value: T) => boolean
  /**
   * ## 添加
   *
   * - 自动去重，支持批量
   * - 有实际变化时返回 true
   */
  add: (input: T | readonly T[]) => boolean
  /**
   * ## 移除
   *
   * - 支持批量
   * - 有实际变化时返回 true
   */
  remove: (input: T | readonly T[]) => boolean
  /**
   * ## 清空
   *
   * 原本非空时返回 true
   */
  clear: () => boolean
}

function toItems<T>(input: T | readonly T[]): readonly T[] {
  // 与 Set 一致：单值（含 null / undefined）原样入列；只有数组才当批量
  return Array.isArray(input) ? input : [input as T]
}

/**
 * # 创建唯一列表管理器
 *
 * 纯状态，不依赖响应式
 *
 * @description
 * - 内部以 Set 去重（SameValueZero），`getList` 按插入顺序输出
 * - **不过滤任何值**：空串、`null`、`undefined`、`NaN` 都是合法元素
 * - 有实际变更时 `getList` 换为新冻结数组，未变更时保持原引用，
 *   上层可放心用引用比较做缓存 / 跳过更新
 * - 本管理器作用是管理维护列表的唯一性，入参 initialList 仅作为初始构造参数；
 *   初始参数外部引用的数据改变也不会影响内部列表，数据所有权在本管理器内部
 * - 批量用 `Array.isArray` 判定；`T` 自身为数组时无法与「一批元素」区分，请拆开传入
 *
 * @remarks 复杂度
 * - `getList` / `getSize` / `has`：O(1)
 * - `add` / `remove`：无实际变更时 O(k)（k 为入参数量）；
 *   有实际变更时额外 O(n) 重建快照（n 为当前列表长度）
 * - `clear`：无实际变更时 O(1)，有实际变更时 O(n)
 * - 适合「低频变更、高频读取」；高频逐条增删场景请先攒批再提交
 */
export function createUniqueListCore<T = string>(initialList: readonly T[] = []): UniqueListCore<T> {
  const set = new Set<T>(initialList)
  let cachedList: readonly T[] = Object.freeze(Array.from(set))

  function rebuildCache(): void {
    cachedList = Object.freeze(Array.from(set))
  }

  return {
    // #region ---------[ getter ]---------
    getList(): readonly T[] {
      return cachedList
    },
    getSize(): number {
      return set.size
    },
    // #endregion

    // #region ---------[ action ]---------
    has(value: T): boolean {
      return set.has(value)
    },
    add(input: T | readonly T[]): boolean {
      const before = set.size
      for (const item of toItems(input)) set.add(item)

      if (set.size !== before)
        rebuildCache()

      return set.size !== before
      // ? 可读性较好的实现（暂时留存）
      // let changed = false
      // for (const item of toItems(input)) {
      //   if (!set.has(item)) {
      //     set.add(item)
      //     changed = true
      //   }
      // }
      // if (changed) {
      //   rebuildCache()
      // }
      // return changed
    },
    remove(input: T | readonly T[]): boolean {
      let changed = false
      for (const item of toItems(input)) {
        if (set.delete(item)) {
          changed = true
        }
      }
      if (changed) {
        rebuildCache()
      }
      return changed
    },
    clear(): boolean {
      if (set.size === 0) {
        return false
      }
      set.clear()
      rebuildCache()
      return true
    },
    // #endregion
  }
}
