import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMobileAdaptation } from './index'

function stubBrowser(ua: string, initialWidth: number) {
  const listeners: Array<() => void> = []
  const documentElement = { clientWidth: initialWidth }
  vi.stubGlobal('navigator', { userAgent: ua })
  vi.stubGlobal('document', { documentElement })
  vi.stubGlobal('window', {
    addEventListener: vi.fn((type: string, handler: () => void) => {
      if (type === 'resize') {
        listeners.push(handler)
      }
    }),
    removeEventListener: vi.fn((type: string, handler: () => void) => {
      const index = listeners.indexOf(handler)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }),
  })
  return {
    resize(width: number) {
      documentElement.clientWidth = width
      for (const handler of [...listeners]) {
        handler()
      }
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createMobileAdaptation', () => {
  it('移动设备 UA 恒为 mobile，resize 不影响', () => {
    stubBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 1920)
    const manager = createMobileAdaptation()()
    manager.setMode(1920)
    expect(manager.mode.value).toBe('mobile')
  })

  it('桌面 UA 按宽度阈值判定', () => {
    stubBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 1440)
    const manager = createMobileAdaptation()()
    expect(manager.mode.value).toBe('pc')

    manager.setMode(800)
    expect(manager.mode.value).toBe('mobile')

    manager.setMode(1200)
    expect(manager.mode.value).toBe('pc')
  })

  it('thresholdWidth 自定义阈值', () => {
    stubBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 1000)
    const manager = createMobileAdaptation({ thresholdWidth: 768 })()
    expect(manager.mode.value).toBe('pc')
  })

  it('enable 关闭后恒为 pc，重新开启恢复判定', () => {
    stubBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 1440)
    const manager = createMobileAdaptation()()

    manager.enable.value = false
    manager.setMode(500)
    expect(manager.mode.value).toBe('pc')

    manager.enable.value = true
    manager.setMode(500)
    expect(manager.mode.value).toBe('mobile')
  })

  it('默认阈值为 1024', () => {
    stubBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 1023)
    const manager = createMobileAdaptation()()
    manager.setMode(1023)
    expect(manager.mode.value).toBe('mobile')
  })
})
