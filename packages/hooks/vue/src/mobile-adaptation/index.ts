import type { Ref } from 'vue'
import { onMounted, onUnmounted, readonly, ref } from 'vue'

/** createMobileAdaptation 的配置项 */
export interface MobileAdaptationOptions {
  /** 是否启用判定，关闭后恒为 pc */
  enable?: boolean
  /** pc/mobile 宽度阈值（仅对非移动设备 UA 生效），默认 1024 */
  thresholdWidth?: number
}

/** useMobileAdaptation 返回的适配模式管理器 */
export interface MobileAdaptationManager {
  /** 当前模式（只读） */
  mode: Readonly<Ref<'pc' | 'mobile'>>
  /** 是否启用判定（只读） */
  enable: Readonly<Ref<boolean>>
  /** 启用开关；关闭后下次 setMode/resize 恒为 pc */
  setEnabled: (enable: boolean) => void
  /** 按给定视口宽度重算模式（resize 监听内部已自动做） */
  setMode: (width: number) => void
}

/** 移动设备 UA 特征 */
const MOBILE_UA_PATTERN = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

function isMobileDevice(): boolean {
  return typeof navigator !== 'undefined' && MOBILE_UA_PATTERN.test(navigator.userAgent)
}

/**
 * 创建 pc/mobile 模式适配管理器
 *
 * 与 createTitleManager 等直接返回管理器的工厂不同：本工厂返回的
 * `useMobileAdaptation()` 须在 setup 内调用——resize 监听的注册与清理
 * 依赖组件生命周期
 */
export function createMobileAdaptation(options: MobileAdaptationOptions = {}): () => MobileAdaptationManager {
  const enable = ref(options.enable ?? true)
  // 创建时仅按 UA 给出初始模式（无 DOM 访问，SSR 安全）；宽度判定推迟到 mounted
  const thresholdWidth = options.thresholdWidth ?? 1024
  const isMobileUA = isMobileDevice()
  const mode = ref<'pc' | 'mobile'>(isMobileUA ? 'mobile' : 'pc')

  let resizeHandler: (() => void) | null = null
  // 消费者计数：多个组件同时调用 useMobileAdaptation 时，监听随最后一个消费者卸载才移除
  let consumerCount = 0

  function setEnabled(value: boolean): void {
    enable.value = value
  }

  function setMode(width: number): void {
    if (!enable.value) {
      mode.value = 'pc'
      return
    }
    mode.value = isMobileUA || width < thresholdWidth ? 'mobile' : 'pc'
  }

  function registerSideEffects(): void {
    consumerCount++
    // 多个组件同时调用 useMobileAdaptation 时监听只挂一次
    if (resizeHandler) {
      return
    }
    setMode(document.documentElement.clientWidth)
    resizeHandler = () => setMode(document.documentElement.clientWidth)
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
      mode: readonly(mode),
      enable: readonly(enable),
      setEnabled,
      setMode,
    }
  }
}
