import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { usePageTitle } from './use-page-title'

function createTitle() {
  return usePageTitle({ appTitle: '示例应用', fallbackTitle: '无标题' })
}

describe('usePageTitle', () => {
  it('override 标题优先于 route 标题', () => {
    const title = createTitle()
    title.setRouteTitle('用户管理')
    title.setOverrideTitle('百度一下')
    expect(title.finalTitle.value).toBe('百度一下 - 示例应用')
  })

  it('路由切换时清空覆盖标题', () => {
    const title = createTitle()
    title.setOverrideTitle('百度一下')
    title.setRouteTitle('用户管理')
    expect(title.overrideTitle.value).toBe('')
    expect(title.finalTitle.value).toBe('用户管理 - 示例应用')
  })

  it('传空串可显式清空覆盖标题', () => {
    const title = createTitle()
    title.setRouteTitle('用户管理')
    title.setOverrideTitle('百度一下')
    title.setOverrideTitle('')
    expect(title.finalTitle.value).toBe('用户管理 - 示例应用')
  })

  it('各层标题都为空时回退到兜底标题', () => {
    const title = usePageTitle({ appTitle: '', fallbackTitle: '无标题' })
    expect(title.appTitle.value).toBe('')
    expect(title.finalTitle.value).toBe('无标题')
  })

  it('dynamic 为可写 ref：关闭后只显示主标题，重新开启恢复合成', () => {
    const title = usePageTitle({ appTitle: '示例应用', dynamic: false })
    title.setRouteTitle('用户管理')
    expect(title.finalTitle.value).toBe('示例应用')

    title.dynamic.value = true
    expect(title.finalTitle.value).toBe('用户管理 - 示例应用')
  })

  it('dynamic 传 Ref 时借用该 ref：外部改动直接生效', () => {
    const dynamic = ref(true)
    const title = usePageTitle({ appTitle: '示例应用', dynamic })
    title.setRouteTitle('用户管理')

    dynamic.value = false
    expect(title.finalTitle.value).toBe('示例应用')
    expect(title.dynamic).toBe(dynamic)
  })

  it('标题源支持 Ref / getter：依赖变化时响应式更新', () => {
    const unread = ref(3)
    const title = usePageTitle({
      appTitle: () => unread.value > 0 ? `${unread.value} 条新消息 · 示例应用` : '示例应用',
    })
    expect(title.finalTitle.value).toBe('3 条新消息 · 示例应用')

    unread.value = 0
    expect(title.finalTitle.value).toBe('示例应用')

    const routeName = ref('用户管理')
    title.setRouteTitle(routeName)
    expect(title.finalTitle.value).toBe('用户管理 - 示例应用')
    routeName.value = '角色管理'
    expect(title.finalTitle.value).toBe('角色管理 - 示例应用')
  })

  it('setter 替换标题源：静态值切断绑定，getter 重新建立绑定，且不回写外部 ref', () => {
    const external = ref('外部标题')
    const title = usePageTitle({ appTitle: external })
    expect(title.finalTitle.value).toBe('外部标题')

    title.setAppTitle('管理系统')
    external.value = '外部标题已改'
    expect(title.finalTitle.value).toBe('管理系统')
    expect(external.value).toBe('外部标题已改')

    title.setAppTitle(() => `${external.value}!`)
    expect(title.finalTitle.value).toBe('外部标题已改!')
  })
})
