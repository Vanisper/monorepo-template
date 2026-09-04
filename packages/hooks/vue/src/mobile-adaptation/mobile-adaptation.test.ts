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
  it('移动设备 UA 恒为 mobile，宽度不参与', () => {
    stubBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 1920)
    const manager = createMobileAdaptation()()
    manager.setWidth(1920)
    expect(manager.mode.value).toBe('mobile')
  })

  it('桌面 UA 按宽度阈值判定', () => {
    stubBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 1440)
    const manager = createMobileAdaptation()()
    expect(manager.mode.value).toBe('pc')

    manager.setWidth(800)
    expect(manager.mode.value).toBe('mobile')

    manager.setWidth(1200)
    expect(manager.mode.value).toBe('pc')
  })

  it('thresholdWidth 自定义阈值', () => {
    stubBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 1000)
    const manager = createMobileAdaptation({ thresholdWidth: 768 })()
    expect(manager.mode.value).toBe('pc')
  })

  it('enable 变更即时生效：mode 立即重算而非等下次宽度更新', () => {
    stubBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 400)
    const manager = createMobileAdaptation()()
    manager.setWidth(400)
    expect(manager.mode.value).toBe('mobile')

    manager.setEnabled(false)
    expect(manager.mode.value).toBe('pc')

    manager.setEnabled(true)
    expect(manager.mode.value).toBe('mobile')
  })

  it('默认阈值为 1024', () => {
    stubBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 1023)
    const manager = createMobileAdaptation()()
    manager.setWidth(1023)
    expect(manager.mode.value).toBe('mobile')
  })
})
