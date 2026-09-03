import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  // 显式开启 TS 支持：monorepo 中 typescript 若只在子包，根目录的 isPackageExists("typescript") 检测不到 → 所有 .ts 文件被静默忽略（根目录已补 typescript 依赖，此处保持显式声明更稳）
  // 注意：typescript-eslint 8.x 不支持 TS 7，TS 版本升级前需确认其支持范围（具体锁定版本见 pnpm-workspace.yaml 的 catalog）
  typescript: true,
  // 显式开启 Vue 支持：同理，vue 只在子包中，根目录 isPackageExists("vue") 检测不到 → .vue 文件不会被 lint（no matching configuration）
  vue: true,
})
