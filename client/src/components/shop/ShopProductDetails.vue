<script setup>
// Purpose: product details dialog, quantity selection and purchaser review controls.
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({ tool: Object, companyName: String, cartDisabled: Boolean })
const emit = defineEmits(['close', 'add-to-cart', 'reviews-changed'])
const auth = useAuthStore()
// Approved extra: this ref holds the actual <dialog> element, not a data value.
const productDialog = ref(null)
const quantity = ref(1)
const addedMessage = ref('')
const imageFailed = ref(false)
const reviews = ref([])
const loading = ref(false)
const reviewBusy = ref(false)
const loadError = ref('')
const reviewMessage = ref('')
const purchased = ref(false)
const canReview = ref(false)
const ratingFilter = ref('')
const reviewSort = ref('newest')
const rating = ref(0)
const comment = ref('')
const editingReview = ref(false)
const preview = ref(false)
const confirmDelete = ref(false)
let active = true

const averageRating = computed(() => {
  if (reviews.value.length === 0) return 'No ratings yet'
  let total = 0
  for (const review of reviews.value) total += review.rating
  return (total / reviews.value.length).toFixed(1) + ' / 5'
})

const visibleReviews = computed(() => {
  const result = []
  for (const review of reviews.value) {
    if (!ratingFilter.value || review.rating === Number(ratingFilter.value)) result.push(review)
  }
  if (reviewSort.value === 'highest') result.sort((a, b) => b.rating - a.rating)
  else if (reviewSort.value === 'lowest') result.sort((a, b) => a.rating - b.rating)
  else result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return result
})

// The server checks purchase history and marks the current account's own review.
async function loadReviews() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await api.get('/shop/products/' + props.tool.id + '/reviews')
    if (!active) return
    reviews.value = response.data.reviews
    purchased.value = response.data.purchased
    canReview.value = response.data.canReview
  } catch {
    if (active) loadError.value = 'Could not load reviews. Please retry.'
  } finally {
    if (active) loading.value = false
  }
}

function addSelectedQuantity() {
  if (props.cartDisabled) return
  if (typeof quantity.value !== 'number' || quantity.value < 1 || quantity.value > 10000 || quantity.value % 1 !== 0) {
    addedMessage.value = 'Choose a whole quantity from 1 to 10000.'
    return
  }
  emit('add-to-cart', props.tool, quantity.value)
  addedMessage.value = 'Added ' + quantity.value + ' to your cart.'
}

function startEditingReview(review) {
  rating.value = review.rating
  comment.value = review.comment
  editingReview.value = true
  reviewMessage.value = ''
  preview.value = false
  confirmDelete.value = false
}

function resetReviewForm() {
  rating.value = 0
  comment.value = ''
  editingReview.value = false
  preview.value = false
}

async function saveReview() {
  if (reviewBusy.value || loading.value || loadError.value) return
  if (rating.value < 1 || rating.value > 5 || !comment.value.trim()) {
    reviewMessage.value = 'Choose a star rating and write your review.'
    return
  }
  reviewBusy.value = true
  reviewMessage.value = ''
  const wasEditing = editingReview.value
  try {
    const details = { rating: rating.value, comment: comment.value }
    if (wasEditing) await api.put('/shop/products/' + props.tool.id + '/reviews', details)
    else await api.post('/shop/products/' + props.tool.id + '/reviews', details)
    if (!active) return
    resetReviewForm()
    await loadReviews()
    reviewMessage.value = wasEditing ? 'Review updated.' : 'Review added.'
    emit('reviews-changed')
  } catch (error) {
    if (active) reviewMessage.value = error.response ? error.response.data.message : 'Could not save your review. Please retry.'
  } finally {
    if (active) reviewBusy.value = false
  }
}

async function deleteReview() {
  if (reviewBusy.value) return
  reviewBusy.value = true
  reviewMessage.value = ''
  try {
    await api.delete('/shop/products/' + props.tool.id + '/reviews')
    if (!active) return
    confirmDelete.value = false
    resetReviewForm()
    await loadReviews()
    reviewMessage.value = 'Review deleted.'
    emit('reviews-changed')
  } catch {
    if (active) reviewMessage.value = 'Could not delete your review. Please retry.'
  } finally {
    if (active) reviewBusy.value = false
  }
}

// Let a review write finish before closing; Escape works normally otherwise.
function handleCancel(event) {
  if (reviewBusy.value) event.preventDefault()
}

onMounted(() => {
  productDialog.value.showModal()
  loadReviews()
})
onUnmounted(() => {
  active = false
})
</script>

<template>
  <dialog ref="productDialog" class="product-details p-3 p-md-4" aria-labelledby="product-details-title" @close="emit('close')" @cancel="handleCancel">
    <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
      <h2 id="product-details-title" class="h3">{{ tool.name }}</h2>
      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="reviewBusy" @click="productDialog.close()" aria-label="Close product details">Close</button>
    </div>
    <div class="row g-3 mb-4">
      <div class="col-md-5">
        <img v-if="tool.imageUrl && !imageFailed" :src="tool.imageUrl" :alt="tool.name" class="product-photo rounded" @error="imageFailed = true" />
        <div v-else class="product-photo border rounded d-flex align-items-center justify-content-center text-muted">No product photo yet</div>
      </div>
      <div class="col-md-7">
        <p class="h4">${{ tool.price.toFixed(2) }}</p>
        <p>Sold by: {{ companyName }}</p>
        <p>{{ tool.description || 'No description added yet.' }}</p>
        <h3 class="h6">Specifications</h3>
        <p class="product-specifications">{{ tool.specifications || 'No specifications added yet.' }}</p>
        <form @submit.prevent="addSelectedQuantity">
          <label for="details-quantity" class="form-label">Quantity</label>
          <input id="details-quantity" v-model.number="quantity" type="number" min="1" max="10000" step="1" class="form-control mb-2" required />
          <button type="submit" class="btn btn-primary" :disabled="cartDisabled">Add to cart</button>
        </form>
        <p class="small mt-2" role="status">{{ addedMessage }}</p>
      </div>
    </div>

    <section class="border-top pt-3" aria-labelledby="product-reviews-title">
      <h3 id="product-reviews-title">Ratings and reviews</h3>
      <p>{{ averageRating }} · {{ reviews.length }} reviews</p>
      <p v-if="loading" role="status">Loading reviews...</p>
      <div v-if="loadError">
        <p class="text-danger">{{ loadError }}</p>
        <button type="button" class="btn btn-outline-secondary" @click="loadReviews">Retry loading reviews</button>
      </div>
      <div v-else-if="!loading">
        <div class="row g-2 mb-3">
          <div class="col-sm-6">
            <label for="review-rating-filter" class="form-label">Filter reviews</label>
            <select id="review-rating-filter" v-model="ratingFilter" class="form-select">
              <option value="">All ratings</option>
              <option v-for="star in 5" :key="star" :value="String(star)">{{ star }} stars</option>
            </select>
          </div>
          <div class="col-sm-6">
            <label for="review-sort" class="form-label">Sort reviews</label>
            <select id="review-sort" v-model="reviewSort" class="form-select">
              <option value="newest">Newest first</option><option value="highest">Highest rating</option><option value="lowest">Lowest rating</option>
            </select>
          </div>
        </div>
        <p v-if="visibleReviews.length === 0">No reviews match this selection.</p>
        <article v-for="review in visibleReviews" :key="review._id" class="border rounded p-3 mb-3">
          <p class="mb-1"><strong>{{ review.username }}</strong> · {{ review.rating }} / 5 <span class="small text-muted">Verified purchase</span></p>
          <p class="review-comment">{{ review.comment }}</p>
          <div v-if="review.mine" class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-outline-primary btn-sm" :disabled="reviewBusy" @click="startEditingReview(review)">Edit review</button>
            <button type="button" class="btn btn-outline-danger btn-sm" :disabled="reviewBusy" @click="confirmDelete = true">Delete review</button>
            <div v-if="confirmDelete" class="w-100">
              <p>Delete your review?</p>
              <button type="button" class="btn btn-danger btn-sm me-2" :disabled="reviewBusy" @click="deleteReview">Confirm delete review</button>
              <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="reviewBusy" @click="confirmDelete = false">Keep review</button>
            </div>
          </div>
        </article>

        <p v-if="!auth.isLoggedIn"><RouterLink to="/login?redirect=/shop">Log in</RouterLink> to review a product you purchased.</p>
        <p v-else-if="!purchased">Purchase this product before writing a review.</p>
        <form v-if="(canReview || editingReview) && auth.isLoggedIn" class="border rounded p-3" @submit.prevent="saveReview">
          <fieldset :disabled="reviewBusy">
            <legend class="h5">{{ editingReview ? 'Edit your review' : 'Write a review' }}</legend>
            <p id="star-rating-label" class="mb-1">Your rating</p>
            <div class="d-flex flex-wrap gap-1 mb-2" role="group" aria-labelledby="star-rating-label">
              <button v-for="star in 5" :key="star" type="button" class="btn btn-sm" :class="star <= rating ? 'btn-warning' : 'btn-outline-secondary'" :aria-label="'Rate ' + star + ' stars'" :aria-pressed="rating === star" @click="rating = star">★</button>
            </div>
            <p class="small">{{ rating }} / 5 selected</p>
            <label for="product-review-comment" class="form-label">Your review</label>
            <textarea id="product-review-comment" v-model="comment" class="form-control" rows="3" maxlength="1000" required></textarea>
            <p class="small">{{ comment.length }} / 1000 characters</p>
            <div class="d-flex flex-wrap gap-2">
              <button type="button" class="btn btn-outline-secondary" @click="preview = !preview">{{ preview ? 'Hide preview' : 'Preview review' }}</button>
              <button type="submit" class="btn btn-primary">{{ reviewBusy ? 'Saving review...' : editingReview ? 'Save review changes' : 'Submit review' }}</button>
              <button v-if="editingReview" type="button" class="btn btn-outline-secondary" @click="resetReviewForm">Cancel review edit</button>
            </div>
            <div v-if="preview" class="border rounded p-3 mt-3">
              <strong>Review preview · {{ rating }} / 5</strong>
              <p class="review-comment mb-0">{{ comment || 'Your review will appear here.' }}</p>
            </div>
          </fieldset>
        </form>
      </div>
      <p v-if="reviewMessage" class="mt-2" role="status">{{ reviewMessage }}</p>
    </section>
  </dialog>
</template>

<style scoped>
/* Native dialog supplies the focus behaviour; these rules control its appearance. */
.product-details {
  width: min(900px, calc(100vw - 2rem));
  max-height: 90vh;
  border: var(--line);
  border-radius: var(--radius);
  background: var(--cream);
  color: var(--ink);
}
.product-details::backdrop { background: rgba(0, 0, 0, 0.55); }
.product-photo { width: 100%; height: 220px; object-fit: contain; }
.product-specifications, .review-comment { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
