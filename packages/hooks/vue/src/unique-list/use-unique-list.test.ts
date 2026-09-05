import { describe, expect, it, vi } from 'vitest'
import { computed, nextTick, watch } from 'vue'
import { useUniqueList } from './use-unique-list'

describe('useUniqueList', () => {
  it('基本增删查', () => {
    const { list, has, add, remove, clear } = useUniqueList(['a'])
    expect(list.value).toEqual(['a'])

    expect(add(['b', 'a'])).toBe(true)
    expect(list.value).toEqual(['a', 'b'])
    expect(has('b')).toBe(true)

    expect(remove('a')).toBe(true)
    expect(list.value).toEqual(['b'])

    expect(clear()).toBe(true)
    expect(list.value).toEqual([])
    expect(has('b')).toBe(false)
  })

  it('初始列表仅为种子：去重拷贝，外部改动不穿透', () => {
    const initial = ['x', 'x', 'y']
    const { list } = useUniqueList(initial)
    expect(list.value).toEqual(['x', 'y'])

    initial.push('z')
    expect(list.value).toEqual(['x', 'y'])
  })

  it('无实际变化的操作返回 false，且不触发响应式更新', async () => {
    const { list, add, remove, clear } = useUniqueList(['a'])
    const spy = vi.fn()
    watch(list, spy)

    expect(add('a')).toBe(false)
    expect(remove('x')).toBe(false)
    await nextTick()
    expect(spy).not.toHaveBeenCalled()

    expect(add('b')).toBe(true)
    await nextTick()
    expect(spy).toHaveBeenCalledTimes(1)

    clear()
    expect(clear()).toBe(false)
  })

  it('有实际变化时更换引用，computed 随之重算', () => {
    const { list, add } = useUniqueList(['a'])
    const size = computed(() => list.value.length)
    const before = list.value

    add('b')
    expect(list.value).not.toBe(before)
    expect(size.value).toBe(2)
  })

  it('list 只读：直接赋值被拒绝', () => {
    const { list } = useUniqueList(['a'])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // @ts-expect-error 只读 ref 不允许写入
    list.value = []
    expect(list.value).toEqual(['a'])
    warn.mockRestore()
  })

  it('has 对 NaN 同样命中', () => {
    const { has } = useUniqueList<number>([Number.NaN])
    expect(has(Number.NaN)).toBe(true)
  })
})
