import type { Router } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useIframeTabs } from '../iframe/use-iframe-tabs'
import { useIframeGuard } from './use-iframe-guard'

const metaKeys = { keepKey: 'keep', noKeepKey: 'noKeep' }
const Empty = { render: () => null }

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/iframe-a', name: 'iframe-a', component: Empty, meta: { iframe: 'https://a.com', title: '页签 A' } },
      { path: '/iframe-keep', name: 'iframe-keep', component: Empty, meta: { iframe: 'https://b.com', keep: ['normal'] } },
      { path: '/iframe-no-keep', name: 'iframe-no-keep', component: Empty, meta: { iframe: 'https://d.com', keep: ['elsewhere'], noKeep: ['normal'] } },
      { path: '/flag-only', name: 'flag-only', component: Empty, meta: { iframe: true } },
      { path: '/normal', name: 'normal', component: Empty },
    ],
  })
}

function setup(extra: Partial<Parameters<typeof useIframeGuard>[1]> = {}) {
  const tabs = useIframeTabs({ maxOpen: 3 })
  const router = makeRouter()
  const stop = useIframeGuard(router, { tabs, metaKeys, ...extra })
  const find = (path: string) => tabs.tabs.value.find(tab => tab.path.startsWith(path))
  return { tabs, router, stop, find }
}

describe('useIframeGuard', () => {
  it('进入带 meta.iframe 的路由时打开对应页签，标题取 meta.title', async () => {
    const { router, find } = setup()
    await router.push('/iframe-a')
    expect(find('/iframe-a')).toMatchObject({ src: 'https://a.com', title: '页签 A', isOpen: true })
  })

  it('query.iframe / query.title 覆盖 meta 值', async () => {
    const { router, find } = setup()
    await router.push('/iframe-a?iframe=https://override.com&title=自定义')
    expect(find('/iframe-a')).toMatchObject({ src: 'https://override.com', title: '自定义' })
  })

  it('meta.iframe 为 true 且无 query.iframe 时不打开', async () => {
    const { router, tabs } = setup()
    await router.push('/flag-only')
    expect(tabs.tabs.value).toHaveLength(0)
  })

  it('离开 iframe 路由时默认关闭', async () => {
    const { router, find } = setup()
    await router.push('/iframe-a')
    await router.push('/normal')
    expect(find('/iframe-a')?.isOpen).toBe(false)
  })

  it('meta[keepKey] 命中目标路由名时保持打开', async () => {
    const { router, find } = setup()
    await router.push('/iframe-keep')
    await router.push('/normal')
    expect(find('/iframe-keep')?.isOpen).toBe(true)
  })

  it('meta[noKeepKey] 命中目标路由名时强制关闭（优先于 keep）', async () => {
    const { router, find } = setup()
    await router.push('/iframe-no-keep')
    await router.push('/normal')
    expect(find('/iframe-no-keep')?.isOpen).toBe(false)
  })

  it('shouldClose 自定义决策覆盖默认规则', async () => {
    const { router, find } = setup({ shouldClose: () => false })
    await router.push('/iframe-a')
    await router.push('/normal')
    expect(find('/iframe-a')?.isOpen).toBe(true)
  })

  it('filter 返回 false 时跳过本次导航', async () => {
    const { router, tabs } = setup({ filter: () => false })
    await router.push('/iframe-a')
    expect(tabs.tabs.value).toHaveLength(0)
  })

  it('iframeKey / titleKey 可自定义', async () => {
    const tabs = useIframeTabs()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/x', name: 'x', component: Empty, meta: { embed: 'https://x.com', label: 'X' } }],
    })
    useIframeGuard(router, { tabs, iframeKey: 'embed', titleKey: 'label' })
    await router.push('/x')
    expect(tabs.tabs.value[0]).toMatchObject({ src: 'https://x.com', title: 'X' })
  })

  it('返回卸载函数，卸载后不再处理导航', async () => {
    const { router, tabs, stop } = setup()
    stop()
    await router.push('/iframe-a')
    expect(tabs.tabs.value).toHaveLength(0)
  })

  it('open / close 的调用次数与导航一致', async () => {
    const tabs = { open: vi.fn(), close: vi.fn() }
    const router = makeRouter()
    useIframeGuard(router, { tabs, metaKeys })

    await router.push('/iframe-a')
    await router.push('/normal')
    expect(tabs.open).toHaveBeenCalledTimes(1)
    expect(tabs.close).toHaveBeenCalledTimes(1)
    expect(tabs.close).toHaveBeenCalledWith('/iframe-a')
  })
})
