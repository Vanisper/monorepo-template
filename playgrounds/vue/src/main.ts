import { createTitleManager, useTitle } from '@mono/hooks-vue'
import SmartFixedBlockPlugin from '@mono/ui-vue'
import { createApp } from 'vue'
import App from './App.vue'

const title = createTitleManager({ appTitle: 'consumer 示例' })
// 模块级挂载：effect 常驻应用生命周期（与 createTitleManager 的状态工厂分离）
useTitle(title.finalTitle)

createApp(App).use(SmartFixedBlockPlugin).mount('#app')
