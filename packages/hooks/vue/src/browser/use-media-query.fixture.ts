import { vi } from 'vitest'

type MediaQueryListener = (event: MediaQueryListEvent) => void

/** 测试夹具：最小 matchMedia 假实现 */
export interface FakeMediaQueryWindow {
  window: Window
  /** 手动触发 change 事件 */
  change: (matches: boolean) => void
  /** 当前挂着的监听数量 */
  readonly listenerCount: number
}

export function fakeWindow(initialMatches: boolean): FakeMediaQueryWindow {
  const listeners = new Set<MediaQueryListener>()
  const mediaQuery = {
    matches: initialMatches,
    addEventListener: (_: string, listener: MediaQueryListener) => listeners.add(listener),
    removeEventListener: (_: string, listener: MediaQueryListener) => listeners.delete(listener),
  }
  return {
    window: { matchMedia: vi.fn(() => mediaQuery) } as unknown as Window,
    change(matches) {
      mediaQuery.matches = matches
      for (const listener of listeners) {
        listener({ matches } as MediaQueryListEvent)
      }
    },
    get listenerCount() {
      return listeners.size
    },
  }
}
