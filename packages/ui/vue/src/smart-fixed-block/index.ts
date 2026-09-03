import type { App, Plugin } from 'vue'
import SmartFixedBlock from './index.vue'

export { SmartFixedBlock }

export * from './types'

const plugin: Plugin = {
  install(app: App): void {
    // 用组件自身的 name 注册，避免重复维护字符串字面量（SFC 中 defineOptions 已声明 name）
    app.component(SmartFixedBlock.name as string, SmartFixedBlock)
  },
}

export default plugin
