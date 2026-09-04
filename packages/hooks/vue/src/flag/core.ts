/**
 * # 布尔开关内核实例
 * 无框架依赖
 */
export interface FlagCore {
  /**
   * ## 获取当前状态
   */
  get: () => boolean
  /**
   * ## 翻转状态
   * - 不传或传非 boolean 时取反；传 boolean 时置为指定值
   * - 有实际变化时返回 true
   */
  toggle: (target?: boolean) => boolean
  /**
   * ## 重置为创建时的初始状态
   * 有实际变化时返回 true
   */
  reset: () => boolean
}

/**
 * # 创建布尔开关内核
 * 纯状态，不依赖响应式
 *
 * @description
 * - 变更方法以返回值表达「是否有实际变化」，重复置为同值不算变化
 * - 初始值仅作为构造参数，重置语义以创建时快照为准
 */
export function createFlagCore(init = false): FlagCore {
  let value = init

  return {
    get: () => value,
    toggle(target) {
      const next = typeof target === 'boolean' ? target : !value
      if (next === value) {
        return false
      }
      value = next
      return true
    },
    reset() {
      if (value === init) {
        return false
      }
      value = init
      return true
    },
  }
}
