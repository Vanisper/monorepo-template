/**
 * # 标题合成的纯函数内核
 *
 * 无框架依赖、无内部状态
 */

/** composeTitle 的输入：各层标题均为已求值的字符串 */
export interface ComposeTitleInput {
  /** 应用主标题 */
  app: string
  /** 路由 / 页面标题 */
  route?: string
  /** 覆盖标题（如 iframe 内部传出的标题），优先于路由标题 */
  override?: string
  /** 应用主标题为空时的兜底 */
  fallback?: string
  /** 是否启用动态标题：关闭后 route / override 不参与合成，默认 true */
  dynamic?: boolean
  /** 当前标题与主标题之间的分隔符，默认 ` - ` */
  separator?: string
}

/**
 * ## 合成最终标题
 *
 * - 三级优先：override > route > app；app 为空时以 fallback 代之
 * - 兜底放在合成层而非各层输入：只在主标题为空时出场，单层传空串仍是合法的「清空」
 * - 任一侧为空时不带分隔符，避免出现「用户管理 - 」这类残缺结果
 */
export function composeTitle({ app, route = '', override = '', fallback = '', dynamic = true, separator = ' - ' }: ComposeTitleInput): string {
  const base = app || fallback
  if (!dynamic) {
    return base
  }
  const current = override || route
  if (!current) {
    return base
  }
  return base ? `${current}${separator}${base}` : current
}
