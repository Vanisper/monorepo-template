import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref, watch } from 'vue'
import { useToggle } from './use-toggle'

describe('useToggle', () => {
  describe('拥有形态：传 boolean 返回 [ref, toggle]', () => {
    it('默认 false，toggle 取反并返回新值', () => {
      const [state, toggle] = useToggle()
      expect(state.value).toBe(false)
      expect(toggle()).toBe(true)
      expect(state.value).toBe(true)
    })

    it('传 boolean 时置为指定值', () => {
      const [state, toggle] = useToggle(true)
      toggle(true)
      expect(state.value).toBe(true)
      toggle(false)
      expect(state.value).toBe(false)
    })

    it('非 boolean 入参视为未传：事件对象不会被当成值', () => {
      const [state, toggle] = useToggle(false)
      toggle({ type: 'click' })
      expect(state.value).toBe(true)
    })

    it('直接写 ref 与 toggle 作用于同一存放处', () => {
      const [state, toggle] = useToggle(false)
      state.value = true
      expect(toggle()).toBe(false)
    })
  })

  describe('借用形态：传 Ref 只返回 toggle', () => {
    it('直接翻转调用方的 ref，不创建镜像', () => {
      const visible = ref(false)
      const toggle = useToggle(visible)
      expect(typeof toggle).toBe('function')

      toggle()
      expect(visible.value).toBe(true)
      toggle(false)
      expect(visible.value).toBe(false)
    })

    it('调用方直接改 ref 后 toggle 基于最新值取反', () => {
      const visible = ref(false)
      const toggle = useToggle(visible)
      visible.value = true
      expect(toggle()).toBe(false)
    })
  })

  it('变化回调由调用方在 ref 上 watch：无论经 toggle 还是直接赋值都触发', async () => {
    const [state, toggle] = useToggle(false)
    const spy = vi.fn()
    watch(state, spy)

    toggle()
    await nextTick()
    state.value = false
    await nextTick()
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
