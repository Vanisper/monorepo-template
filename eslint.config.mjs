import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  // type-aware 可选开启（内部库建议先不开，构建链路有 tsc/tsdown 兜底）：
  // typescript: { tsconfigPath: 'tsconfig.base.json' },
})
