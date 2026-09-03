import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    // 组件测试后续补充；当前允许无测试文件
    passWithNoTests: true,
  },
})
