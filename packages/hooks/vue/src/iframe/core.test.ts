import type { IframeTabsState } from './core'
import { describe, expect, it } from 'vitest'
import { closeIframeTabs, EMPTY_IFRAME_STATE, markIframeLoaded, openIframeTab, removeIframeTabs } from './core'

const MAX = 2

function open(state: IframeTabsState, path: string, src = `https://${path.slice(1)}.com`): IframeTabsState {
  return openIframeTab(state, { path, src }, MAX)
}

function find(state: IframeTabsState, path: string) {
  return state.tabs.find(tab => tab.path === path)
}

describe('iframe core', () => {
  describe('openIframeTab', () => {
    it('新页签追加记录并置为打开、加载中', () => {
      const state = open(EMPTY_IFRAME_STATE, '/a')
      expect(state.tabs).toEqual([{ path: '/a', src: 'https://a.com', isOpen: true, isLoading: true }])
      expect(state.recent).toEqual(['/a'])
    })

    it('重复打开已打开且最近访问的页签：返回原状态', () => {
      const state = open(EMPTY_IFRAME_STATE, '/a')
      expect(open(state, '/a')).toBe(state)
    })

    it('重复打开已打开但非最近的页签：仅访问序变化，tabs 保持原引用', () => {
      const s1 = open(open(EMPTY_IFRAME_STATE, '/a'), '/b')
      const s2 = open(s1, '/a')
      expect(s2).not.toBe(s1)
      expect(s2.tabs).toBe(s1.tabs)
      expect(s2.recent).toEqual(['/a', '/b'])
    })

    it('已存在的记录复用，不更新 src', () => {
      const s1 = open(EMPTY_IFRAME_STATE, '/a')
      const s2 = open(closeIframeTabs(s1, '/a'), '/a', 'https://other.com')
      expect(find(s2, '/a')?.src).toBe('https://a.com')
      expect(find(s2, '/a')?.isOpen).toBe(true)
    })

    it('超出 maxOpen 时按 LRU 关闭最旧页签并复位加载态、移出访问序', () => {
      let state = open(open(EMPTY_IFRAME_STATE, '/a'), '/b')
      state = markIframeLoaded(state, '/a')
      state = open(state, '/c')

      expect(find(state, '/a')).toMatchObject({ isOpen: false, isLoading: true })
      expect(find(state, '/b')?.isOpen).toBe(true)
      expect(find(state, '/c')?.isOpen).toBe(true)
      expect(state.recent).toEqual(['/c', '/b'])
    })

    it('淘汰以最近访问序而非打开顺序为准', () => {
      let state = open(open(EMPTY_IFRAME_STATE, '/a'), '/b')
      state = open(state, '/a')
      state = open(state, '/c')
      expect(find(state, '/b')?.isOpen).toBe(false)
      expect(find(state, '/a')?.isOpen).toBe(true)
    })

    it('不可变更新：旧快照不被篡改', () => {
      const s1 = open(EMPTY_IFRAME_STATE, '/a')
      const before = find(s1, '/a')
      const s2 = closeIframeTabs(s1, '/a')
      expect(before?.isOpen).toBe(true)
      expect(find(s2, '/a')?.isOpen).toBe(false)
      expect(Object.isFrozen(s2.tabs)).toBe(true)
    })
  })

  describe('closeIframeTabs', () => {
    it('支持批量关闭并移出访问序', () => {
      const s1 = open(open(EMPTY_IFRAME_STATE, '/a'), '/b')
      const s2 = closeIframeTabs(s1, ['/a', '/b'])
      expect(s2.tabs.every(tab => !tab.isOpen)).toBe(true)
      expect(s2.recent).toEqual([])
    })

    it('未命中打开中的页签时返回原状态', () => {
      const s1 = closeIframeTabs(open(EMPTY_IFRAME_STATE, '/a'), '/a')
      expect(closeIframeTabs(s1, '/a')).toBe(s1)
      expect(closeIframeTabs(s1, '/x')).toBe(s1)
    })
  })

  describe('removeIframeTabs', () => {
    it('整体删除记录（含已关闭）', () => {
      const s1 = closeIframeTabs(open(open(EMPTY_IFRAME_STATE, '/a'), '/b'), '/a')
      const s2 = removeIframeTabs(s1, ['/a', '/b'])
      expect(s2.tabs).toEqual([])
      expect(s2.recent).toEqual([])
    })

    it('未命中时返回原状态', () => {
      const s1 = open(EMPTY_IFRAME_STATE, '/a')
      expect(removeIframeTabs(s1, '/x')).toBe(s1)
    })
  })

  describe('markIframeLoaded', () => {
    it('标记加载完成，重复标记返回原状态', () => {
      const s1 = open(EMPTY_IFRAME_STATE, '/a')
      const s2 = markIframeLoaded(s1, '/a')
      expect(find(s2, '/a')?.isLoading).toBe(false)
      expect(markIframeLoaded(s2, '/a')).toBe(s2)
      expect(markIframeLoaded(s2, '/x')).toBe(s2)
    })

    it('重新打开后加载态复位', () => {
      let state = markIframeLoaded(open(EMPTY_IFRAME_STATE, '/a'), '/a')
      state = open(closeIframeTabs(state, '/a'), '/a')
      expect(find(state, '/a')?.isLoading).toBe(true)
    })
  })
})
