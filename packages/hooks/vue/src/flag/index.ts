import type { ComputedRef, Ref } from 'vue'
import { computed, isRef, readonly, ref, watch } from 'vue'

/** createFlag 的配置项 */
export interface FlagOptions {
  /** 派生状态，缺省为 flag 本身 */
  createStatus?: (flag: Ref<boolean>) => boolean
  /** flag 变化后的回调（reset 不触发） */
  afterChange?: (value: boolean, flag: Ref<boolean>) => void
}

/** createFlag 返回的布尔开关管理器 */
export interface FlagManager {
  /** 当前状态（只读） */
  flag: Readonly<Ref<boolean>>
  /** 派生状态 */
  status: ComputedRef<boolean>
  /** 翻转状态；传 boolean 时置为指定值 */
  toggle: (target?: boolean) => void
  /** 重置为创建时的初始状态 */
  reset: () => void
}

/**
 * 创建布尔开关管理器
 *
 * `init` 传 Ref 时为单向同步：源变化更新 flag，flag 自身变化不回写源
 */
export function createFlag(init?: boolean | Ref<boolean>, options?: FlagOptions): FlagManager {
  const flag = ref(isRef(init) ? init.value : Boolean(init))
  const initial = flag.value

  if (isRef(init)) {
    // 源 Ref 是事实来源，flag 只是受控镜像
    watch(init, (value) => {
      toggle(value)
    })
  }

  const status = computed(() =>
    options?.createStatus
      ? options.createStatus(flag)
      : flag.value,
  )

  function toggle(target?: boolean): void {
    flag.value = typeof target === 'boolean' ? target : !flag.value
    options?.afterChange?.(flag.value, flag)
  }

  function reset(): void {
    flag.value = initial
  }

  return {
    flag: readonly(flag),
    status,
    toggle,
    reset,
  }
}
