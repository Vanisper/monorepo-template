import { describe, expect, it } from 'vitest'
import { createUniqueList } from './index'

describe('createUniqueList', () => {
  it('add 去重并保持插入顺序', () => {
    const manager = createUniqueList()
    manager.add('a')
    manager.add(['b', 'a'])
    expect(manager.list.value).toEqual(['a', 'b'])
  })

  it('add 过滤空字符串', () => {
    const manager = createUniqueList()
    manager.add(['', 'a'])
    expect(manager.list.value).toEqual(['a'])
  })

  it('remove 支持批量', () => {
    const manager = createUniqueList(['a', 'b', 'c'])
    manager.remove(['a', 'c'])
    expect(manager.list.value).toEqual(['b'])
  })

  it('clear 清空列表', () => {
    const manager = createUniqueList(['a', 'b'])
    manager.clear()
    expect(manager.list.value).toEqual([])
  })

  it('接收初始列表', () => {
    const manager = createUniqueList(['x', 'x', 'y'])
    expect(manager.list.value).toEqual(['x', 'y'])
  })
})
