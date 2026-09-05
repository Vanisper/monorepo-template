import { defineConfig } from 'tsdown'

export default defineConfig({
  // 路由守卫走独立子路径入口：根入口的 d.ts 不引用 vue-router，不使用守卫的消费方无需安装它
  entry: {
    'index': 'src/index.ts',
    'vue-router': 'src/vue-router/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
})
