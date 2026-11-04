<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import ShopConfirmDialog from './ShopConfirmDialog.vue'
const emit = defineEmits(['reviews-changed'])
const reviews = ref([])
const loading = ref(false)
const busy = ref(false)
const pendingDeleteId = ref('')
const message = ref('')
let active = true
async function loadReviews() {
  loading.value = true
  try {
    const response = await api.get('/shop/manage/reviews')
    if (active) reviews.value = response.data
  } catch { if (active) message.value = 'Could not load reviews. Please retry.' }
  finally { if (active) loading.value = false }
}
async function deleteReview(review) {
  if (busy.value) return
  busy.value = true
  message.value = ''
  try {
    const response = await api.delete('/shop/manage/reviews/' + review._id)
    if (!active) return
    pendingDeleteId.value = ''
    await loadReviews()
    message.value = response.data.message
    emit('reviews-changed')
  } catch (error) {
    if (active) message.value = error.response ? error.response.data.message : 'Could not delete review.'
  } finally { if (active) busy.value = false }
}
onMounted(loadReviews)
onUnmounted(() => { active = false })
</script>

<template>
  <section class="border rounded p-3 my-4">
    <h2>Review moderation</h2>
    <p>Inspect reviews and delete unsuitable entries. Authors' words and ratings cannot be edited here.</p>
    <button class="btn btn-outline-secondary" :disabled="loading || busy" @click="loadReviews">Refresh management reviews</button>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="loading">Loading reviews...</p>
    <p v-else-if="reviews.length === 0">No reviews yet.</p>
    <article v-for="review in reviews" :key="review._id" class="border-top py-3 mt-3">
      <h3 class="h6">{{ review.productName }} · {{ review.username }}</h3>
      <p><span class="text-warning">{{ '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) }}</span> <strong>{{ review.rating.toFixed(1) }}</strong> · {{ review.comment }}</p>
      <button class="btn btn-outline-danger" :disabled="busy" @click="pendingDeleteId = review._id">Delete as admin</button>
      <ShopConfirmDialog v-if="pendingDeleteId === review._id" title="Confirm deletion" message="Are you sure you want to delete this product review?" note="This permanently deletes the review. It cannot be undone." confirm-label="✓ Yes, Delete Review" :busy="busy" @cancel="pendingDeleteId = ''" @confirm="deleteReview(review)" />
    </article>
  </section>
</template>
