import type { ComputedRef, Ref } from 'vue'
import { computed, onMounted, onUnmounted, readonly, ref } from 'vue'
import { isMobileDevice, resolveMode } from './core'

export * from './core'

/** createMobileAdaptation 的配置项 */
export interface MobileAdaptationOptions {
  /** 是否启用判定，关闭后恒为 pc */
  enable?: boolean
  /** pc/mobile 宽度阈值（仅对非移动设备 UA 生效），默认 1024 */
  thresholdWidth?: number
}

/** useMobileAdaptation 返回的适配模式管理器 */
export interface MobileAdaptationManager {
  /**
   * ## 当前模式（只读投影）
   * `mode` 是判定函数对输入（UA / 观测宽度 / 启用开关）的投影，
   * 任何输入变化即时重算——不存储独立的模式状态
   */
  mode: ComputedRef<'pc' | 'mobile'>
  /** 是否启用判定（只读） */
  enable: Readonly<Ref<boolean>>
  /** 启用开关；变更即时生效（mode 立即重算） */
  setEnabled: (enable: boolean) => void
  /** 更新观测到的视口宽度（resize 监听内部已自动做），mode 随之重算 */
  setWidth: (width: number) => void
}

/**
 * 创建 pc/mobile 模式适配管理器
 *
 * - 与 createTitleManager 等直接返回管理器的工厂不同：本工厂返回的
 *   `useMobileAdaptation()` 须在 setup 内调用——resize 监听的注册与清理
 *   依赖组件生命周期
 * - 数据所有权：只存储 `width` 一个观测量，`mode` 恒为 `resolveMode` 的
 *   派生投影；未观测过宽度（创建后至首次 setWidth 前）按桌面宽度兜底，
 *   即创建时仅按 UA 判定（无 DOM 访问，SSR 安全）
 */
export function createMobileAdaptation(options: MobileAdaptationOptions = {}): () => MobileAdaptationManager {
  const enable = ref(options.enable ?? true)
  const thresholdWidth = options.thresholdWidth ?? 1024
  // UA 仅在创建时判定一次：会话内 UA 视为不变量
  const isMobileUA = isMobileDevice()
  const width = ref(Infinity)

  const mode = computed<'pc' | 'mobile'>(() =>
    resolveMode({ isMobileUA, width: width.value, thresholdWidth, enabled: enable.value }),
  )

  let resizeHandler: (() => void) | null = null
  // 消费者计数：多个组件同时调用 useMobileAdaptation 时，监听随最后一个消费者卸载才移除
  let consumerCount = 0

  function setEnabled(value: boolean): void {
    enable.value = value
  }

  function setWidth(value: number): void {
    width.value = value
  }

  function registerSideEffects(): void {
    consumerCount++
    // 多个组件同时调用 useMobileAdaptation 时监听只挂一次
    if (resizeHandler) {
      return
    }
    setWidth(document.documentElement.clientWidth)
    resizeHandler = () => setWidth(document.documentElement.clientWidth)
    window.addEventListener('resize', resizeHandler)
  }

  function cleanupSideEffects(): void {
    consumerCount = Math.max(0, consumerCount - 1)
    if (consumerCount === 0 && resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
      resizeHandler = null
    }
  }

  return function useMobileAdaptation(): MobileAdaptationManager {
    onMounted(registerSideEffects)
    // 清理必须在 setup 同步期注册：在 onMounted 回调内再注册 onUnmounted
    // 时已无活跃组件实例、不会生效
    onUnmounted(cleanupSideEffects)

    return {
      mode,
      enable: readonly(enable),
      setEnabled,
      setWidth,
    }
  }
}
