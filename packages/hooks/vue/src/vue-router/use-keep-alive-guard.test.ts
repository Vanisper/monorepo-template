import type { Router } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useUniqueList } from '../unique-list/use-unique-list'
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

/** 带状态的 include 假实现：spy 记录调用，Set 维护内容供 has 查询 */
function fakeInclude() {
  const names = new Set<string>()
  return {
    add: vi.fn((name: string) => names.add(name)),
    remove: vi.fn((name: string) => names.delete(name)),
    has: vi.fn((name: string) => names.has(name)),
  }
}

function installSpiedGuard(router: Router, extra: Partial<Parameters<typeof useKeepAliveGuard>[1]> = {}) {
  const include = fakeInclude()
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
    await router.push('/a')
    add.mockClear()
    remove.mockClear()
    await router.push('/c')
    expect(remove).toHaveBeenCalledWith('PageC')
    expect(add).toHaveBeenCalledWith('PageC')
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(add.mock.invocationCallOrder[0]!)
  })

  it('每次导航只调用一次 filter', async () => {
    const router = makeRouter()
    const filter = vi.fn(() => true)
    installSpiedGuard(router, { filter })

    await router.push('/a')
    expect(filter).toHaveBeenCalledTimes(1)
  })

  it('导航失败时不加入目标组件缓存，并恢复已移除的缓存', async () => {
    const router = makeRouter()
    const { add, remove } = installSpiedGuard(router)
    let abort = false
    router.beforeResolve(to => to.name === 'c' && abort ? false : undefined)

    await router.push('/a')
    await router.push('/c')
    await router.push('/a')
    add.mockClear()
    remove.mockClear()
    abort = true
    await router.push('/c')

    expect(router.currentRoute.value.name).toBe('a')
    expect(remove).toHaveBeenCalledWith('PageC')
    expect(add).toHaveBeenCalledWith('PageC')
  })

  it('使用真实唯一列表时导航失败也能恢复已移除的缓存', async () => {
    const router = makeRouter()
    const include = useUniqueList<string>()
    useKeepAliveGuard(router, { include, metaKeys })
    let abort = false
    router.beforeResolve(to => to.name === 'c' && abort ? false : undefined)

    await router.push('/c')
    await router.push('/a')
    expect(include.has('PageC')).toBe(true)

    abort = true
    await router.push('/c')

    expect(router.currentRoute.value.name).toBe('a')
    expect(include.has('PageC')).toBe(true)
  })

  it('被后续守卫重定向时恢复已移除的缓存（原导航不触发 afterEach）', async () => {
    const router = makeRouter()
    const include = useUniqueList<string>()
    useKeepAliveGuard(router, { include, metaKeys })
    let redirect = false
    router.beforeResolve(to => to.name === 'c' && redirect ? '/b' : undefined)

    await router.push('/c')
    await router.push('/a')
    expect(include.list.value).toEqual(['PageC', 'PageA'])

    redirect = true
    await router.push('/c')

    expect(router.currentRoute.value.name).toBe('b')
    // 恢复的名字追加在末尾；include 的顺序对 KeepAlive 无语义，只比较集合
    expect([...include.list.value].sort()).toEqual(['PageA', 'PageB', 'PageC'])
  })

  it('后续守卫抛错时，残留记录在下一次导航开始前结算', async () => {
    const router = makeRouter()
    const include = useUniqueList<string>()
    useKeepAliveGuard(router, { include, metaKeys })
    router.onError(() => {})
    let fail = false
    router.beforeResolve((to) => {
      if (to.name === 'c' && fail) {
        throw new Error('boom')
      }
    })

    await router.push('/c')
    await router.push('/a')

    fail = true
    await router.push('/c').catch(() => {})
    expect(router.currentRoute.value.name).toBe('a')

    fail = false
    await router.push('/b')
    expect([...include.list.value].sort()).toEqual(['PageA', 'PageB', 'PageC'])
  })

  describe('并发导航', () => {
    /**
     * 构造确定性交错：导航 A（→ /c，会移除 PageC）经过被测守卫后停在一个后置守卫里，
     * 在那里发起导航 B（→ /b），并按 `hold` 决定 A 何时继续。A 恢复后被 vue-router 判为 CANCELLED。
     */
    function raceAfterGuard(router: Router, hold: (b: Promise<unknown>) => Promise<unknown>) {
      let armed = true
      let b: Promise<unknown> = Promise.resolve()
      router.beforeResolve(async (to) => {
        if (to.name === 'c' && armed) {
          armed = false
          b = router.push('/b')
          await hold(b)
        }
      })
      return {
        get b() {
          return b
        },
      }
    }

    async function prime(router: Router, include: ReturnType<typeof useUniqueList<string>>) {
      await router.push('/c')
      await router.push('/a')
      expect(include.has('PageC')).toBe(true)
    }

    it('被挤掉导航的取消回调落在后来者登记之后、完成之前：不得清掉后来者的记录', async () => {
      const router = makeRouter()
      const include = useUniqueList<string>()
      useKeepAliveGuard(router, { include, metaKeys })
      await prime(router, include)

      // B 到达后置守卫（此时 B 已在被测守卫中登记）时放行 A，并把 B 扣住直到 A 的 afterEach 跑完
      let releaseA!: () => void
      let releaseB!: () => void
      const aMayContinue = new Promise<void>((resolve) => {
        releaseA = resolve
      })
      const bMayContinue = new Promise<void>((resolve) => {
        releaseB = resolve
      })
      const race = raceAfterGuard(router, () => aMayContinue)
      router.beforeResolve(async (to) => {
        if (to.name === 'b') {
          releaseA()
          await bMayContinue
        }
      })

      await router.push('/c') // A：被 CANCELLED，afterEach(A) 已执行，此时 pending 是 B 的记录
      expect(router.currentRoute.value.name).toBe('a')
      releaseB()
      await race.b

      expect(router.currentRoute.value.name).toBe('b')
      expect([...include.list.value].sort()).toEqual(['PageA', 'PageB', 'PageC'])
    })

    it('后来者在被挤掉导航挂起期间完整跑完：其 beforeResolve 结算残留记录，取消回调无事可做', async () => {
      const router = makeRouter()
      const include = useUniqueList<string>()
      useKeepAliveGuard(router, { include, metaKeys })
      await prime(router, include)

      raceAfterGuard(router, b => b)
      await router.push('/c')

      expect(router.currentRoute.value.name).toBe('b')
      expect([...include.list.value].sort()).toEqual(['PageA', 'PageB', 'PageC'])
    })
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
    const include = fakeInclude()
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
    const include = fakeInclude()
    const scope = effectScope()
    scope.run(() => useKeepAliveGuard(router, { include, metaKeys }))
    scope.stop()

    await router.push('/a')
    await nextTick()
    expect(include.add).not.toHaveBeenCalled()
  })
})
