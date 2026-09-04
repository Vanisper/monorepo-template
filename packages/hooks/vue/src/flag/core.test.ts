import { describe, expect, it } from 'vitest'
import { createFlagCore } from './core'

describe('createFlagCore', () => {
  it('默认初始为 false，传值可指定初始状态', () => {
    expect(createFlagCore().get()).toBe(false)
    expect(createFlagCore(true).get()).toBe(true)
  })

  it('toggle 翻转，传 boolean 时置为指定值，重复同值不算变化', () => {
    const core = createFlagCore()
    expect(core.toggle()).toBe(true)
    expect(core.get()).toBe(true)
    expect(core.toggle(false)).toBe(true)
    expect(core.get()).toBe(false)
    expect(core.toggle(true)).toBe(true)

    expect(core.toggle(true)).toBe(false)
    expect(core.get()).toBe(true)
  })

  it('reset 重置为创建时的初始状态', () => {
    const core = createFlagCore(true)
    core.toggle(false)
    expect(core.reset()).toBe(true)
    expect(core.get()).toBe(true)
    expect(core.reset()).toBe(false)
  })
})
