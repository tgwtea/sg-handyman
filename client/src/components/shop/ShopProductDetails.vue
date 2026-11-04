<script setup>
// Purpose: product details dialog, quantity selection and purchaser review controls.
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/api'
import ShopConfirmDialog from './ShopConfirmDialog.vue'
import ShopRatingSummary from './ShopRatingSummary.vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({ tool: Object, companyName: String, cartDisabled: Boolean })
const emit = defineEmits(['close', 'add-to-cart', 'reviews-changed'])
const auth = useAuthStore()
// Approved extra: this ref holds the actual <dialog> element, not a data value.
const productDialog = ref(null)
const quantity = ref(1)
const imageExpanded = ref(false)
const addedMessage = ref('')
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
const confirmDelete = ref(false)
let active = true

const averageRating = computed(() => {
  if (reviews.value.length === 0) return 0
  let total = 0
  for (const review of reviews.value) total += review.rating
  return total / reviews.value.length
})

// Ordinary array counting, also used by the catalogue summary endpoint.
const ratingCounts = computed(() => {
  const counts = [0, 0, 0, 0, 0]
  for (const review of reviews.value) counts[review.rating - 1]++
  return counts
})

function ratingStars(rating) {
  const filled = Math.round(rating)
  let stars = ''
  for (let star = 1; star <= 5; star++) stars += star <= filled ? '★' : '☆'
  return stars
}

//to filter/ sort the review within each product popup， place ownReview at top at all time
const visibleReviews = computed(() => {
  const result = []
    let ownReview
  for (const review of reviews.value) {
    if (review.mine) ownReview = review
    else if (!ratingFilter.value || review.rating === Number(ratingFilter.value)) result.push(review)
  }
  if (reviewSort.value === 'highest') result.sort((a, b) => b.rating - a.rating)
  else if (reviewSort.value === 'lowest') result.sort((a, b) => a.rating - b.rating)
  else result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  // Own review stays visible at the top, independent of the filter/sort for other reviews.
  const ordered = []
  if (ownReview) ordered.push(ownReview)
  for (const review of result) ordered.push(review)
  return ordered
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
  confirmDelete.value = false
}

function resetReviewForm() {
  rating.value = 0
  comment.value = ''
  editingReview.value = false
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

onMounted(() => {
  productDialog.value.showModal()
  loadReviews()
})
onUnmounted(() => {
  active = false
})
</script>

<template>
  <dialog ref="productDialog" class="product-details" aria-labelledby="product-details-title" @close="emit('close')">
    <header class="details-header d-flex justify-content-between align-items-center gap-3 p-3 p-md-4">
      <div><p class="details-eyebrow small mb-1">DIY TOOL DETAILS</p><h2 id="product-details-title" class="h4 mb-0">{{ tool.name }}</h2></div>
      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="reviewBusy" @click="productDialog.close()" aria-label="Close product details">Close</button>
    </header>
    <!-- Enlarge the photo INSIDE this existing dialog; no second photo-popup API is needed. -->
    <section v-if="imageExpanded" class="p-3 p-md-4">
      <button type="button" class="btn btn-outline-secondary btn-sm mb-3" @click="imageExpanded = false">Back to product details</button>
      <img :src="tool.imageUrl" :alt="tool.name + ' enlarged'" class="enlarged-photo" />
    </section>
    <div v-show="!imageExpanded" class="p-3 p-md-4">
      <div class="row g-4 mb-4">
        <div class="col-md-5">
          <button v-if="tool.imageUrl" type="button" class="photo-button" :aria-label="'Enlarge photo of ' + tool.name" @click="imageExpanded = true"><img :src="tool.imageUrl" :alt="tool.name" class="product-photo" /></button>
          <div v-else class="product-photo border rounded d-flex align-items-center justify-content-center text-muted">No product photo yet</div>
          <p v-if="tool.imageUrl" class="small text-muted text-center mt-2 mb-0">Click photo to enlarge</p>
        </div>
        <div class="col-md-7">
          <p class="small text-muted mb-1">PRICE (SGD)</p><p class="h3 mb-2">S${{ tool.price.toFixed(2) }}</p>
          <p class="small mb-3"><strong>Sold by:</strong> {{ companyName }}</p>
          <p class="product-description">{{ tool.description || 'No description added yet.' }}</p>
          <div class="specifications-box border rounded p-3 mb-3"><h3 class="h6">Specifications</h3><p class="product-specifications small mb-0">{{ tool.specifications || 'No specifications added yet.' }}</p></div>
          <form class="border-top pt-3" @submit.prevent="addSelectedQuantity">
            <label for="details-quantity" class="form-label">Quantity</label>
            <div class="row g-2 align-items-end"><div class="col-4"><input id="details-quantity" v-model.number="quantity" type="number" min="1" max="10000" step="1" class="form-control" required /></div><div class="col-8"><button type="submit" class="btn btn-primary w-100" :disabled="cartDisabled">Add to cart</button></div></div>
          </form>
          <p class="small mt-2 mb-0" role="status">{{ addedMessage }}</p>
        </div>
      </div>
      <section class="border-top pt-4" aria-labelledby="product-reviews-title">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><h3 id="product-reviews-title" class="h4 mb-0">Ratings and reviews</h3><ShopRatingSummary v-if="reviews.length" :average="averageRating" :count="reviews.length" :ratings="ratingCounts" /><span v-else class="small text-muted">No reviews yet</span></div>
        <p v-if="loading" class="small" role="status">Loading reviews...</p>
        <div v-if="loadError"><p class="text-danger">{{ loadError }}</p><button type="button" class="btn btn-outline-secondary" @click="loadReviews">Retry loading reviews</button></div>
        <div v-else-if="!loading">
          <div class="row g-2 mb-3">
            <div class="col-sm-6"><label for="review-rating-filter" class="form-label small">Filter reviews</label><select id="review-rating-filter" v-model="ratingFilter" class="form-select"><option value="">All ratings</option><option v-for="star in 5" :key="star" :value="String(star)">{{ star }} stars</option></select></div>
            <div class="col-sm-6"><label for="review-sort" class="form-label small">Sort reviews</label><select id="review-sort" v-model="reviewSort" class="form-select"><option value="newest">Newest first</option><option value="highest">Highest rating</option><option value="lowest">Lowest rating</option></select></div>
          </div>
          <p v-if="visibleReviews.length === 0">No reviews match this selection.</p>
          <article v-for="review in visibleReviews" :key="review._id" class="review-card border rounded p-3 mb-3" :class="{ 'own-review': review.mine }">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-2"><strong>{{ review.username }}</strong><span class="small"><span class="text-warning">{{ ratingStars(review.rating) }}</span> <strong>{{ review.rating.toFixed(2) }}</strong></span></div>
            <span class="badge bg-success mb-2">Verified purchase</span><span v-if="review.mine" class="badge bg-primary ms-2 mb-2">Your review</span>
        <form v-if="review.mine && editingReview" class="border rounded p-3" @submit.prevent="saveReview">
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
              <button type="submit" class="btn btn-primary">{{ reviewBusy ? 'Saving review...' : editingReview ? 'Save review changes' : 'Submit review' }}</button>
              <button v-if="editingReview" type="button" class="btn btn-outline-secondary" @click="resetReviewForm">Cancel review edit</button>
            </div>
          </fieldset>
        </form>

            <template v-else>
              <p class="review-comment mb-2">{{ review.comment }}</p>
              <p v-if="review.editedByAdmin" class="small text-muted">Edited by admin</p>
              <div v-if="review.mine" class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-outline-primary btn-sm" :disabled="reviewBusy" @click="startEditingReview(review)">Edit review</button><button type="button" class="btn btn-outline-danger btn-sm" :disabled="reviewBusy" @click="confirmDelete = true">Delete review</button></div>
            </template>
          </article>
          <p v-if="!auth.isLoggedIn" class="small"><RouterLink to="/login?redirect=/shop">Log in</RouterLink> to review a product you purchased.</p>
          <p v-else-if="!purchased" class="small">Purchase this product before writing a review.</p>
        <form v-if="canReview && !editingReview && auth.isLoggedIn" class="border rounded p-3" @submit.prevent="saveReview">
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
              <button type="submit" class="btn btn-primary">{{ reviewBusy ? 'Saving review...' : editingReview ? 'Save review changes' : 'Submit review' }}</button>
              <button v-if="editingReview" type="button" class="btn btn-outline-secondary" @click="resetReviewForm">Cancel review edit</button>
            </div>
          </fieldset>
        </form>

        </div>
        <p v-if="reviewMessage" class="mt-2 small" role="status">{{ reviewMessage }}</p>
      </section>
    </div>
    <ShopConfirmDialog v-if="confirmDelete" title="Confirm deletion" message="Are you sure you want to delete your product review?" note="Your rating and comment will be permanently deleted. This cannot be undone." confirm-label="✓ Yes, Delete Review" :busy="reviewBusy" @cancel="confirmDelete = false" @confirm="deleteReview" />
  </dialog>
</template>

<style scoped>
.product-details { padding: 0; width: min(960px, calc(100vw - 2rem)); max-height: 90vh; border: var(--line); border-radius: var(--radius); background: var(--cream); color: var(--ink); }
.product-details::backdrop { background: rgba(0, 0, 0, 0.55); }
.details-header { background: var(--ink); color: white; border-bottom: 5px solid #ffd600; }
.details-header .btn { background: white; }
.details-eyebrow { color: #ffd600; letter-spacing: 0.08em; }
.photo-button { display: block; width: 100%; padding: 12px; border: 1px solid #d6cba9; border-radius: 8px; box-shadow: none; background: white; cursor: zoom-in; }
.product-photo { width: 100%; height: 260px; object-fit: contain; }
.enlarged-photo { display: block; width: 100%; height: 65vh; object-fit: contain; background: white; }
.specifications-box, .review-card { background: #fffdf5; }
.own-review { border-left: 5px solid #d6a600 !important; }
.product-description { line-height: 1.7; }
.product-specifications, .review-comment { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
