import type { App } from 'vue'
import SmartFixedBlock from './index.vue'

export { SmartFixedBlock }

export * from './types'

export function installSmartFixedBlock(app: App): void {
  app.component('SmartFixedBlock', SmartFixedBlock)
}
