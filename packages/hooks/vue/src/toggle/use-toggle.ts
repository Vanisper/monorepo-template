import type { Ref, ShallowRef } from 'vue'
import { isRef, shallowRef } from 'vue'

/**
 * # 翻转函数
 *
 * - 传 boolean 时置为指定值，否则取反
 * - 非 boolean 入参一律视为「未传」：`@click="toggle"` 收到的事件对象不会被误当成值
 * - 返回翻转后的值
 */
export type ToggleFn = (value?: unknown) => boolean

/**
 * # 布尔开关
 *
 * @description
 * 按入参决定状态归属，两种形态返回值不同：
 * - 传 `Ref<boolean>`：**借用**——直接在调用方的 ref 上翻转，不创建镜像、不 watch 入参，
 *   只返回翻转函数（状态本来就在调用方手里）
 * - 传 boolean / 不传：**拥有**——创建 ref 并与翻转函数一并返还，
 *   调用方既可用 `toggle()` 也可直接写 `.value`（同一存放处，无需同步）
 *
 * 需要跟随变化做事（弹层开合回调、派生状态）时，在返回的 ref 上 `watch` / `computed`
 */
export function useToggle(value: Ref<boolean>): ToggleFn
export function useToggle(initialValue?: boolean): [ShallowRef<boolean>, ToggleFn]
export function useToggle(initialValue: Ref<boolean> | boolean = false): ToggleFn | [ShallowRef<boolean>, ToggleFn] {
  // shallowRef 收到 ref 时原样返回：借用形态下这里就是调用方的 ref
  const state = shallowRef(initialValue) as ShallowRef<boolean>

  const toggle: ToggleFn = (value) => {
    state.value = typeof value === 'boolean' ? value : !state.value
    return state.value
  }

  return isRef(initialValue) ? toggle : [state, toggle]
}
