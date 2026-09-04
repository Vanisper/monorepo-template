import type { ComputedRef, Ref } from 'vue'
import { computed, isRef, shallowRef, watch } from 'vue'
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
   * flag 实际变化后触发（reset 不触发；源 Ref 同步引起的变化同样触发）
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
 * - `init` 传 Ref 时源是单一事实来源：toggle/reset 只写源，
 *   由 `flush: 'sync'` 的 watch 单路径同步镜像——不能本地再对齐一次，
 *   源被改回原值时 watcher 因净零变化跳过，双路径会脱节
 * - `init` 传静态值时所有权归管理器（构造参数拷贝语义）
 */
export function createFlag(init?: boolean | Ref<boolean>, options?: FlagOptions): FlagManager {
  // 创建时快照：reset 的目标值（Ref 模式下回写源也用它）
  const initial = isRef(init) ? init.value : Boolean(init)
  const core = createFlagCore(initial)
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
    const next = typeof target === 'boolean' ? target : !core.get()

    if (isRef(init)) {
      init.value = next
      return
    }
    if (core.toggle(next)) {
      trigger.value++
      options?.afterChange?.(next)
    }
  }

  function reset(): void {
    if (isRef(init)) {
      init.value = initial
      return
    }
    if (core.reset()) {
      trigger.value++
    }
  }

  if (isRef(init)) {
    watch(init, (value) => {
      if (core.toggle(value)) {
        trigger.value++
        options?.afterChange?.(value)
      }
    }, { flush: 'sync' })
  }

  return {
    flag,
    status,
    toggle,
    reset,
  }
}
