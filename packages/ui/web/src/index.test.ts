import { describe, expect, it } from 'vitest'
import { renderButtonLabel } from './index'

describe('renderButtonLabel', () => {
  it('默认渲染按钮文本', () => {
    expect(renderButtonLabel({ label: '确定' })).toBe('确定')
  })

  it('禁用态带前缀', () => {
    expect(renderButtonLabel({ label: '确定', disabled: true })).toBe('[禁用] 确定')
  })
})
