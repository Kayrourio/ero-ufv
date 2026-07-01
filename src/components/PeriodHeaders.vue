<script setup>
import { computed } from 'vue'
import { periodX } from '../data'
import { store } from '../store'
import { t } from '../i18n'

const periods = computed(() => Array.from({ length: store.maxPeriod }, (_, i) => i + 1))
</script>

<template>
  <div id="period-headers">
    <div
      class="period-header"
      v-for="p in periods"
      :key="p"
      :style="{ left: periodX(p) + 'px' }"
    >
      {{ t('period').toUpperCase() }} {{ p }}
    </div>
  </div>
</template>
