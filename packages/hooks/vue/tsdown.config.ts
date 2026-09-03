import { defineConfig } from 'tsdown'

export default defineConfig({
  // 守卫走子路径入口：根入口不含 vue-router 类型，不使用守卫的消费方无需安装 vue-router 的类型
  entry: [
    'src/index.ts',
    'src/iframe/vue-router.ts',
    'src/keep-alive/vue-router.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
})
