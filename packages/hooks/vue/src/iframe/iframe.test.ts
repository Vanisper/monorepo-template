import { describe, expect, it } from 'vitest'
import { createIframeManager } from './index'

describe('createIframeManager', () => {
  it('open 新建记录并标记加载中', () => {
    const manager = createIframeManager(3)
    manager.open({ path: '/a', src: 'https://a.com' })
    expect(manager.list.value).toHaveLength(1)
    const record = manager.list.value[0]!
    expect(record.isOpen).toBe(true)
    expect(record.isLoading).toBe(true)
    expect(manager.openedList.value).toHaveLength(1)
  })

  it('open 已存在路径时复用记录', () => {
    const manager = createIframeManager(3)
    manager.open({ path: '/a', src: 'https://a.com' })
    manager.open({ path: '/a', src: 'https://a.com' })
    expect(manager.list.value).toHaveLength(1)
  })

  it('closeLoading 标记加载完成', () => {
    const manager = createIframeManager(3)
    manager.open({ path: '/a', src: 'https://a.com' })
    manager.closeLoading('/a')
    expect(manager.list.value[0]!.isLoading).toBe(false)
  })

  it('lRU：超过 maxCache 时关闭最早访问的页签', () => {
    const manager = createIframeManager(2)
    manager.open({ path: '/a', src: 'https://a.com' })
    manager.open({ path: '/b', src: 'https://b.com' })
    // 重新访问 a，使 b 成为最旧
    manager.open({ path: '/a', src: 'https://a.com' })
    manager.open({ path: '/c', src: 'https://c.com' })

    const states = new Map(manager.list.value.map(r => [r.path, r.isOpen]))
    expect(states.get('/a')).toBe(true)
    expect(states.get('/b')).toBe(false)
    expect(states.get('/c')).toBe(true)
    expect(manager.openedList.value).toHaveLength(2)
  })

  it('close 支持批量并移出最近访问序', () => {
    const manager = createIframeManager(2)
    manager.open({ path: '/a', src: 'https://a.com' })
    manager.open({ path: '/b', src: 'https://b.com' })
    manager.open({ path: '/c', src: 'https://c.com' })
    // 上一步 LRU 已关闭 a；重新打开 a 后 b、c 中最旧的 b 被关闭
    manager.open({ path: '/a', src: 'https://a.com' })

    manager.close(['/a', '/b'])
    expect(manager.openedList.value.map(r => r.path)).toEqual(['/c'])
    // a 已移出最近访问序，再开两个不会触发对 a 的 LRU 关闭
    manager.open({ path: '/b', src: 'https://b.com' })
    manager.open({ path: '/d', src: 'https://d.com' })
    const a = manager.list.value.find(r => r.path === '/a')!
    expect(a.isOpen).toBe(false)
  })

  it('close 后重新打开会复位加载态', () => {
    const manager = createIframeManager(3)
    manager.open({ path: '/a', src: 'https://a.com' })
    manager.closeLoading('/a')
    expect(manager.list.value[0]!.isLoading).toBe(false)
    manager.close('/a')
    manager.open({ path: '/a', src: 'https://a.com' })
    expect(manager.list.value[0]!.isLoading).toBe(true)
  })
})
