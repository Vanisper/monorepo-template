import type { Router } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useKeepAliveGuard } from './use-keep-alive-guard'

const metaKeys = { keepKey: 'keep', noKeepKey: 'noKeep' }

const PageA = { name: 'PageA', render: () => null }
const PageB = { name: 'PageB', render: () => null }
const PageC = { name: 'PageC', render: () => null }
const PageD = { name: 'PageD', render: () => null }
const PageLazy = { name: 'PageLazy', render: () => null }
const AnonymousPage = { render: () => null }

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/a', name: 'a', component: PageA, meta: { keep: true } },
      { path: '/b', name: 'b', component: PageB },
      { path: '/c', name: 'c', component: PageC, meta: { keep: false } },
      { path: '/d', name: 'd', component: PageD, meta: { noKeep: ['b'] } },
      { path: '/lazy', name: 'lazy', component: () => Promise.resolve(PageLazy), meta: { keep: true } },
      { path: '/anon', name: 'anon', component: AnonymousPage },
    ],
  })
}

function installSpiedGuard(router: Router, extra: Partial<Parameters<typeof useKeepAliveGuard>[1]> = {}) {
  const include = { add: vi.fn(), remove: vi.fn() }
  const stop = useKeepAliveGuard(router, { include, metaKeys, ...extra })
  return { ...include, stop }
}

describe('useKeepAliveGuard', () => {
  it('meta[keepKey] 为 true 的路由进入后加入缓存列表', async () => {
    const router = makeRouter()
    const { add, remove } = installSpiedGuard(router)

    await router.push('/a')
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith('PageA'))
    expect(remove).not.toHaveBeenCalled()
  })

  it('懒加载路由组件在 afterEach 时已解析，正常加入缓存', async () => {
    const router = makeRouter()
    const { add } = installSpiedGuard(router)

    await router.push('/lazy')
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith('PageLazy'))
  })

  it('组件缺少 name 时告警且不加入缓存列表', async () => {
    const router = makeRouter()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { add } = installSpiedGuard(router)

    await router.push('/anon')
    await vi.waitFor(() => expect(warn).toHaveBeenCalled())
    expect(add).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('filter 返回 false 时跳过本次导航', async () => {
    const router = makeRouter()
    const { add } = installSpiedGuard(router, { filter: () => false })

    await router.push('/a')
    await nextTick()
    expect(add).not.toHaveBeenCalled()
  })

  it('meta[keepKey] 为 false 时先移除（beforeResolve）再加入（afterEach）', async () => {
    const router = makeRouter()
    const { add, remove } = installSpiedGuard(router)

    await router.push('/c')
    expect(remove).toHaveBeenCalledWith('PageC')
    expect(add).toHaveBeenCalledWith('PageC')
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(add.mock.invocationCallOrder[0]!)
  })

  it('meta[noKeepKey] 命中 from 路由名时清除缓存', async () => {
    const router = makeRouter()
    const { add, remove } = installSpiedGuard(router)

    await router.push('/b')
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith('PageB'))
    add.mockClear()

    await router.push('/d')
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith('PageD'))
    expect(remove).toHaveBeenCalledWith('PageD')
  })

  it('shouldClearCache 自定义决策覆盖默认规则', async () => {
    const router = makeRouter()
    const { add, remove } = installSpiedGuard(router, { shouldClearCache: () => false })

    await router.push('/b')
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith('PageB'))
    expect(remove).not.toHaveBeenCalled()
  })

  it('默认 metaKeys 为 keepAlive / noKeepAlive', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/a', name: 'a', component: PageA, meta: { keepAlive: true } }],
    })
    const include = { add: vi.fn(), remove: vi.fn() }
    useKeepAliveGuard(router, { include })

    await router.push('/a')
    await vi.waitFor(() => expect(include.add).toHaveBeenCalledWith('PageA'))
    expect(include.remove).not.toHaveBeenCalled()
  })

  it('返回卸载函数，卸载后不再处理导航', async () => {
    const router = makeRouter()
    const { add, stop } = installSpiedGuard(router)
    stop()

    await router.push('/a')
    await nextTick()
    expect(add).not.toHaveBeenCalled()
  })

  it('处于 effect scope 内时随 scope 销毁自动卸载', async () => {
    const router = makeRouter()
    const include = { add: vi.fn(), remove: vi.fn() }
    const scope = effectScope()
    scope.run(() => useKeepAliveGuard(router, { include, metaKeys }))
    scope.stop()

    await router.push('/a')
    await nextTick()
    expect(include.add).not.toHaveBeenCalled()
  })
})
