import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
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

  it('title 支持 ref/getter 形式，依赖变化时响应式更新', () => {
    const name = ref('示例应用')
    const manager = createTitleManager({ appTitle: () => name.value, fallbackTitle: '无标题' })
    expect(manager.finalTitle.value).toBe('示例应用')
    name.value = '新应用'
    expect(manager.finalTitle.value).toBe('新应用')
    expect(fakeDocument.title).toBe('新应用')
  })
})
