import { describe, expect, it } from 'vitest'
import { createIframeCore } from './core'

describe('createIframeCore', () => {
  it('open 新建记录并标记加载中', () => {
    const core = createIframeCore(3)
    expect(core.open({ path: '/a', src: 'https://a.com' })).toBe(true)
    expect(core.getList()).toHaveLength(1)
    const record = core.getList()[0]!
    expect(record.isOpen).toBe(true)
    expect(record.isLoading).toBe(true)
    expect(core.getOpenedList()).toHaveLength(1)
  })

  it('open 已存在路径时复用记录，不更新 src/title', () => {
    const core = createIframeCore(3)
    core.open({ path: '/a', src: 'https://a.com', title: 'A' })
    core.open({ path: '/a', src: 'https://changed.com', title: 'B' })
    expect(core.getList()).toHaveLength(1)
    expect(core.getList()[0]!.src).toBe('https://a.com')
    expect(core.getList()[0]!.title).toBe('A')
  })

  it('重复打开已打开的页签不算对外变化，快照保持同一引用', () => {
    const core = createIframeCore(3)
    core.open({ path: '/a', src: 'https://a.com' })
    const snapshot = core.getList()
    expect(core.open({ path: '/a', src: 'https://a.com' })).toBe(false)
    expect(core.getList()).toBe(snapshot)
  })

  it('markLoaded 标记加载完成，重复标记不算变化', () => {
    const core = createIframeCore(3)
    core.open({ path: '/a', src: 'https://a.com' })
    expect(core.markLoaded('/a')).toBe(true)
    expect(core.getList()[0]!.isLoading).toBe(false)
    expect(core.markLoaded('/a')).toBe(false)
    expect(core.markLoaded('/missing')).toBe(false)
  })

  it('lRU：超过 maxCache 时关闭最早访问的页签', () => {
    const core = createIframeCore(2)
    core.open({ path: '/a', src: 'https://a.com' })
    core.open({ path: '/b', src: 'https://b.com' })
    // 重新访问 a，使 b 成为最旧
    core.open({ path: '/a', src: 'https://a.com' })
    core.open({ path: '/c', src: 'https://c.com' })

    const states = new Map(core.getList().map(r => [r.path, r.isOpen]))
    expect(states.get('/a')).toBe(true)
    expect(states.get('/b')).toBe(false)
    expect(states.get('/c')).toBe(true)
    expect(core.getOpenedList().map(r => r.path)).toEqual(['/a', '/c'])
  })

  it('lRU 关闭的页签复位加载态', () => {
    const core = createIframeCore(1)
    core.open({ path: '/a', src: 'https://a.com' })
    core.markLoaded('/a')
    core.open({ path: '/b', src: 'https://b.com' })
    const closed = core.getList().find(r => r.path === '/a')!
    expect(closed.isOpen).toBe(false)
    expect(closed.isLoading).toBe(true)
  })

  it('close 支持批量并移出最近访问序', () => {
    const core = createIframeCore(2)
    core.open({ path: '/a', src: 'https://a.com' })
    core.open({ path: '/b', src: 'https://b.com' })
    core.open({ path: '/c', src: 'https://c.com' })
    // 上一步 LRU 已关闭 a；重新打开 a 后 b、c 中最旧的 b 被关闭
    core.open({ path: '/a', src: 'https://a.com' })

    expect(core.close(['/a', '/b'])).toBe(true)
    expect(core.getOpenedList().map(r => r.path)).toEqual(['/c'])
    // a 已移出最近访问序，再开两个不会触发对 a 的 LRU 关闭
    core.open({ path: '/b', src: 'https://b.com' })
    core.open({ path: '/d', src: 'https://d.com' })
    const a = core.getList().find(r => r.path === '/a')!
    expect(a.isOpen).toBe(false)
  })

  it('close 关闭未打开的页签不算变化', () => {
    const core = createIframeCore(3)
    core.open({ path: '/a', src: 'https://a.com' })
    expect(core.close('/a')).toBe(true)
    expect(core.close('/a')).toBe(false)
    expect(core.close('/missing')).toBe(false)
  })

  it('close 后重新打开会复位加载态', () => {
    const core = createIframeCore(3)
    core.open({ path: '/a', src: 'https://a.com' })
    core.markLoaded('/a')
    expect(core.getList()[0]!.isLoading).toBe(false)
    core.close('/a')
    core.open({ path: '/a', src: 'https://a.com' })
    expect(core.getList()[0]!.isLoading).toBe(true)
  })

  it('title 支持 getter 动态计算', () => {
    let label = '列表'
    const core = createIframeCore(3)
    core.open({ path: '/a', src: 'https://a.com', title: () => label })
    const record = core.getList()[0]!
    const title = record.title as () => string
    expect(title()).toBe('列表')

    label = '列表（2 条未读）'
    expect(title()).toBe('列表（2 条未读）')
  })

  it('快照已冻结，未被变更的记录对象保持旧引用', () => {
    const core = createIframeCore(3)
    core.open({ path: '/a', src: 'https://a.com' })
    const before = core.getList()
    expect(Object.isFrozen(before)).toBe(true)

    core.open({ path: '/b', src: 'https://b.com' })
    const after = core.getList()
    expect(after).not.toBe(before)
    expect(after[0]).toBe(before[0])
    expect(after[1]!.path).toBe('/b')
  })
})
