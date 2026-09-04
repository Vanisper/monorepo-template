import { describe, expect, it } from 'vitest'
import { createUniqueListCore } from './core'

describe('createUniqueListCore', () => {
  it('add 去重并保持插入顺序', () => {
    const core = createUniqueListCore()
    expect(core.add('a')).toBe(true)
    expect(core.add(['b', 'a'])).toBe(true)
    expect(core.getList()).toEqual(['a', 'b'])
    expect(core.add('b')).toBe(false)
  })

  it('空串、null、undefined、NaN 都是合法元素', () => {
    const core = createUniqueListCore(['', null, undefined, Number.NaN])
    expect(core.getList()).toEqual(['', null, undefined, Number.NaN])

    expect(core.add(null)).toBe(false)
    expect(core.add(undefined)).toBe(false)
    expect(core.add(Number.NaN)).toBe(false)

    expect(core.has('')).toBe(true)
    expect(core.has(null)).toBe(true)
    expect(core.has(undefined)).toBe(true)
    expect(core.has(Number.NaN)).toBe(true)
  })

  it('remove 支持批量，未命中时不视为变化', () => {
    const core = createUniqueListCore(['a', 'b', 'c'])
    expect(core.remove(['a', 'c'])).toBe(true)
    expect(core.getList()).toEqual(['b'])
    expect(core.remove('x')).toBe(false)
  })

  it('clear 清空列表', () => {
    const core = createUniqueListCore(['a', 'b'])
    expect(core.getSize()).toBe(2)
    expect(core.clear()).toBe(true)
    expect(core.getList()).toEqual([])
    expect(core.getSize()).toBe(0)
    expect(core.clear()).toBe(false)
  })

  it('接收初始列表并去重', () => {
    const core = createUniqueListCore(['x', 'x', 'y'])
    expect(core.getList()).toEqual(['x', 'y'])
    expect(core.getSize()).toBe(2)
    expect(core.has('x')).toBe(true)
    expect(core.has('z')).toBe(false)
  })

  it('传入的数组不会被篡改', () => {
    const initial = ['a', 'b']
    const toAdd = ['c', 'a']
    const toRemove = ['b']
    const core = createUniqueListCore(initial)

    core.add(toAdd)
    core.remove(toRemove)

    expect(initial).toEqual(['a', 'b'])
    expect(toAdd).toEqual(['c', 'a'])
    expect(toRemove).toEqual(['b'])
    expect(core.getList()).toEqual(['a', 'c'])

    initial.push('z')
    toAdd.push('w')
    expect(core.getList()).toEqual(['a', 'c'])
    expect(core.has('z')).toBe(false)
    expect(core.has('w')).toBe(false)

    core.clear()
    expect(initial).toEqual(['a', 'b', 'z'])
    expect(toAdd).toEqual(['c', 'a', 'w'])
  })

  it('基本的增删改查', () => {
    const core = createUniqueListCore(['a'])
    expect(core.getList()).toEqual(['a'])
    expect(core.getSize()).toBe(1)
    expect(core.has('a')).toBe(true)
    expect(core.has('b')).toBe(false)

    expect(core.add(['b', 'c'])).toBe(true)
    expect(core.getList()).toEqual(['a', 'b', 'c'])
    expect(core.getSize()).toBe(3)
    expect(core.has('c')).toBe(true)

    expect(core.remove('b')).toBe(true)
    expect(core.getList()).toEqual(['a', 'c'])
    expect(core.has('b')).toBe(false)

    expect(core.clear()).toBe(true)
    expect(core.getList()).toEqual([])
    expect(core.getSize()).toBe(0)
    expect(core.has('a')).toBe(false)
  })

  it('list 冻结，未变更时保持同一引用', () => {
    const core = createUniqueListCore(['a'])
    const snapshot = core.getList()
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(() => {
      // ! 强行作为可写数组 push
      (snapshot as string[]).push('b')
    }).toThrow()
    expect(core.getList()).toBe(snapshot)

    expect(core.add('a')).toBe(false)
    expect(core.getList()).toBe(snapshot)

    expect(core.add('b')).toBe(true)
    expect(core.getList()).not.toBe(snapshot)
    expect(core.getList()).toEqual(['a', 'b'])
  })
})
