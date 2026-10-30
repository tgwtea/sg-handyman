<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import api, { errorMessage } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { formatDay, formatTime } from '@/utils/sgTime'

const auth = useAuthStore()
const route = useRoute()

const bookings = ref([])
const loaded = ref(false)
const loadError = ref('')
const message = ref(null) // { type: 'success' | 'danger', text }
const cancellingId = ref(null) // booking waiting for the cancel confirmation
const submitting = ref(false)

const isCustomer = computed(() => auth.user?.role === 'customer')

// null when the booking's timeslot no longer exists
function startTime(booking) {
  return booking.timeslotId ? new Date(booking.timeslotId.start).getTime() : null
}

function isPast(booking) {
  const start = startTime(booking)
  return start !== null && start <= Date.now()
}

// the server sorts by when the booking was made, so sort by slot time here
const sections = computed(() => [
  {
    title: 'Upcoming',
    empty: 'No upcoming bookings.',
    canCancel: true,
    bookings: bookings.value
      .filter((booking) => !isPast(booking))
      .sort((a, b) => (startTime(a) ?? Infinity) - (startTime(b) ?? Infinity)),
  },
  {
    title: 'Past',
    empty: 'No past bookings.',
    canCancel: false,
    bookings: bookings.value
      .filter(isPast)
      .sort((a, b) => startTime(b) - startTime(a)),
  },
])

function whenLabel(booking) {
  const { timeslotId: slot } = booking
  return slot ? `${formatDay(slot.start)}, ${formatTime(slot.start)}` : 'Time no longer available'
}

async function loadBookings() {
  if (!isCustomer.value) {
    bookings.value = []
    return
  }
  try {
    const response = await api.get('/bookings/me')
    bookings.value = response.data
    loadError.value = ''
  } catch (error) {
    loadError.value = errorMessage(error)
  } finally {
    loaded.value = true
  }
}

async function cancelBooking(booking) {
  submitting.value = true
  try {
    await api.delete(`/bookings/${booking._id}`)
    message.value = { type: 'success', text: 'Booking cancelled.' }
    await loadBookings()
  } catch (error) {
    message.value = { type: 'danger', text: errorMessage(error) }
  } finally {
    submitting.value = false
    cancellingId.value = null
  }
}

// reload when the user logs in or out, because the list depends on who is viewing
watch(() => auth.user?._id, loadBookings, { immediate: true })
</script>

<template>
  <h1 class="mb-4">My Bookings</h1>

  <div v-if="!auth.isLoggedIn" class="alert alert-info py-2">
    <RouterLink :to="{ path: '/login', query: { redirect: route.fullPath } }">Log in</RouterLink>
    as a customer to see your bookings.
  </div>

  <p v-else-if="!isCustomer" class="text-muted">Only customer accounts have bookings.</p>

  <template v-else>
    <div v-if="message" :class="`alert alert-${message.type}`" role="status">{{ message.text }}</div>
    <p v-if="loadError" class="text-danger">{{ loadError }}</p>
    <p v-if="!loaded && !loadError" class="text-muted">Loading your bookings…</p>

    <p v-else-if="bookings.length === 0 && !loadError" class="text-muted">
      You have no bookings yet. <RouterLink to="/companies">Browse companies</RouterLink>
    </p>

    <template v-else>
      <section v-for="section in sections" :key="section.title" class="mb-5">
        <h2 class="h4 mb-3">{{ section.title }}</h2>
        <p v-if="section.bookings.length === 0" class="text-muted">{{ section.empty }}</p>

        <div class="d-flex flex-column gap-3">
          <div v-for="booking in section.bookings" :key="booking._id" class="card card-body">
            <h3 class="h5 mb-1">{{ booking.service || 'Service not specified' }}</h3>
            <p class="mb-1">
              <RouterLink v-if="booking.companyId" :to="`/companies/${booking.companyId._id}`">
                {{ booking.companyId.name }}
              </RouterLink>
              <span v-else>Company no longer listed</span>
            </p>
            <p class="mb-0 text-muted">{{ whenLabel(booking) }}</p>

            <div v-if="cancellingId === booking._id" class="alert alert-danger mt-3 mb-0 py-2">
              <p class="fw-semibold mb-2">Cancel this booking? This can't be undone.</p>
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-danger" :disabled="submitting" @click="cancelBooking(booking)">Yes, cancel it</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="submitting" @click="cancellingId = null">No, keep it</button>
              </div>
            </div>
            <div v-else-if="section.canCancel" class="mt-3">
              <button type="button" class="btn btn-sm btn-outline-danger" @click="cancellingId = booking._id">Cancel booking</button>
            </div>
          </div>
        </div>
      </section>
    </template>
  </template>
</template>
