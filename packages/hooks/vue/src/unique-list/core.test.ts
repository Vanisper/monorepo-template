import { describe, expect, it } from 'vitest'
import { addUnique, clearList, dedupe, removeItems } from './core'

describe('unique-list core', () => {
  describe('dedupe', () => {
    it('按首次出现顺序去重并冻结', () => {
      const list = dedupe(['x', 'x', 'y'])
      expect(list).toEqual(['x', 'y'])
      expect(Object.isFrozen(list)).toBe(true)
    })

    it('不篡改入参', () => {
      const initial = ['a', 'a']
      dedupe(initial)
      expect(initial).toEqual(['a', 'a'])
    })
  })

  describe('addUnique', () => {
    it('去重并保持插入顺序', () => {
      const a = addUnique<string>([], 'a')
      const ab = addUnique(a, ['b', 'a'])
      expect(ab).toEqual(['a', 'b'])
    })

    it('全部已存在时返回同一引用', () => {
      const list = dedupe(['a', 'b'])
      expect(addUnique(list, 'a')).toBe(list)
      expect(addUnique(list, ['a', 'b'])).toBe(list)
    })

    it('有变化时返回新的冻结数组，旧引用不变', () => {
      const list = dedupe(['a'])
      const next = addUnique(list, 'b')
      expect(next).not.toBe(list)
      expect(Object.isFrozen(next)).toBe(true)
      expect(list).toEqual(['a'])
    })

    it('空串、null、undefined、NaN 都是合法元素', () => {
      const list = dedupe<unknown>(['', null, undefined, Number.NaN])
      expect(list).toEqual(['', null, undefined, Number.NaN])
      expect(addUnique(list, null)).toBe(list)
      expect(addUnique(list, undefined)).toBe(list)
      expect(addUnique(list, Number.NaN)).toBe(list)
    })
  })

  describe('removeItems', () => {
    it('支持批量移除', () => {
      const list = dedupe(['a', 'b', 'c'])
      expect(removeItems(list, ['a', 'c'])).toEqual(['b'])
    })

    it('未命中时返回同一引用', () => {
      const list = dedupe(['a'])
      expect(removeItems(list, 'x')).toBe(list)
    })

    it('可移除 NaN', () => {
      const list = dedupe([1, Number.NaN])
      expect(removeItems(list, Number.NaN)).toEqual([1])
    })
  })

  describe('clearList', () => {
    it('非空时返回空列表，已空时返回同一引用', () => {
      const list = dedupe(['a'])
      const empty = clearList(list)
      expect(empty).toEqual([])
      expect(clearList(empty)).toBe(empty)
    })
  })
})
