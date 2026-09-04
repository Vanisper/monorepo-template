import { describe, expect, it } from 'vitest'
import { watch } from 'vue'
import { createUniqueList } from './unique-list'

describe('createUniqueList', () => {
  it('add 去重并保持插入顺序', () => {
    const manager = createUniqueList()
    manager.add('a')
    manager.add(['b', 'a'])
    expect(manager.list.value).toEqual(['a', 'b'])
  })

  it('空串、null、undefined 都是合法元素', () => {
    const manager = createUniqueList<string | null | undefined>()
    manager.add(['', null, undefined])
    expect(manager.list.value).toEqual(['', null, undefined])
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

  it('有实际变化才替换 list 引用', () => {
    const manager = createUniqueList(['a'])
    const seen: Array<readonly string[]> = []
    watch(manager.list, (value) => {
      seen.push(value)
    }, { flush: 'sync' })

    manager.add('b')
    manager.add('b')
    expect(seen).toEqual([['a', 'b']])
  })
})
