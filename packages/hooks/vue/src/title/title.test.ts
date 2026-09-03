import { describe, expect, it, vi } from 'vitest'
import { createTitleManager } from './index'

// node 环境无 document，stub 一个假的
const fakeDocument = { title: '' }
vi.stubGlobal('document', fakeDocument)

function createManager() {
  return createTitleManager({ appTitle: '示例应用', fallbackTitle: '无标题' })
}

describe('createTitleManager', () => {
  it('override 标题优先于 route 标题', () => {
    const manager = createManager()
    manager.setRouteTitle('用户管理')
    manager.setOverrideTitle('百度一下')
    expect(manager.finalTitle.value).toBe('百度一下 - 示例应用')
    expect(fakeDocument.title).toBe('百度一下 - 示例应用')
  })

  it('路由切换时清空覆盖标题', () => {
    const manager = createManager()
    manager.setOverrideTitle('百度一下')
    manager.setRouteTitle('用户管理')
    expect(manager.overrideTitle.value).toBe('')
    expect(manager.finalTitle.value).toBe('用户管理 - 示例应用')
  })

  it('关闭动态标题时始终显示应用名', () => {
    const manager = createTitleManager({ appTitle: '示例应用', enableDynamic: false })
    manager.setRouteTitle('用户管理')
    manager.setOverrideTitle('百度一下')
    expect(manager.finalTitle.value).toBe('示例应用')
  })

  it('应用名为空时使用兜底标题', () => {
    const manager = createTitleManager({ appTitle: '', fallbackTitle: '无标题' })
    expect(manager.appTitle.value).toBe('无标题')
  })
})
