import { describe, expect, it } from 'vitest'
import { isMobileUserAgent, narrowerThan, resolveMode } from './core'

describe('mobile-adaptation core', () => {
  describe('isMobileUserAgent', () => {
    it('识别常见移动设备 UA', () => {
      expect(isMobileUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
      expect(isMobileUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(true)
    })

    it('桌面 UA 与无 UA 均为 false', () => {
      expect(isMobileUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false)
      expect(isMobileUserAgent(undefined)).toBe(false)
      expect(isMobileUserAgent('')).toBe(false)
    })
  })

  describe('resolveMode', () => {
    it('未启用恒为 pc', () => {
      expect(resolveMode({ isMobileUA: true, isNarrow: true, enabled: false })).toBe('pc')
    })

    it('移动 UA 恒为 mobile，视口不参与', () => {
      expect(resolveMode({ isMobileUA: true, isNarrow: false, enabled: true })).toBe('mobile')
    })

    it('桌面 UA 按视口宽窄判定', () => {
      expect(resolveMode({ isMobileUA: false, isNarrow: true, enabled: true })).toBe('mobile')
      expect(resolveMode({ isMobileUA: false, isNarrow: false, enabled: true })).toBe('pc')
    })
  })

  it('narrowerThan 生成严格小于阈值的媒体查询', () => {
    expect(narrowerThan(1024)).toBe('not all and (min-width: 1024px)')
  })
})
