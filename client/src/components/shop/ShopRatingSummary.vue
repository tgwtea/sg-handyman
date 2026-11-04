<script setup>
// Purpose: display an average and the five rating counts using ordinary array arithmetic.
import { ref } from 'vue'
const props = defineProps({ average: Number, count: Number, ratings: Array })
const open = ref(false)
function stars() {
  let result = ''
  for (let star = 1; star <= 5; star++) result += star <= Math.round(props.average) ? '★' : '☆'
  return result
}
function percentage(star) {
  if (!props.count || !props.ratings) return 0
  return Math.round(props.ratings[star - 1] / props.count * 100)
}
</script>

<template>
  <div class="rating-summary" @mouseout="open = false">
    <button type="button" class="rating-trigger" @mouseover="open = true" @click="open = true" @blur="open = false" :aria-expanded="open" aria-label="Show rating distribution" >
      <span class="text-warning">{{ stars() }}</span> <strong>{{ average.toFixed(2) }}</strong><span class="text-muted">({{ count }} review{{ count === 1 ? '' : 's' }}) ▾</span>
    </button>
    <section v-if="open" class="rating-panel pixel-card p-3" aria-label="Rating distribution">
      <div class="d-flex justify-content-between align-items-center gap-2 mb-2"><strong>{{ average.toFixed(2) }} out of 5</strong><button type="button" class="btn btn-outline-secondary btn-sm d-xl-none" aria-label="Close rating distribution" @click="open = false">Close</button></div>
      <p class="small text-muted mb-3">{{ count }} customer reviews</p>
      <div v-for="row in 5" :key="row" class="rating-row d-flex align-items-center gap-2 mb-2">
        <span>{{ 6 - row }} star</span><div class="progress flex-grow-1 border" role="progressbar" :aria-label="(6 - row) + ' star ratings'" :aria-valuenow="percentage(6 - row)" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar bg-warning" :style="{ width: percentage(6 - row) + '%' }"></div></div><span>{{ percentage(6 - row) }}%</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rating-summary { position: relative; font-size: 0.875rem; }
.rating-trigger { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 0; border: 0; background: transparent; box-shadow: none; color: inherit; font: inherit; text-align: left; }
.rating-panel { position: absolute; top: 100%; right: 0; z-index: 101; width: 280px; color: var(--ink); }
.rating-row { font-size: 12px; }
.rating-row > span { width: 40px; flex-shrink: 0; }
/* On narrow screens, the same breakdown becomes a small bottom panel that fits the viewport. */
@media (max-width: 1199px) {
  .rating-panel { position: fixed; top: auto; bottom: 16px; left: 16px; right: 16px; width: auto; }
}
</style>
