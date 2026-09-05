import { describe, expect, it } from 'vitest'
import { composeTitle } from './core'

describe('composeTitle', () => {
  it('override 优先于 route', () => {
    expect(composeTitle({ app: '示例应用', route: '用户管理', override: '百度一下' })).toBe('百度一下 - 示例应用')
  })

  it('无 override 时使用 route', () => {
    expect(composeTitle({ app: '示例应用', route: '用户管理' })).toBe('用户管理 - 示例应用')
  })

  it('各层都为空时使用兜底', () => {
    expect(composeTitle({ app: '', fallback: '无标题' })).toBe('无标题')
  })

  it('兜底只在主标题为空时出场，不干扰其他层的清空语义', () => {
    expect(composeTitle({ app: '示例应用', route: '', fallback: '无标题' })).toBe('示例应用')
  })

  it('关闭动态标题后只显示主标题', () => {
    expect(composeTitle({ app: '示例应用', route: '用户管理', override: '百度一下', dynamic: false })).toBe('示例应用')
  })

  it('主标题与兜底都为空时不带分隔符', () => {
    expect(composeTitle({ app: '', route: '用户管理' })).toBe('用户管理')
  })

  it('自定义分隔符', () => {
    expect(composeTitle({ app: 'App', route: 'Page', separator: ' | ' })).toBe('Page | App')
  })
})
