<script setup lang="ts">
import type { SmartFixedBlockProps } from './types';

defineOptions({
  name: 'SmartFixedBlock',
})

defineProps<SmartFixedBlockProps>()
</script>

<template>
  <div class="smart-fixed-block" :class="{ [`${position}`]: position, 'limit-width': typeof limitWidth === 'string' }"
    :style="[
      typeof limitWidth === 'string' && { '--fixed-block-limit-width': limitWidth },
      typeof limitLeft === 'string' && { '--fixed-block-limit-left': limitLeft },
      typeof limitTop === 'string' && { '--fixed-block-limit-top': limitTop },
    ]">
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
