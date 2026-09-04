import type { ComputedRef, Ref } from 'vue'
import { computed, isRef, shallowRef, watch } from 'vue'
import { createFlagCore } from './core'

/** createFlag 的配置项 */
export interface FlagOptions {
  /** 派生状态，缺省为 flag 本身 */
  createStatus?: (flag: boolean) => boolean
  /** flag 实际变化后的回调（reset 不触发；源 Ref 同步引起的变化同样触发） */
  afterChange?: (value: boolean) => void
}

/** createFlag 返回的布尔开关管理器 */
export interface FlagManager {
  /**
   * ## 当前状态（只读）
   * `ComputedRef` 在类型层面就表达了「不可赋值」
   */
  flag: ComputedRef<boolean>
  /** 派生状态 */
  status: ComputedRef<boolean>
  /** 翻转状态；传 boolean 时置为指定值 */
  toggle: (target?: boolean) => void
  /** 重置为创建时的初始状态 */
  reset: () => void
}

/**
 * # 创建布尔开关管理器
 * Vue 适配层，模块级也可调用
 *
 * @description
 * - 重复置为同值不算变化：不触发响应式更新，也不触发 afterChange
 * - `init` 传 Ref 时源是单一事实来源：toggle/reset 回写源，
 *   源被外部改变时同步镜像（回流幂等、不重复触发 afterChange）
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

    // 源 Ref 是单一事实来源：只写源，由下方 sync watch 同步镜像
    // （不能本地再对齐一次：源被改回原值时 watcher 因净零变化跳过，双路径会脱节）
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
    // 源被外部改变时同步镜像；sync 确保回写后立即可读到新值
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
