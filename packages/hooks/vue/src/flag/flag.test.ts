import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { createFlag } from './index'

describe('createFlag', () => {
  it('默认初始为 false，传值可指定初始状态', () => {
    expect(createFlag().flag.value).toBe(false)
    expect(createFlag(true).flag.value).toBe(true)
  })

  it('toggle 翻转，传 boolean 时置为指定值', () => {
    const manager = createFlag()
    manager.toggle()
    expect(manager.flag.value).toBe(true)
    manager.toggle(false)
    expect(manager.flag.value).toBe(false)
    manager.toggle(true)
    expect(manager.flag.value).toBe(true)
  })

  it('reset 重置为创建时的初始状态', () => {
    const manager = createFlag(true)
    manager.toggle(false)
    expect(manager.flag.value).toBe(false)
    manager.reset()
    expect(manager.flag.value).toBe(true)
  })

  it('status 缺省同 flag，提供 createStatus 时为派生值', () => {
    const plain = createFlag(false)
    expect(plain.status.value).toBe(false)

    const derived = createFlag(false, {
      createStatus: flag => !flag.value,
    })
    expect(derived.status.value).toBe(true)
  })

  it('afterChange 在 toggle 时触发，reset 不触发', () => {
    const afterChange = vi.fn()
    const manager = createFlag(false, { afterChange })
    manager.toggle()
    manager.toggle(false)
    expect(afterChange).toHaveBeenCalledTimes(2)
    expect(afterChange).toHaveBeenLastCalledWith(false, expect.anything())

    afterChange.mockClear()
    manager.reset()
    expect(afterChange).not.toHaveBeenCalled()
  })

  it('init 传 Ref 时单向同步：源变化更新 flag，flag 变化不回写源', async () => {
    const source = ref(false)
    const manager = createFlag(source)

    source.value = true
    await nextTick()
    expect(manager.flag.value).toBe(true)

    manager.toggle(false)
    expect(source.value).toBe(true)
  })
})
