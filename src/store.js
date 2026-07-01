import { reactive } from 'vue'
import { DEFAULT_MAX_PERIOD } from './data'

export const store = reactive({
  selected: null,
  search: '',
  sidePanelOpen: false,
  locale: 'pt',

  prereqSet: new Set(),
  directDependents: new Set(),
  transitiveDependents: new Set(),
  impactLevel: 'low',

  // Reorganization state — driven by canvasEngine.relayout()
  movedNodes: new Set(),
  moveInfo: {},
  maxPeriod: DEFAULT_MAX_PERIOD,
})
