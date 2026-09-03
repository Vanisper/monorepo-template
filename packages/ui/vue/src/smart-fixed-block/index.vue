<script setup lang="ts">
import type { SmartFixedBlockProps } from './types'
import { computed } from 'vue'

defineOptions({
  name: 'SmartFixedBlock',
})

const props = defineProps<SmartFixedBlockProps>()

// limit* 只有 string（带单位的 CSS 值）会产出对应 CSS 变量；boolean 形态暂不生效
const limitStyle = computed(() => {
  const style: Record<string, string> = {}
  if (typeof props.limitWidth === 'string') {
    style['--fixed-block-limit-width'] = props.limitWidth
  }
  if (typeof props.limitLeft === 'string') {
    style['--fixed-block-limit-left'] = props.limitLeft
  }
  if (typeof props.limitTop === 'string') {
    style['--fixed-block-limit-top'] = props.limitTop
  }
  return style
})

const hasLimitWidth = computed(() => typeof props.limitWidth === 'string')
</script>

<template>
  <div class="smart-fixed-block" :class="{ [position]: position, 'limit-width': hasLimitWidth }" :style="limitStyle">
    <slot />
  </div>
</template>

<style scoped>
.smart-fixed-block {
  position: fixed;
  z-index: 1000;
  width: calc(100% - var(--fixed-block-limit-left, 0px));
  transition: width 0.3s, max-width 0.3s, transform 0.3s, top 0.3s;

  &.limit-width {
    max-width: calc(var(--fixed-block-limit-width, 100%) - var(--fixed-block-limit-left, 0px));
  }

  &.top {
    top: var(--fixed-block-limit-top, 0);
  }

  &.bottom {
    bottom: 0;
  }
}
</style>
