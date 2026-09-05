// @vitest-environment happy-dom
import type { SmartFixedBlockProps } from './types'
import { describe, expect, it } from 'vitest'
import { createApp, h } from 'vue'
import plugin, { SmartFixedBlock } from './index'

function mount(props: Partial<SmartFixedBlockProps> = {}) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const resolvedProps: SmartFixedBlockProps = { position: 'top', ...props }
  const app = createApp({
    render: () => h(SmartFixedBlock, resolvedProps, { default: () => 'content' }),
  })
  app.mount(root)
  return { app, root }
}

describe('smartFixedBlock', () => {
  it('渲染定位 class、slot 和 CSS 变量', () => {
    const { app, root } = mount({ position: 'top', limitWidth: '600px', limitLeft: '16px', limitTop: '8px' })
    const element = root.firstElementChild as HTMLElement

    expect(element.className).toContain('smart-fixed-block')
    expect(element.className).toContain('top')
    expect(element.className).toContain('limit-width')
    expect(element.textContent).toBe('content')
    expect(element.style.getPropertyValue('--fixed-block-limit-width')).toBe('600px')
    expect(element.style.getPropertyValue('--fixed-block-limit-left')).toBe('16px')
    expect(element.style.getPropertyValue('--fixed-block-limit-top')).toBe('8px')

    app.unmount()
    root.remove()
  })

  it('boolean limit 不产生限宽 class 或 CSS 变量', () => {
    const { app, root } = mount({ position: 'bottom', limitWidth: true, limitLeft: false })
    const element = root.firstElementChild as HTMLElement

    expect(element.className).toContain('bottom')
    expect(element.className).not.toContain('limit-width')
    expect(element.style.getPropertyValue('--fixed-block-limit-width')).toBe('')
    expect(element.style.getPropertyValue('--fixed-block-limit-left')).toBe('')

    app.unmount()
    root.remove()
  })

  it('插件注册 SmartFixedBlock', () => {
    const app = createApp({ render: () => h('div') })
    app.use(plugin)

    expect(app.component('SmartFixedBlock')).toBe(SmartFixedBlock)
  })
})
