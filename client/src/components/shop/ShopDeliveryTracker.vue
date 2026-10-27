<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// The parent supplies the saved order. Timing survives refresh because it comes from MongoDB.
const props = defineProps({ order: Object })
const emit = defineEmits(['delivery-update'])
const currentTime = ref(Date.now())
let timer
let previousStage = ''

const remainingSeconds = computed(() => {
  const startTime = new Date(props.order.createdAt).getTime()
  const finishTime = startTime + props.order.deliveryDurationSeconds * 1000
  return Math.max(0, Math.ceil((finishTime - currentTime.value) / 1000))
})

// Clamp the percentage between 0 and 100, including when the computer clock is behind.
const progress = computed(() => {
  const elapsed = props.order.deliveryDurationSeconds - remainingSeconds.value
  return Math.max(0, Math.min(100, Math.floor(elapsed / props.order.deliveryDurationSeconds * 100)))
})

const deliveryStage = computed(() => {
  if (progress.value >= 100) return 'Delivered'
  if (progress.value >= 90) return 'At doorstep'
  if (progress.value >= 30) return 'Out for delivery'
  return 'Preparing'
})

const remainingTime = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60)
  const seconds = remainingSeconds.value % 60
  return minutes + ' min ' + seconds + ' sec'
})

// A tick changes the time, which makes the computed values update automatically.
function updateDelivery() {
  currentTime.value = Date.now()
  const stage = deliveryStage.value
  if (stage !== previousStage) {
    if (stage === 'At doorstep' || stage === 'Delivered') {
      emit('delivery-update', 'Order ' + props.order._id + ': ' + stage + '.')
    }
    previousStage = stage
  }
  if (stage === 'Delivered') clearInterval(timer)
}

onMounted(() => {
  // Show existing status immediately, without replaying notifications for old orders.
  currentTime.value = Date.now()
  previousStage = deliveryStage.value
  if (previousStage !== 'Delivered') timer = setInterval(updateDelivery, 1000)
})

// Stop checking when this order's component is removed or the user leaves the shop.
onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <div class="border rounded p-3 mb-3">
    <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
      <strong>Delivery: {{ deliveryStage }}</strong>
      <button type="button" class="btn btn-outline-secondary btn-sm" @click="updateDelivery">Refresh progress</button>
    </div>
    <div class="progress" role="progressbar" aria-label="Delivery progress" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-bar bg-success" :style="{ width: progress + '%' }">{{ progress }}%</div>
    </div>
    <p v-if="remainingSeconds > 0" class="mt-2 mb-1">Time remaining: {{ remainingTime }}</p>
    <p v-else class="mt-2 mb-1">Delivery complete.</p>
    <p class="small mb-0">Preparing → Out for delivery → At doorstep → Delivered. This is a timed delivery demonstration.</p>
  </div>
</template>
