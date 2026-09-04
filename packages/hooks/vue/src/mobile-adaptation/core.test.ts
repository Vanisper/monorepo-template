import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMobileDevice, resolveMode } from './core'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveMode', () => {
  const input = {
    isMobileUA: false,
    width: 1440,
    thresholdWidth: 1024,
    enabled: true,
  }

  it('未启用恒为 pc，UA 与宽度都不参与', () => {
    expect(resolveMode({ ...input, enabled: false, isMobileUA: true, width: 320 })).toBe('pc')
  })

  it('移动设备 UA 恒为 mobile，宽度不参与', () => {
    expect(resolveMode({ ...input, isMobileUA: true, width: 1920 })).toBe('mobile')
  })

  it('桌面设备按宽度阈值判定（阈值本身归 pc）', () => {
    expect(resolveMode({ ...input, width: 1023 })).toBe('mobile')
    expect(resolveMode({ ...input, width: 1024 })).toBe('pc')
    expect(resolveMode({ ...input, width: 1920 })).toBe('pc')
  })
})

describe('isMobileDevice', () => {
  it('按 UA 特征判定', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })
    expect(isMobileDevice()).toBe(true)

    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
    expect(isMobileDevice()).toBe(false)
  })

  it('无 navigator 环境（SSR）返回 false', () => {
    vi.stubGlobal('navigator', undefined)
    expect(isMobileDevice()).toBe(false)
  })
})
