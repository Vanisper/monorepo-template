import type { Router } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createKeepAlive } from './index'
import { createKeepAliveGuard } from './vue-router'

const metaKeys = { keepKey: 'keep', noKeepKey: 'noKeep' }

const PageA = { name: 'PageA', render: () => null }
const PageB = { name: 'PageB', render: () => null }
const PageC = { name: 'PageC', render: () => null }
const PageD = { name: 'PageD', render: () => null }
const AnonymousPage = { render: () => null }

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/a', name: 'a', component: PageA, meta: { keep: true } },
      { path: '/b', name: 'b', component: PageB },
      { path: '/c', name: 'c', component: PageC, meta: { keep: false } },
      { path: '/d', name: 'd', component: PageD, meta: { noKeep: ['b'] } },
      { path: '/anon', name: 'anon', component: AnonymousPage },
    ],
  })
}

function createSpiedGuard(router: Router) {
  const add = vi.fn()
  const remove = vi.fn()
  const setup = createKeepAliveGuard(
    { add, remove, enable: () => true },
    metaKeys,
  )
  setup(router)
  return { add, remove }
}

describe('createKeepAlive', () => {
  it('透出 metaKeys，并具备唯一列表管理能力', () => {
    const manager = createKeepAlive(metaKeys, ['PageA'])
    expect(manager.metaKeys).toEqual(metaKeys)
    manager.add('PageB')
    manager.remove('PageA')
    expect(manager.list.value).toEqual(['PageB'])
  })
})

describe('createKeepAliveGuard', () => {
  it('meta[keepKey] 为 true 的路由进入后加入缓存列表', async () => {
    const router = makeRouter()
    const { add } = createSpiedGuard(router)

    await router.push('/a')
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith('PageA'))
  })

  it('组件缺少 name 时告警且不加入缓存列表', async () => {
    const router = makeRouter()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { add } = createSpiedGuard(router)

    await router.push('/anon')
    await vi.waitFor(() => expect(warn).toHaveBeenCalled())
    expect(add).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('enable 返回 false 时跳过本次守卫', async () => {
    const router = makeRouter()
    const add = vi.fn()
    const setup = createKeepAliveGuard(
      { add, remove: vi.fn(), enable: () => false },
      metaKeys,
    )
    setup(router)

    await router.push('/a')
    await nextTick()
    expect(add).not.toHaveBeenCalled()
  })

  it('meta[keepKey] 为 false 时先移除再重新加入（触发重新挂载）', async () => {
    const router = makeRouter()
    const { add, remove } = createSpiedGuard(router)

    await router.push('/c')
    await vi.waitFor(() => expect(remove).toHaveBeenCalledWith('PageC'))
    expect(add).toHaveBeenCalledWith('PageC')
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(add.mock.invocationCallOrder[0]!)
  })

  it('meta[noKeepKey] 命中 from 路由名时清除缓存', async () => {
    const router = makeRouter()
    const { add, remove } = createSpiedGuard(router)

    // /d 声明「从路由 b 过来不缓存」，进入后先移除 PageD 缓存再重新加入
    await router.push('/b')
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith('PageB'))
    add.mockClear()
    await router.push('/d')
    await vi.waitFor(() => expect(remove).toHaveBeenCalledWith('PageD'))
    expect(add).toHaveBeenCalledWith('PageD')
  })

  it('shouldClearCache 自定义决策覆盖默认规则', async () => {
    const router = makeRouter()
    const add = vi.fn()
    const remove = vi.fn()
    const setup = createKeepAliveGuard(
      {
        add,
        remove,
        enable: () => true,
        shouldClearCache: () => false,
      },
      metaKeys,
    )
    setup(router)

    // /b 无 keep meta，默认规则应清除，但自定义决策返回 false 覆盖之
    await router.push('/b')
    await vi.waitFor(() => expect(add).toHaveBeenCalledWith('PageB'))
    expect(remove).not.toHaveBeenCalled()
  })
})
