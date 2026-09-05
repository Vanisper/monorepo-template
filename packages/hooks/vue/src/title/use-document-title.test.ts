import { describe, expect, it } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useDocumentTitle } from './use-document-title'
import { usePageTitle } from './use-page-title'

function fakeDocument(title = ''): Document {
  return { title } as Document
}

describe('useDocumentTitle', () => {
  it('立即同步一次，依赖变化后随之更新', async () => {
    const document = fakeDocument()
    const name = ref('示例应用')
    useDocumentTitle(() => name.value, { document })
    expect(document.title).toBe('示例应用')

    name.value = '新应用'
    await nextTick()
    expect(document.title).toBe('新应用')
  })

  it('配合 usePageTitle：finalTitle 变化即同步', async () => {
    const document = fakeDocument()
    const title = usePageTitle({ appTitle: '示例应用' })
    useDocumentTitle(title.finalTitle, { document })
    expect(document.title).toBe('示例应用')

    title.setRouteTitle('用户管理')
    await nextTick()
    expect(document.title).toBe('用户管理 - 示例应用')
  })

  it('scope 销毁时停止同步并恢复原标题', async () => {
    const document = fakeDocument('原标题')
    const name = ref('页面 A')
    const scope = effectScope()
    scope.run(() => useDocumentTitle(name, { document }))
    expect(document.title).toBe('页面 A')

    scope.stop()
    expect(document.title).toBe('原标题')

    name.value = '页面 B'
    await nextTick()
    expect(document.title).toBe('原标题')
  })

  it('restoreOnDispose 为 false 时销毁不恢复', () => {
    const document = fakeDocument('原标题')
    const scope = effectScope()
    scope.run(() => useDocumentTitle('页面 A', { document, restoreOnDispose: false }))
    scope.stop()
    expect(document.title).toBe('页面 A')
  })

  it('模块级调用返回的句柄可手动停止', async () => {
    const document = fakeDocument()
    const name = ref('A')
    const stop = useDocumentTitle(name, { document })
    stop()

    name.value = 'B'
    await nextTick()
    expect(document.title).toBe('A')
  })

  it('document 为 null（SSR）时为空操作', () => {
    expect(() => useDocumentTitle('示例应用', { document: null })).not.toThrow()
  })
})
