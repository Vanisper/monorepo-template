import type { WatchHandle } from 'vue'
import type { ConfigurableDocument } from '../browser/configurable'
import type { TitleSource } from './use-page-title'
import { toValue, watch } from 'vue'
import { defaultDocument } from '../browser/configurable'
import { tryOnScopeDispose } from '../shared/try-on-scope-dispose'

/**
 * # useDocumentTitle 的配置项
 */
export interface DocumentTitleOptions extends ConfigurableDocument {
  /**
   * ## 所在 scope 销毁时恢复调用前的标题
   *
   * 默认 true；模块级调用无 scope，此项无效
   */
  restoreOnDispose?: boolean
}

/**
 * # 将标题源单向同步到 `document.title`
 *
 * @description
 * - 副作用 hook：只读消费标题源，不持有任何状态，与 usePageTitle 的 `finalTitle` 配套，
 *   也可独立同步任意标题源
 * - 同步随所在 effect scope 停止；模块级调用则与应用同寿，返回值可手动停止
 * - `document` 可注入：SSR 传 `null` 跳过，测试传假对象
 */
export function useDocumentTitle(source: TitleSource, options: DocumentTitleOptions = {}): WatchHandle {
  const { document = defaultDocument, restoreOnDispose = true } = options
  const originalTitle = document?.title

  const handle = watch(() => toValue(source), (title) => {
    if (document) {
      document.title = title
    }
  }, { immediate: true })

  if (document && restoreOnDispose) {
    tryOnScopeDispose(() => {
      document.title = originalTitle ?? ''
    })
  }

  return handle
}
