<script setup>
import { AREA_COLORS } from '../data'
import { areaLabel } from '../i18n'

const areas = Object.keys(AREA_COLORS)
</script>

<template>
  <div class="area-legend">
    <div class="area-legend-item" v-for="area in areas" :key="area">
      <span class="area-dot" :style="{ background: AREA_COLORS[area] }"></span>
      <span>{{ areaLabel(area) }}</span>
    </div>
  </div>
</template>
