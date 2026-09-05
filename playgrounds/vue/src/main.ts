import { useDocumentTitle, usePageTitle } from '@mono/hooks-vue'
import SmartFixedBlockPlugin from '@mono/ui-vue'
import { createApp } from 'vue'
import App from './App.vue'

// 模块级创建一次全局共享：纯状态，无副作用
const title = usePageTitle({ appTitle: 'consumer 示例' })
// 副作用单独挂载：模块级调用与应用同寿
useDocumentTitle(title.finalTitle)

createApp(App).use(SmartFixedBlockPlugin).mount('#app')
