import type { ComputedRef } from 'vue'
import { computed, shallowRef } from 'vue'
import { createFlagCore } from './core'

/**
 * # createFlag 的配置项
 */
export interface FlagOptions {
  /**
   * ## 派生状态
   *
   * 缺省为 flag 本身
   */
  createStatus?: (flag: boolean) => boolean
  /**
   * ## 变化回调
   *
   * flag 实际变化后触发（reset 不触发）
   */
  afterChange?: (value: boolean) => void
}

/**
 * # createFlag 返回的布尔开关管理器
 */
export interface FlagManager {
  /**
   * ## 当前状态（只读）
   *
   * `ComputedRef` 在类型层面就表达了「不可赋值」
   */
  flag: ComputedRef<boolean>
  /**
   * ## 派生状态
   */
  status: ComputedRef<boolean>
  /**
   * ## 翻转状态
   *
   * 传 boolean 时置为指定值
   */
  toggle: (target?: boolean) => void
  /**
   * ## 重置为创建时的初始状态
   */
  reset: () => void
}

/**
 * # 创建布尔开关管理器
 *
 * Vue 适配层，模块级也可调用
 *
 * @description
 * - 有实际变化才替换状态并触发 afterChange；重复置为同值零响应式开销
 * - 数据所有权在管理器内部：`init` 是种子（构造参数拷贝），
 *   变更只走 toggle / reset 接口，不对入参引用做响应反馈——
 *   需要跟随外部源时由调用方显式 `watch(source, v => flag.toggle(v))`
 */
export function createFlag(init = false, options?: FlagOptions): FlagManager {
  const core = createFlagCore(init)
  const trigger = shallowRef(0)

  const flag = computed<boolean>(() => {
    // eslint-disable-next-line ts/no-unused-expressions
    trigger.value // 建立响应式依赖
    return core.get()
  })

  const status = computed<boolean>(() =>
    options?.createStatus
      ? options.createStatus(flag.value)
      : flag.value,
  )

  function toggle(target?: boolean): void {
    if (core.toggle(target)) {
      trigger.value++
      options?.afterChange?.(core.get())
    }
  }

  function reset(): void {
    if (core.reset()) {
      trigger.value++
    }
  }

  return {
    flag,
    status,
    toggle,
    reset,
  }
}
