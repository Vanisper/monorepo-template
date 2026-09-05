import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { fakeWindow } from '../browser/use-media-query.fixture'
import { useMobileAdaptation } from './use-mobile-adaptation'

const DESKTOP_UA = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } as Navigator
const MOBILE_UA = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' } as Navigator

describe('useMobileAdaptation', () => {
  it('桌面 UA 按视口判定，跨越阈值时即时重算', () => {
    const host = fakeWindow(false)
    const { mode, isMobile } = useMobileAdaptation({ window: host.window, navigator: DESKTOP_UA })
    expect(mode.value).toBe('pc')
    expect(isMobile.value).toBe(false)

    host.change(true)
    expect(mode.value).toBe('mobile')
    expect(isMobile.value).toBe(true)
  })

  it('移动 UA 恒为 mobile，视口不参与', () => {
    const host = fakeWindow(false)
    const { mode } = useMobileAdaptation({ window: host.window, navigator: MOBILE_UA })
    expect(mode.value).toBe('mobile')
  })

  it('阈值转为严格小于的媒体查询，默认 1024', () => {
    const host = fakeWindow(false)
    useMobileAdaptation({ window: host.window, navigator: DESKTOP_UA })
    expect(host.window.matchMedia).toHaveBeenCalledWith('not all and (min-width: 1024px)')

    useMobileAdaptation({ window: host.window, navigator: DESKTOP_UA, thresholdWidth: 768 })
    expect(host.window.matchMedia).toHaveBeenCalledWith('not all and (min-width: 768px)')
  })

  it('enabled 为可写 ref：关闭后恒为 pc，重新开启即时恢复', () => {
    const host = fakeWindow(true)
    const { mode, enabled } = useMobileAdaptation({ window: host.window, navigator: DESKTOP_UA })
    expect(mode.value).toBe('mobile')

    enabled.value = false
    expect(mode.value).toBe('pc')
    enabled.value = true
    expect(mode.value).toBe('mobile')
  })

  it('enabled 传 Ref 时借用该 ref', () => {
    const host = fakeWindow(true)
    const enabled = ref(false)
    const adaptation = useMobileAdaptation({ window: host.window, navigator: DESKTOP_UA, enabled })
    expect(adaptation.enabled).toBe(enabled)
    expect(adaptation.mode.value).toBe('pc')

    enabled.value = true
    expect(adaptation.mode.value).toBe('mobile')
  })

  it('无宿主（SSR）时按 UA 兜底', () => {
    expect(useMobileAdaptation({ window: null, navigator: null }).mode.value).toBe('pc')
    expect(useMobileAdaptation({ window: null, navigator: MOBILE_UA }).mode.value).toBe('mobile')
  })
})
