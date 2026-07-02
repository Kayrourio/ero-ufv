import { DISCIPLINES, DISCIPLINE_MAP, EDGES } from './data'

/*
 * Pure scheduling logic: given the static prereq/coreq graph plus a set of
 * user-chosen "manual overrides" (drag-and-drop results), compute the
 * effective period every course should render in. No DOM, no Vue —
 * canvasEngine.js consumes this to lay nodes out.
 */

function computeTopoOrder() {
  const indegree = {}
  const adj = {}
  DISCIPLINES.forEach((d) => {
    indegree[d.code] = 0
    adj[d.code] = []
  })
  EDGES.forEach((e) => {
    adj[e.from].push(e.to)
    indegree[e.to]++
  })

  const queue = DISCIPLINES.map((d) => d.code).filter((c) => indegree[c] === 0)
  const order = []
  while (queue.length) {
    const cur = queue.shift()
    order.push(cur)
    adj[cur].forEach((next) => {
      indegree[next]--
      if (indegree[next] === 0) queue.push(next)
    })
  }

  if (order.length !== DISCIPLINES.length) {
    console.warn('scheduling: cycle detected in prereq/coreq graph, falling back to catalog period order')
    return DISCIPLINES.slice()
      .sort((a, b) => a.period - b.period)
      .map((d) => d.code)
  }
  return order
}

const topoOrder = computeTopoOrder()

export const manualOverrides = {}

export function computeEffectivePeriods() {
  const effective = {}
  topoOrder.forEach((code) => {
    const d = DISCIPLINE_MAP[code]
    let period = manualOverrides[code] ?? d.period
    // Only strict prereqs force a course later — you genuinely can't take
    // it until the prereq is done. A coreq relationship just means "must be
    // taken together" *at the time either is taken*; it's already satisfied
    // by the catalog data and doesn't need to be re-enforced going forward.
    // Otherwise failing/rescheduling one course would drag its coreq
    // partner along even if that partner was already passed.
    d.prereqs.forEach((p) => {
      if (effective[p] !== undefined) period = Math.max(period, effective[p] + 1)
    })
    effective[code] = period
  })
  return effective
}

// The earliest period `code` could validly occupy given its own
// prereqs/coreqs' current effective periods — used to clamp drag drops.
export function getMinRequiredPeriod(code, effectivePeriods) {
  const d = DISCIPLINE_MAP[code]
  let min = 1
  d.prereqs.forEach((p) => {
    if (effectivePeriods[p] !== undefined) min = Math.max(min, effectivePeriods[p] + 1)
  })
  d.coreqs.forEach((p) => {
    if (effectivePeriods[p] !== undefined) min = Math.max(min, effectivePeriods[p])
  })
  return min
}

export function setOverride(code, period) {
  manualOverrides[code] = period
}

export function resetOverride(code) {
  delete manualOverrides[code]
}

export function resetAllOverrides() {
  Object.keys(manualOverrides).forEach((k) => delete manualOverrides[k])
}
