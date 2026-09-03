import type { Router } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createIframeManager } from './index'
import { createIframeGuard } from './vue-router'

const metaKeys = { keepKey: 'keep', noKeepKey: 'noKeep' }

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/iframe-a', name: 'iframe-a', component: { name: 'PageA', render: () => null }, meta: { iframe: 'https://a.com' } },
      { path: '/iframe-keep', name: 'iframe-keep', component: { name: 'PageB', render: () => null }, meta: { iframe: 'https://b.com', keep: ['normal'] } },
      { path: '/iframe-no-keep', name: 'iframe-no-keep', component: { name: 'PageD', render: () => null }, meta: { iframe: 'https://d.com', keep: ['elsewhere'], noKeep: ['normal'] } },
      { path: '/normal', name: 'normal', component: { name: 'PageC', render: () => null } },
    ],
  })
}

describe('createIframeGuard', () => {
  it('进入带 meta.iframe 的路由时打开对应页签', async () => {
    const manager = createIframeManager(3)
    const router = makeRouter()
    createIframeGuard(
      { open: manager.open, close: manager.close },
      metaKeys,
    )(router)

    await router.push('/iframe-a')
    const record = manager.list.value.find(r => r.path === '/iframe-a')
    expect(record?.src).toBe('https://a.com')
    expect(record?.isOpen).toBe(true)
  })

  it('query.iframe / query.title 覆盖 meta 值', async () => {
    const manager = createIframeManager(3)
    const router = makeRouter()
    createIframeGuard(
      { open: manager.open, close: manager.close },
      metaKeys,
    )(router)

    await router.push('/iframe-a?iframe=https://override.com&title=自定义')
    const record = manager.list.value.find(r => r.path.startsWith('/iframe-a'))
    expect(record?.src).toBe('https://override.com')
    expect(record?.title).toBe('自定义')
  })

  it('meta.iframe 为 true 且无 query.iframe 时不打开', async () => {
    const router = makeRouter()
    router.addRoute({ path: '/flag-only', name: 'flag-only', component: { name: 'PageD', render: () => null }, meta: { iframe: true } })
    const open = vi.fn()
    createIframeGuard(
      { open, close: vi.fn() },
      metaKeys,
    )(router)

    await router.push('/flag-only')
    expect(open).not.toHaveBeenCalled()
  })

  it('离开 iframe 路由时默认关闭', async () => {
    const manager = createIframeManager(3)
    const router = makeRouter()
    createIframeGuard(
      { open: manager.open, close: manager.close },
      metaKeys,
    )(router)

    await router.push('/iframe-a')
    await router.push('/normal')
    const record = manager.list.value.find(r => r.path === '/iframe-a')
    expect(record?.isOpen).toBe(false)
  })

  it('meta[keepKey] 命中目标路由名时保持打开', async () => {
    const manager = createIframeManager(3)
    const router = makeRouter()
    createIframeGuard(
      { open: manager.open, close: manager.close },
      metaKeys,
    )(router)

    // /iframe-keep 声明 keep: ['normal']，进入 normal 路由不关闭
    await router.push('/iframe-keep')
    await router.push('/normal')
    const record = manager.list.value.find(r => r.path === '/iframe-keep')
    expect(record?.isOpen).toBe(true)
  })

  it('meta[noKeepKey] 命中目标路由名时强制关闭（优先于 keep）', async () => {
    const manager = createIframeManager(3)
    const router = makeRouter()
    createIframeGuard(
      { open: manager.open, close: manager.close },
      metaKeys,
    )(router)

    // /iframe-no-keep 同时声明 keep: ['elsewhere'] 与 noKeep: ['normal']，黑名单优先
    await router.push('/iframe-no-keep')
    await router.push('/normal')
    const record = manager.list.value.find(r => r.path === '/iframe-no-keep')
    expect(record?.isOpen).toBe(false)
  })

  it('shouldClose 自定义决策覆盖默认规则', async () => {
    const manager = createIframeManager(3)
    const router = makeRouter()
    createIframeGuard(
      {
        open: manager.open,
        close: manager.close,
        shouldClose: () => false,
      },
      metaKeys,
    )(router)

    await router.push('/iframe-a')
    await router.push('/normal')
    // 默认规则应关闭，但自定义决策强制保持
    const record = manager.list.value.find(r => r.path === '/iframe-a')
    expect(record?.isOpen).toBe(true)
  })
})
