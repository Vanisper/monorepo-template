import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createTitleManager, useTitle } from './index'

function createManager() {
  return createTitleManager({ appTitle: '示例应用', fallbackTitle: '无标题' })
}

describe('createTitleManager', () => {
  it('override 标题优先于 route 标题', () => {
    const manager = createManager()
    manager.setRouteTitle('用户管理')
    manager.setOverrideTitle('百度一下')
    expect(manager.finalTitle.value).toBe('百度一下 - 示例应用')
  })

  it('路由切换时清空覆盖标题', () => {
    const manager = createManager()
    manager.setOverrideTitle('百度一下')
    manager.setRouteTitle('用户管理')
    expect(manager.overrideTitle.value).toBe('')
    expect(manager.finalTitle.value).toBe('用户管理 - 示例应用')
  })

  it('传空串可显式清空覆盖标题', () => {
    const manager = createManager()
    manager.setRouteTitle('用户管理')
    manager.setOverrideTitle('百度一下')
    manager.setOverrideTitle('')
    expect(manager.overrideTitle.value).toBe('')
    expect(manager.finalTitle.value).toBe('用户管理 - 示例应用')
  })

  it('开关动态标题：关闭时始终显示应用名，重新开启后恢复合成', () => {
    const manager = createTitleManager({ appTitle: '示例应用', enableDynamicTitle: false })
    manager.setRouteTitle('用户管理')
    manager.setOverrideTitle('百度一下')
    expect(manager.finalTitle.value).toBe('示例应用')
    manager.setDynamicTitleEnabled(true)
    expect(manager.finalTitle.value).toBe('百度一下 - 示例应用')
  })

  it('各层标题都为空时回退到兜底标题', () => {
    const manager = createTitleManager({ appTitle: '', fallbackTitle: '无标题' })
    expect(manager.appTitle.value).toBe('')
    expect(manager.finalTitle.value).toBe('无标题')
  })

  it('title 支持 ref/getter 形式（如未读数标题），依赖变化时响应式更新', () => {
    const unread = ref(3)
    const manager = createTitleManager({
      appTitle: () => unread.value > 0 ? `${unread.value} 条新消息 · 示例应用` : '示例应用',
    })
    expect(manager.finalTitle.value).toBe('3 条新消息 · 示例应用')

    unread.value = 5
    expect(manager.finalTitle.value).toBe('5 条新消息 · 示例应用')

    unread.value = 0
    expect(manager.finalTitle.value).toBe('示例应用')
  })

  it('setter 替换标题源：静态值切断绑定，getter 重新建立绑定', () => {
    const unread = ref(3)
    const manager = createTitleManager({
      appTitle: () => `${unread.value} 条新消息 · 示例应用`,
    })
    expect(manager.finalTitle.value).toBe('3 条新消息 · 示例应用')

    // 传静态值：切断此前的响应式绑定
    manager.setAppTitle('管理系统')
    unread.value = 5
    expect(manager.finalTitle.value).toBe('管理系统')

    // 传 getter：重新建立响应式绑定
    manager.setAppTitle(() => `${unread.value} 条新消息 · 管理系统`)
    expect(manager.finalTitle.value).toBe('5 条新消息 · 管理系统')
  })
})

describe('useTitle', () => {
  it('将标题源同步到 document.title，依赖变化时立即更新', () => {
    // node 环境无 document，stub 一个假的
    const fakeDocument = { title: '' }
    vi.stubGlobal('document', fakeDocument)
    try {
      const name = ref('示例应用')
      useTitle(() => name.value)
      expect(fakeDocument.title).toBe('示例应用')

      name.value = '新应用'
      expect(fakeDocument.title).toBe('新应用')
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('配合 title 管理器：finalTitle 变化即同步', () => {
    const fakeDocument = { title: '' }
    vi.stubGlobal('document', fakeDocument)
    try {
      const manager = createManager()
      useTitle(manager.finalTitle)
      expect(fakeDocument.title).toBe('示例应用')

      manager.setRouteTitle('用户管理')
      expect(fakeDocument.title).toBe('用户管理 - 示例应用')
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('无 document（SSR）时为空操作，不抛错', () => {
    vi.stubGlobal('document', undefined)
    try {
      expect(() => useTitle('示例应用')).not.toThrow()
    }
    finally {
      vi.unstubAllGlobals()
    }
  })
})
