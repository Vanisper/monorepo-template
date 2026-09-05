import { tryOnScopeDispose } from '../shared/try-on-scope-dispose'

/** 事件监听目标：允许为空以便与可注入宿主（`window ?? null`）直接对接 */
export type EventListenerTarget = EventTarget | null | undefined

/**
 * # 注册事件监听，返回移除函数
 *
 * @description
 * - 处于 effect scope 内时随 scope 销毁自动移除；模块级调用则由返回值手动移除
 * - 目标为空（SSR / 注入 null）时为空操作，返回的移除函数同样为空操作
 */
export function useEventListener<E extends Event = Event>(
  target: EventListenerTarget,
  type: string,
  listener: (event: E) => void,
  options?: AddEventListenerOptions | boolean,
): () => void {
  if (!target) {
    return () => {}
  }

  const handler = listener as EventListener
  target.addEventListener(type, handler, options)

  const stop = (): void => target.removeEventListener(type, handler, options)
  tryOnScopeDispose(stop)
  return stop
}
