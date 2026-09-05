// @vitest-environment happy-dom
import type { Router } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, KeepAlive, nextTick, onMounted, onUnmounted } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { useUniqueList } from '../unique-list/use-unique-list'
import { useKeepAliveGuard } from './use-keep-alive-guard'

/**
 * 用真实 <KeepAlive> 验证守卫的核心保证：
 * - keep: true 的路由再次进入时复用实例（不重新挂载）
 * - keep: false 的路由每次进入都重新挂载
 */

const counters = { mounted: {} as Record<string, number>, unmounted: {} as Record<string, number> }

function definePage(name: string) {
  return defineComponent({
    name,
    setup() {
      onMounted(() => {
        counters.mounted[name] = (counters.mounted[name] ?? 0) + 1
      })
      onUnmounted(() => {
        counters.unmounted[name] = (counters.unmounted[name] ?? 0) + 1
      })
      return () => h('div', name)
    },
  })
}

const PageKeep = definePage('PageKeep')
const PageFresh = definePage('PageFresh')
const PageOther = definePage('PageOther')

function mountApp(): { router: Router, root: HTMLElement } {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'other', component: PageOther },
      { path: '/keep', name: 'keep', component: PageKeep, meta: { keepAlive: true } },
      { path: '/fresh', name: 'fresh', component: PageFresh, meta: { keepAlive: false } },
    ],
  })

  const include = useUniqueList<string>()
  useKeepAliveGuard(router, { include })

  const App = defineComponent({
    setup() {
      return () => h(RouterView, null, {
        default: ({ Component }: { Component: unknown }) =>
          h(KeepAlive, { include: include.list.value as string[] }, Component ? [h(Component as object)] : []),
      })
    },
  })

  const root = document.createElement('div')
  document.body.appendChild(root)
  createApp(App).use(router).mount(root)
  return { router, root }
}

async function navigate(router: Router, path: string): Promise<void> {
  await router.push(path)
  // afterEach 中的 add 触发 KeepAlive 重新渲染并缓存，需再等一轮 tick 落定
  await nextTick()
}

describe('useKeepAliveGuard 与真实 <KeepAlive>', () => {
  beforeEach(() => {
    counters.mounted = {}
    counters.unmounted = {}
    document.body.innerHTML = ''
  })

  it('keep: true 的路由再次进入时复用实例', async () => {
    const { router, root } = mountApp()
    await navigate(router, '/keep')
    expect(root.textContent).toBe('PageKeep')
    expect(counters.mounted.PageKeep).toBe(1)

    await navigate(router, '/')
    await navigate(router, '/keep')
    expect(root.textContent).toBe('PageKeep')
    expect(counters.mounted.PageKeep).toBe(1)
    expect(counters.unmounted.PageKeep).toBeUndefined()
  })

  it('keep: false 的路由每次进入都重新挂载，且旧实例被真正卸载（不留孤儿）', async () => {
    const { router, root } = mountApp()
    await navigate(router, '/fresh')
    expect(counters.mounted.PageFresh).toBe(1)

    await navigate(router, '/')
    await navigate(router, '/fresh')
    expect(root.textContent).toBe('PageFresh')
    expect(counters.mounted.PageFresh).toBe(2)
    expect(counters.unmounted.PageFresh).toBe(1)

    await navigate(router, '/')
    await navigate(router, '/fresh')
    expect(counters.mounted.PageFresh).toBe(3)
    expect(counters.unmounted.PageFresh).toBe(2)
  })

  it('无 meta 的路由：从非白名单路由进入时重新挂载', async () => {
    const { router } = mountApp()
    await navigate(router, '/')
    await navigate(router, '/keep')
    await navigate(router, '/')
    expect(counters.mounted.PageOther).toBe(2)
  })
})
