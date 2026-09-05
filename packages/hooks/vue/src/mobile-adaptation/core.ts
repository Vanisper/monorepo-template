/**
 * # pc / mobile 模式判定的纯函数内核
 *
 * 无框架依赖、无内部状态
 */

/** 移动设备 UA 特征 */
export const MOBILE_UA_PATTERN: RegExp = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

/**
 * ## 是否移动设备 UA
 *
 * 无 UA（SSR）视为非移动设备
 */
export function isMobileUserAgent(userAgent: string | undefined): boolean {
  return !!userAgent && MOBILE_UA_PATTERN.test(userAgent)
}

/** 页面模式 */
export type PageMode = 'pc' | 'mobile'

/** resolveMode 的判定输入 */
export interface ResolveModeInput {
  /** 是否移动设备 UA（优先于视口判定） */
  isMobileUA: boolean
  /** 视口是否窄于阈值 */
  isNarrow: boolean
  /** 是否启用判定，关闭后恒为 pc */
  enabled: boolean
}

/**
 * ## 判定当前模式
 *
 * - 未启用恒为 pc
 * - 移动设备 UA 恒为 mobile（视口不参与）
 * - 桌面设备按视口宽窄判定
 */
export function resolveMode({ isMobileUA, isNarrow, enabled }: ResolveModeInput): PageMode {
  if (!enabled) {
    return 'pc'
  }
  return isMobileUA || isNarrow ? 'mobile' : 'pc'
}

/**
 * ## 生成「视口宽度小于阈值」的媒体查询
 *
 * 用 `not all and (min-width)` 而非 `max-width`：精确表达 `width < threshold`，不受小数像素影响
 */
export function narrowerThan(thresholdWidth: number): string {
  return `not all and (min-width: ${thresholdWidth}px)`
}
