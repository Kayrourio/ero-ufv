<script setup>
import { computed } from 'vue'
import { AREA_COLORS } from '../data'
import { store } from '../store'
import { t } from '../i18n'
import { startDrag, onNodeDoubleClick, toggleFailed } from '../canvasEngine'

const props = defineProps({
  discipline: { type: Object, required: true },
})

const areaColor = computed(() => AREA_COLORS[props.discipline.area] || AREA_COLORS.eng)
const moveInfo = computed(() => store.moveInfo[props.discipline.code])
const isFailed = computed(() => store.failedNodes.has(props.discipline.code))

function onMousedown(e) {
  startDrag(props.discipline.code, e.currentTarget, e)
}

function onTouchstart(e) {
  startDrag(props.discipline.code, e.currentTarget, e)
}

function onDblclick() {
  onNodeDoubleClick(props.discipline.code)
}

function onToggleFailed() {
  toggleFailed(props.discipline.code)
}
</script>

<template>
  <div
    class="node-card state-default"
    :id="'node-' + discipline.code"
    :style="{ '--area-color': areaColor }"
    @mousedown="onMousedown"
    @touchstart="onTouchstart"
    @dblclick="onDblclick"
  >
    <div class="node-period">P{{ discipline.period }}</div>
    <div v-if="moveInfo" class="move-badge">P{{ moveInfo.from }}→P{{ moveInfo.to }}</div>
    <button
      type="button"
      class="fail-toggle"
      :class="{ checked: isFailed }"
      :title="isFailed ? t('failToggleOff') : t('failToggleOn')"
      @mousedown.stop
      @touchstart.stop
      @click.stop="onToggleFailed"
    >
      R
    </button>
    <div class="node-code">{{ discipline.code }}</div>
    <div class="node-name">{{ discipline.name }}</div>
    <div class="node-meta">{{ discipline.hours }}h · {{ discipline.credits }}cr</div>
  </div>
</template>
