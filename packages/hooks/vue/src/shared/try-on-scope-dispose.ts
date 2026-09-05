import { getCurrentScope, onScopeDispose } from 'vue'

/**
 * # 若处于 effect scope 内则注册销毁回调
 *
 * @description
 * - 副作用的生命周期归属于创建它时所在的 effect scope（组件 setup 即一个 scope）
 * - 不在任何 scope 内（模块级调用）时不注册、返回 false：副作用与应用同寿；
 *   需要手动控制时由调用方自建 `effectScope()` 包裹后 `scope.stop()`
 * @returns 是否成功注册
 */
export function tryOnScopeDispose(fn: () => void): boolean {
  if (getCurrentScope()) {
    onScopeDispose(fn)
    return true
  }
  return false
}
