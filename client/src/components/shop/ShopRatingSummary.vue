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
    <button type="button" class="rating-trigger" @mouseover="open = true" :aria-expanded="open" aria-label="Show rating distribution" >
      <span class="text-warning">{{ stars() }}</span> <strong>{{ average.toFixed(2) }}</strong><span class="text-muted">({{ count }} review{{ count === 1 ? '' : 's' }}) ▾</span>
    </button>
    <section v-if="open" class="rating-panel" aria-label="Rating distribution">
      <div class="d-flex justify-content-between align-items-center gap-2 mb-2"><strong>{{ average.toFixed(2) }} out of 5</strong><button type="button" class="rating-close" aria-label="Close rating distribution" @click="open = false">×</button></div>
      <p class="small text-muted mb-3">{{ count }} customer reviews</p>
      <div v-for="row in 5" :key="row" class="rating-row">
        <span>{{ 6 - row }} star</span><div class="rating-track"><div class="rating-fill" :style="{ width: percentage(6 - row) + '%' }"></div></div><span>{{ percentage(6 - row) }}%</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rating-summary { position: relative; font-size: 0.875rem; }
.rating-trigger { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 0; border: 0; background: transparent; box-shadow: none; color: inherit; font: inherit; text-align: left; }
.rating-panel { position: absolute; top: 100%; right: 0; z-index: 30; width: 280px; padding: 16px; border: 2px solid var(--ink); border-radius: 8px; box-shadow: 4px 4px 0 rgba(25, 25, 45, 0.2); background: #fffdf5; color: var(--ink); }
.rating-close { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 4px; background: transparent; box-shadow: none; color: var(--ink); font-family: Arial, sans-serif; font-size: 28px; line-height: 1; }
.rating-close:hover { background: #f2ead4; }
.rating-close:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
.rating-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; }
.rating-row > span { width: 40px; flex-shrink: 0; }
.rating-track { flex: 1; height: 16px; overflow: hidden; border: 1px solid #c6b991; border-radius: 4px; background: white; }
.rating-fill { height: 100%; background: #e99900; }
/* On narrow screens, the same breakdown becomes a small bottom panel that fits the viewport. */
@media (max-width: 1199px) {
  .rating-panel { position: fixed; top: auto; bottom: 16px; left: 16px; right: 16px; width: auto; }
}
</style>
