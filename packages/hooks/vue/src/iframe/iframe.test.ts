import { describe, expect, it } from 'vitest'
import { ref, watch } from 'vue'
import { createIframeManager } from './iframe'

describe('createIframeManager', () => {
  it('list / openedList 投影 core 快照', () => {
    const manager = createIframeManager(3)
    manager.open({ path: '/a', src: 'https://a.com' })
    manager.open({ path: '/b', src: 'https://b.com' })
    manager.close('/a')

    expect(manager.list.value.map(r => r.path)).toEqual(['/a', '/b'])
    expect(manager.openedList.value.map(r => r.path)).toEqual(['/b'])
  })

  it('title 的 Ref 形态归一为 getter，响应式源变化可实时取到', () => {
    const unread = ref(3)
    const manager = createIframeManager(3)
    manager.open({ path: '/a', src: 'https://a.com', title: () => `未读 ${unread.value}` })

    const record = manager.list.value[0]!
    const title = record.title as () => string
    expect(title()).toBe('未读 3')

    unread.value = 5
    expect(title()).toBe('未读 5')
  })

  it('有实际变化才替换 list 引用', () => {
    const manager = createIframeManager(3)
    manager.open({ path: '/a', src: 'https://a.com' })

    const seen: Array<readonly unknown[]> = []
    const stop = watch(manager.list, (value) => {
      seen.push(value)
    }, { flush: 'sync' })

    manager.open({ path: '/a', src: 'https://a.com' })
    manager.open({ path: '/b', src: 'https://b.com' })
    stop()

    expect(seen).toHaveLength(1)
    expect(seen[0]).toEqual([manager.list.value[0]!, manager.list.value[1]!])
  })
})
