import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'

export default defineConfig({
  entry: ['src/index.ts'],
  platform: 'neutral',
  plugins: [Vue({ isProduction: true })],
  // ESM-only：Vue SFC 组件库由 Vite 类 bundler 应用消费，CJS 不支持 css.inject 的 import 注入
  format: ['esm'],
  dts: { vue: true },
  css: { inject: true },
  sourcemap: true,
})
