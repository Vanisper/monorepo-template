import { describe, expect, it } from 'vitest'
import { createTitleCore } from './core'

describe('createTitleCore', () => {
  it('override > route > app 三级合成', () => {
    const core = createTitleCore({ appTitle: '示例应用' })
    core.setRouteTitle('用户管理')
    core.setOverrideTitle('百度一下')
    expect(core.getFinalTitle()).toBe('百度一下 - 示例应用')
  })

  it('各层都为空时回退到兜底标题', () => {
    const core = createTitleCore({ appTitle: '', fallbackTitle: '无标题' })
    expect(core.getFinalTitle()).toBe('无标题')
  })

  it('关闭动态标题后只显示应用名', () => {
    const core = createTitleCore({ appTitle: '示例应用', enableDynamicTitle: false })
    core.setRouteTitle('用户管理')
    core.setOverrideTitle('百度一下')
    expect(core.getFinalTitle()).toBe('示例应用')
  })

  it('setRouteTitle 清空覆盖标题', () => {
    const core = createTitleCore({ appTitle: '示例应用' })
    core.setOverrideTitle('百度一下')
    core.setRouteTitle('用户管理')
    expect(core.getOverrideTitle()).toBe('')
    expect(core.getFinalTitle()).toBe('用户管理 - 示例应用')
  })

  it('getter 标题源每次求值读最新值', () => {
    let label = '列表'
    const core = createTitleCore({ appTitle: () => label })
    expect(core.getAppTitle()).toBe('列表')
    label = '列表（2 条未读）'
    expect(core.getAppTitle()).toBe('列表（2 条未读）')
  })

  it('变更检测：源替换算变化，重复设同值不算', () => {
    const core = createTitleCore({ appTitle: 'A' })
    expect(core.setAppTitle('A')).toBe(false)
    expect(core.setAppTitle('B')).toBe(true)
    expect(core.setDynamicTitleEnabled(true)).toBe(false)
    expect(core.setDynamicTitleEnabled(false)).toBe(true)
    expect(core.setOverrideTitle('')).toBe(false)
  })

  it('setRouteTitle 对覆盖标题的清空也算变化', () => {
    const core = createTitleCore({ appTitle: 'A' })
    core.setOverrideTitle('覆盖')
    // route 源相同，但覆盖被清空
    expect(core.setRouteTitle('')).toBe(true)
    expect(core.setRouteTitle('')).toBe(false)
  })
})
