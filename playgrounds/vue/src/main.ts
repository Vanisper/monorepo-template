import { createTitleManager } from '@mono/hooks-vue'
import SmartFixedBlockPlugin from '@mono/ui-vue'
import { createApp } from 'vue'
import App from './App.vue'

createTitleManager({ appTitle: 'consumer 示例' })

createApp(App).use(SmartFixedBlockPlugin).mount('#app')
