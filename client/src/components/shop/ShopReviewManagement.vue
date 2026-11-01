<script setup>
// Purpose: admins inspect all product reviews and record the reason for each edit.
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/api'
const emit = defineEmits(['reviews-changed'])
const reviews = ref([])
const loading = ref(false)
const busy = ref(false)
const editing = ref('')
const rating = ref(1)
const comment = ref('')
const reason = ref('')
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
function startEdit(review) {
  editing.value = review._id
  rating.value = review.rating
  comment.value = review.comment
  reason.value = ''
  message.value = ''
}
async function saveReview() {
  if (busy.value) return
  busy.value = true
  try {
    const response = await api.put('/shop/manage/reviews/' + editing.value, { rating: rating.value, comment: comment.value, reason: reason.value })
    if (!active) return
    message.value = response.data.message
    editing.value = ''
    await loadReviews()
    emit('reviews-changed')
  } catch (error) {
    if (active) message.value = error.response ? error.response.data.message : 'Could not save review.'
  } finally { if (active) busy.value = false }
}
onMounted(loadReviews)
onUnmounted(() => { active = false })
</script>

<template>
  <section class="border rounded p-3 my-4">
    <h2>Review moderation</h2>
    <p>Edits keep the author's name. Customers see an “Edited by admin” label.</p>
    <button class="btn btn-outline-secondary" :disabled="loading || busy" @click="loadReviews">Refresh management reviews</button>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="loading">Loading reviews...</p>
    <p v-else-if="reviews.length === 0">No reviews yet.</p>
    <article v-for="review in reviews" :key="review._id" class="border-top py-3 mt-3">
      <h3 class="h6">{{ review.productName }} · {{ review.username }}</h3>
      <p>{{ review.rating }} / 5 · {{ review.comment }}</p>
      <details v-if="review.adminEdits.length" class="mb-2">
        <summary>Admin edit history</summary>
        <div v-for="edit in review.adminEdits" :key="edit._id" class="border-bottom py-2">
          <p>Before: {{ edit.previousRating }} / 5 · {{ edit.previousComment }}</p>
          <p>After: {{ edit.rating }} / 5 · {{ edit.comment }}</p>
          <p>Reason: {{ edit.reason }}</p>
        </div>
      </details>
      <button class="btn btn-outline-primary" :disabled="busy" @click="startEdit(review)">Edit as admin</button>
      <form v-if="editing === review._id" class="mt-3" @submit.prevent="saveReview">
        <fieldset :disabled="busy">
          <legend class="h5">Edit {{ review.username }}'s review</legend>
          <label for="admin-review-rating">Rating</label>
          <select id="admin-review-rating" v-model.number="rating" class="form-select mb-2"><option v-for="star in 5" :key="star" :value="star">{{ star }}</option></select>
          <label for="admin-review-comment">Review text</label>
          <textarea id="admin-review-comment" v-model.trim="comment" maxlength="1000" required class="form-control mb-2"></textarea>
          <label for="admin-review-reason">Reason for editing</label>
          <textarea id="admin-review-reason" v-model.trim="reason" maxlength="300" required class="form-control mb-2"></textarea>
          <button class="btn btn-primary me-2" type="submit">Save admin edit</button>
          <button class="btn btn-outline-secondary" type="button" @click="editing = ''">Cancel edit</button>
        </fieldset>
      </form>
    </article>
  </section>
</template>
