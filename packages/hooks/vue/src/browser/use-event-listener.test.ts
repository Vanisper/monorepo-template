import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useEventListener } from './use-event-listener'

describe('useEventListener', () => {
  it('注册监听并可通过返回值移除', () => {
    const target = new EventTarget()
    const listener = vi.fn()
    const stop = useEventListener(target, 'ping', listener)

    target.dispatchEvent(new Event('ping'))
    expect(listener).toHaveBeenCalledTimes(1)

    stop()
    target.dispatchEvent(new Event('ping'))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('scope 销毁时自动移除', () => {
    const target = new EventTarget()
    const listener = vi.fn()
    const scope = effectScope()
    scope.run(() => useEventListener(target, 'ping', listener))

    scope.stop()
    target.dispatchEvent(new Event('ping'))
    expect(listener).not.toHaveBeenCalled()
  })

  it('目标为空时为空操作', () => {
    expect(() => useEventListener(null, 'ping', () => {})()).not.toThrow()
    expect(() => useEventListener(undefined, 'ping', () => {})()).not.toThrow()
  })
})
