<script setup lang="ts">
import { SmartFixedBlock } from '@mono/ui-vue'
</script>

<template>
  <SmartFixedBlock position="top" limit-width="600px">
    <p style="margin: 16px">
      smart-fixed-block 三方引用验证：如果你看到这条内容被固定在顶部限宽容器中，说明 @mono/ui-vue 的组件、样式（css.inject）与类型导出都正常工作。
    </p>
  </SmartFixedBlock>
</template>
