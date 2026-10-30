<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import api, { errorMessage } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { formatDay } from '@/utils/sgTime'

const props = defineProps({
  companyId: { type: String, required: true },
})
const auth = useAuthStore()
const route = useRoute()
const reviews = ref([])
const hasBooking = ref(false)
const reviewableBookings = ref([])
const loadError = ref('')
const message = ref(null) // { type: 'success' | 'danger', text }
const submitting = ref(false)

// one form for both a new review and an edit
const form = ref({ bookingId: '', rating: 5, comment: '' })
const editingId = ref(null)
const deletingId = ref(null) // review waiting for the delete confirmation
const showForm = computed(() => reviewableBookings.value.length > 0 || editingId.value !== null)

const average = computed(() => {
  if (reviews.value.length === 0) return 0
  const total = reviews.value.reduce((sum, review) => sum + review.rating, 0)
  return total / reviews.value.length
})

function stars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// e.g. "✓ Booked: Aircon servicing"
function bookingLabel(booking) {
  return booking.service ? `✓ Booked: ${booking.service}` : '✓ Booked this company'
}

// e.g. "Aircon Servicing (Fri, 13 Nov)"; the date separates two bookings of one service
function bookingOption(booking) {
  const service = booking.service || 'Booking'
  return booking.start ? `${service} (${formatDay(booking.start)})` : service
}

async function loadReviews() {
  try {
    const response = await api.get(`/reviews/company/${props.companyId}`)
    reviews.value = response.data.reviews
    hasBooking.value = response.data.hasBooking
    reviewableBookings.value = response.data.reviewableBookings
    // keep the chosen booking if it is still open, otherwise pick the first one
    if (!reviewableBookings.value.some((booking) => booking._id === form.value.bookingId)) {
      form.value.bookingId = reviewableBookings.value[0]?._id ?? ''
    }
    loadError.value = ''
  } catch (error) {
    loadError.value = errorMessage(error)
  }
}

function startEdit(review) {
  editingId.value = review._id
  form.value = { ...form.value, rating: review.rating, comment: review.comment }
  message.value = null
}

function resetForm() {
  editingId.value = null
  form.value = { ...form.value, rating: 5, comment: '' }
}

async function submitReview() {
  submitting.value = true
  message.value = null
  try {
    if (editingId.value) {
      await api.put(`/reviews/${editingId.value}`, form.value)
      message.value = { type: 'success', text: 'Review updated.' }
    } else {
      await api.post(`/reviews/company/${props.companyId}`, form.value)
      message.value = { type: 'success', text: 'Thanks for your review!' }
    }
    resetForm()
    await loadReviews()
  } catch (error) {
    message.value = { type: 'danger', text: errorMessage(error) }
  } finally {
    submitting.value = false
  }
}

async function deleteReview(review) {
  submitting.value = true
  try {
    await api.delete(`/reviews/${review._id}`)
    if (editingId.value === review._id) resetForm()
    message.value = { type: 'success', text: 'Review deleted.' }
    await loadReviews()
  } catch (error) {
    message.value = { type: 'danger', text: errorMessage(error) }
  } finally {
    submitting.value = false
    deletingId.value = null
  }
}

// reload when the user logs in or out, because canReview and "mine" depend on who is viewing
watch(() => auth.user?._id, loadReviews, { immediate: true })
</script>

<template>
  <section id="reviews" class="mt-5">
    <h3>Reviews</h3>
        <p class="small text-muted mb-2">Only customers who book this company on SG Handyman can leave a review.</p>

    <p v-if="reviews.length" class="text-muted">
      <span class="text-warning">{{ stars(Math.round(average)) }}</span>
      {{ average.toFixed(1) }} from {{ reviews.length }} review{{ reviews.length === 1 ? '' : 's' }}
    </p>

    <p v-if="loadError" class="text-danger">{{ loadError }}</p>
    <div v-if="message" :class="`alert alert-${message.type}`" role="status">{{ message.text }}</div>

    <form v-if="showForm" @submit.prevent="submitReview" class="card card-body mb-4" style="max-width: 32rem">
      <h4 class="h5">{{ editingId ? 'Edit your review' : 'Write a review' }}</h4>
      
      <div v-if="!editingId" class="mb-3">
        <label for="review-booking" class="form-label">Booking</label>
        <select id="review-booking" v-model="form.bookingId" class="form-select" required>
          <option v-for="booking in reviewableBookings" :key="booking._id" :value="booking._id">{{ bookingOption(booking) }}</option>
        </select>
      </div>

      <div class="mb-3">
        <label for="review-rating" class="form-label">Rating</label>
        <select id="review-rating" v-model.number="form.rating" class="form-select">
          <option v-for="n in [5, 4, 3, 2, 1]" :key="n" :value="n">{{ stars(n) }} ({{ n }})</option>
        </select>
      </div>
      <div class="mb-3">
        <label for="review-comment" class="form-label">Comment</label>
        <textarea id="review-comment" v-model.trim="form.comment" class="form-control" rows="3" maxlength="1000"></textarea>
      </div>
      <div class="d-flex gap-2">
        <button type="submit" class="btn btn-primary" :disabled="submitting">
          {{ editingId ? 'Save' : 'Post review' }}
        </button>
        <button v-if="editingId" type="button" class="btn btn-outline-secondary" @click="resetForm">Cancel</button>
      </div>
    </form>

    <div v-else-if="!auth.isLoggedIn" class="alert alert-info mt-3 py-2">
      <RouterLink :to="{ path: '/login', query: { redirect: route.fullPath } }">Log in</RouterLink>
      as a customer to review.
    </div>

    <p v-else-if="auth.user.role === 'customer' && !hasBooking" class="text-muted">
      Book this company to leave a review.
    </p>

    <p v-if="!reviews.length && !loadError" class="text-muted">No reviews yet.</p>

    <ul class="list-unstyled">
      <li v-for="review in reviews" :key="review._id" class="border-bottom py-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <strong>{{ review.username }}</strong>
            <div v-if="review.booking" class="my-1">
              <span class="badge text-bg-success">{{ bookingLabel(review.booking) }}</span>
            </div>            
            <div class="text-warning" :aria-label="`${review.rating} out of 5 stars`">{{ stars(review.rating) }}</div>
          </div>
          <small class="text-muted">{{ formatDate(review.createdAt) }}</small>
        </div>
        <p v-if="review.comment" class="mb-1 mt-2">{{ review.comment }}</p>
        <div v-if="deletingId === review._id" class="alert alert-danger mt-3 mb-0 py-2">

          <p class="fw-semibold mb-2">Delete this review? This can't be undone.</p>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-danger" :disabled="submitting" @click="deleteReview(review)">Yes, delete it</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="submitting" @click="deletingId = null">No, keep it</button>
          </div>
        </div>
        <div v-else-if="review.mine || auth.user?.role === 'admin'" class="d-flex gap-2 mt-2">
          <button v-if="review.mine" type="button" class="btn btn-sm btn-outline-primary" @click="startEdit(review)">Edit</button>
          <button type="button" class="btn btn-sm btn-outline-danger" @click="deletingId = review._id">Delete</button>
        </div>

      </li>
    </ul>
  </section>
</template>
