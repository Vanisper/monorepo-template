import { describe, expect, it } from 'vitest'
import { effectScope } from 'vue'
import { useMediaQuery } from './use-media-query'
import { fakeWindow } from './use-media-query.fixture'

describe('useMediaQuery', () => {
  it('初值取 matchMedia 结果，change 事件后更新', () => {
    const host = fakeWindow(false)
    const matches = useMediaQuery('(max-width: 1023px)', { window: host.window })
    expect(host.window.matchMedia).toHaveBeenCalledWith('(max-width: 1023px)')
    expect(matches.value).toBe(false)

    host.change(true)
    expect(matches.value).toBe(true)
  })

  it('scope 销毁时移除监听', () => {
    const host = fakeWindow(false)
    const scope = effectScope()
    scope.run(() => useMediaQuery('(max-width: 1023px)', { window: host.window }))
    expect(host.listenerCount).toBe(1)

    scope.stop()
    expect(host.listenerCount).toBe(0)
  })

  it('无 matchMedia（SSR）时恒为 false', () => {
    expect(useMediaQuery('(max-width: 1023px)', { window: null }).value).toBe(false)
    expect(useMediaQuery('(max-width: 1023px)', { window: {} as Window }).value).toBe(false)
  })
})
