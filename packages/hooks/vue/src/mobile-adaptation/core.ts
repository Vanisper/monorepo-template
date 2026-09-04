/**
 * # pc/mobile 模式判定
 *
 * 无框架依赖
 */

/** 移动设备 UA 特征 */
export const MOBILE_UA_PATTERN: RegExp = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

/**
 * ## 是否移动设备 UA
 *
 * 无 navigator 环境（SSR）返回 false
 */
export function isMobileDevice(): boolean {
  return typeof navigator !== 'undefined' && MOBILE_UA_PATTERN.test(navigator.userAgent)
}

/** resolveMode 的判定输入 */
export interface ResolveModeInput {
  /** 是否移动设备 UA（UA 优先于宽度判定） */
  isMobileUA: boolean
  /** 视口宽度 */
  width: number
  /** pc/mobile 宽度阈值（仅对非移动设备 UA 生效） */
  thresholdWidth: number
  /** 是否启用判定，关闭后恒为 pc */
  enabled: boolean
}

/**
 * ## 判定当前模式
 *
 * - 未启用恒为 pc
 * - 移动设备 UA 恒为 mobile（宽度不参与）
 * - 桌面设备按宽度阈值判定
 */
export function resolveMode({ isMobileUA, width, thresholdWidth, enabled }: ResolveModeInput): 'pc' | 'mobile' {
  if (!enabled) {
    return 'pc'
  }
  return isMobileUA || width < thresholdWidth ? 'mobile' : 'pc'
}
