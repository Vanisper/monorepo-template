import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  // 显式开启 TS 支持：monorepo 中 typescript 若只在子包，根目录的 isPackageExists("typescript") 检测不到 → 所有 .ts 文件被静默忽略（根目录已补 typescript 依赖，此处保持显式声明更稳）
  // 注意：全仓 typescript 锁 ~5.9.3——typescript-eslint 8.x 不支持 TS 7，待其支持后再升级
  typescript: true,
})
