import type { ComputedRef } from 'vue'
import type { Title } from '../title'
import type { IframeRecord } from './core'
import { computed, shallowRef } from 'vue'
import { createIframeCore } from './core'

/** core 层的 open 入参形态（title 已归一为 string / getter） */
type IframeCoreOpenInput = Pick<IframeRecord, 'path' | 'src' | 'title'>

/** open 的入参，title 复用包内 Title 形态（string / Ref / getter） */
export interface IframeOpenOptions {
  path: string
  src: string
  title?: Title
}

/** createIframeManager 返回的 iframe 多页签管理器 */
export interface IframeManager {
  /**
   * ## 全部记录快照（只读）
   * `ComputedRef` 在类型层面就表达了「不可赋值」
   */
  list: ComputedRef<readonly IframeRecord[]>
  /** 打开中的记录快照 */
  openedList: ComputedRef<readonly IframeRecord[]>
  /** 打开（已存在则复用记录），并按 LRU 关闭超限的旧页签 */
  open: (data: IframeOpenOptions) => void
  /** 关闭（支持批量），关闭后从最近访问序中移除 */
  close: (path: string | string[]) => void
  /** 标记加载完成（iframe onload 时调用） */
  markLoaded: (path: string) => void
}

/** Title 的 Ref 形态归一为 getter：core 只存纯 JS 数据形态 */
function toCoreInput(data: IframeOpenOptions): IframeCoreOpenInput {
  const { title } = data
  if (title === undefined || typeof title === 'string' || typeof title === 'function') {
    return { ...data, title }
  }
  return { ...data, title: () => title.value }
}

/**
 * # 创建 iframe 多页签管理器
 * Vue 适配层，模块级也可调用
 *
 * @description
 * - 有实际变化才替换快照引用，模板 / 计算属性才能跟上
 */
export function createIframeManager(maxCache: number): IframeManager {
  const core = createIframeCore(maxCache)
  const trigger = shallowRef(0)

  const list = computed<readonly IframeRecord[]>(() => {
    // eslint-disable-next-line ts/no-unused-expressions
    trigger.value // 建立响应式依赖
    return core.getList()
  })

  const openedList = computed<readonly IframeRecord[]>(() => {
    // eslint-disable-next-line ts/no-unused-expressions
    trigger.value // 建立响应式依赖
    return core.getOpenedList()
  })

  function commit(mutate: () => boolean): void {
    if (mutate()) {
      trigger.value++
    }
  }

  return {
    list,
    openedList,
    open: data => commit(() => core.open(toCoreInput(data))),
    close: path => commit(() => core.close(path)),
    markLoaded: path => commit(() => core.markLoaded(path)),
  }
}
