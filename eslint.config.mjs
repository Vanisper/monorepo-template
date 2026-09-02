import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  // 强制开启 TS 支持：typescript 只在子包中，根目录的 isPackageExists("typescript") 检测不到 → 需显式开启，否则所有 .ts 文件被忽略
  typescript: true,
})
