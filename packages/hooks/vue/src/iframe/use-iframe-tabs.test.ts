import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref, toValue, watch } from 'vue'
import { useIframeTabs } from './use-iframe-tabs'

describe('useIframeTabs', () => {
  it('open / close / markLoaded 基本流转', () => {
    const iframe = useIframeTabs({ maxOpen: 3 })
    expect(iframe.open({ path: '/a', src: 'https://a.com' })).toBe(true)
    expect(iframe.openedTabs.value).toHaveLength(1)

    expect(iframe.markLoaded('/a')).toBe(true)
    expect(iframe.tabs.value[0]?.isLoading).toBe(false)

    expect(iframe.close('/a')).toBe(true)
    expect(iframe.openedTabs.value).toHaveLength(0)
    expect(iframe.tabs.value).toHaveLength(1)

    expect(iframe.remove('/a')).toBe(true)
    expect(iframe.tabs.value).toHaveLength(0)
  })

  it('无实际变化的操作返回 false 且不触发更新', async () => {
    const iframe = useIframeTabs()
    iframe.open({ path: '/a', src: 'https://a.com' })
    const spy = vi.fn()
    watch(iframe.tabs, spy)

    expect(iframe.open({ path: '/a', src: 'https://a.com' })).toBe(false)
    expect(iframe.close('/x')).toBe(false)
    await nextTick()
    expect(spy).not.toHaveBeenCalled()
  })

  it('仅访问序变化时 tabs 引用不变', () => {
    const iframe = useIframeTabs()
    iframe.open({ path: '/a', src: 'https://a.com' })
    iframe.open({ path: '/b', src: 'https://b.com' })
    const before = iframe.tabs.value

    expect(iframe.open({ path: '/a', src: 'https://a.com' })).toBe(true)
    expect(iframe.tabs.value).toBe(before)
  })

  it('默认 maxOpen 为 5', () => {
    const iframe = useIframeTabs()
    for (let i = 0; i < 6; i++) {
      iframe.open({ path: `/${i}`, src: `https://${i}.com` })
    }
    expect(iframe.openedTabs.value).toHaveLength(5)
    expect(iframe.tabs.value[0]?.isOpen).toBe(false)
  })

  it('title 支持 Ref：活引用只读消费，源变化在读取处反映', () => {
    const iframe = useIframeTabs()
    const count = ref(1)
    iframe.open({ path: '/report', src: 'https://r.com', title: () => `报表（${count.value}）` })
    const name = ref('外部')
    iframe.open({ path: '/ext', src: 'https://e.com', title: name })

    expect(toValue(iframe.tabs.value[0]?.title)).toBe('报表（1）')
    count.value = 2
    expect(toValue(iframe.tabs.value[0]?.title)).toBe('报表（2）')

    name.value = '外部（新）'
    expect(toValue(iframe.tabs.value[1]?.title)).toBe('外部（新）')
  })
})
