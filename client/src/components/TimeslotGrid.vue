<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api, { errorMessage } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { formatDay, formatTime } from '@/utils/sgTime'

const props = defineProps({
  companyId: { type: String, required: true },
  services: { type: Array, default: () => [] },
})

const POLL_MS = 1000

const auth = useAuthStore()
const route = useRoute()

const timeslots = ref([])
const loadError = ref('')
const message = ref(null) // { type: 'success' | 'danger' | 'warning', text }
const selectedId = ref(null)
const service = ref('')
const submitting = ref(false)
const confirming = ref(null) // null | 'book' | 'cancel'

let timer = null
let inFlight = false

async function loadTimeslots() {
  // skip a tick while the last request is still open, so slow responses do not pile up
  if (inFlight) return
  inFlight = true
  try {
    const response = await api.get(`/companies/${props.companyId}/timeslots`)
    timeslots.value = response.data
    loadError.value = ''
  } catch (error) {
    loadError.value = errorMessage(error)
  } finally {
    inFlight = false
  }
}

onMounted(() => {
  loadTimeslots()
  timer = setInterval(loadTimeslots, POLL_MS)
})

onUnmounted(() => {
  clearInterval(timer)
})

const days = computed(() => {
  const groups = new Map()
  for (const slot of timeslots.value) {
    const day = formatDay(slot.start)
    if (!groups.has(day)) groups.set(day, [])
    groups.get(day).push(slot)
  }
  return [...groups].map(([day, slots]) => ({ day, slots }))
})

const selected = computed(() => timeslots.value.find((slot) => slot._id === selectedId.value) ?? null)

watch(
  () => props.services,
  (services) => {
    if (!service.value && services.length > 0) service.value = services[0]
  },
  { immediate: true },
)

function slotClass(slot) {
  if (slot.mine) return 'btn-primary'
  if (slot.taken) return 'btn-outline-secondary'
  if (slot._id === selectedId.value) return 'btn-success'
  return 'btn-outline-success'
}

function selectSlot(slot) {
  message.value = null
  confirming.value = null
  selectedId.value = slot._id === selectedId.value ? null : slot._id
}

async function book() {
  submitting.value = true
  try {
    await api.post('/bookings', { timeslotId: selectedId.value, service: service.value })
    message.value = { type: 'success', text: `Booked ${formatDay(selected.value.start)}, ${formatTime(selected.value.start)}.` }
  } catch (error) {
    message.value = { type: 'danger', text: errorMessage(error) }
  } finally {
    selectedId.value = null
    confirming.value = null
    submitting.value = false
    loadTimeslots()
  }
}

async function cancel() {
  submitting.value = true
  try {
    await api.delete(`/bookings/${selected.value.bookingId}`)
    message.value = { type: 'success', text: 'Booking cancelled.' }
  } catch (error) {
    message.value = { type: 'danger', text: errorMessage(error) }
  } finally {
    selectedId.value = null
    confirming.value = null
    submitting.value = false
    loadTimeslots()
  }
}
</script>

<template>
  <section class="mt-4">
    <h3>Available timeslots</h3>
    <p class="text-body-secondary small mb-2">
      Singapore time. Updates every second.
      <span class="badge text-bg-success">free</span>
      <span class="badge text-bg-secondary">taken</span>
      <span class="badge text-bg-primary">yours</span>
    </p>

    <div v-if="loadError" class="alert alert-warning py-2">Could not refresh timeslots: {{ loadError }}</div>
    <div v-if="message" :class="['alert', `alert-${message.type}`, 'py-2']">{{ message.text }}</div>

    <p v-if="!loadError && timeslots.length === 0" class="text-body-secondary">No upcoming timeslots.</p>

    <div class="d-flex flex-column gap-3">
      <div v-for="group in days" :key="group.day">
        <div class="fw-semibold mb-1">{{ group.day }}</div>
        <div class="d-flex flex-wrap gap-2">
          <button
            v-for="slot in group.slots"
            :key="slot._id"
            :data-testid="`slot-${slot._id}`"
            type="button"
            :class="['btn', 'btn-sm', slotClass(slot)]"
            :disabled="(slot.taken && !slot.mine) || !auth.isLoggedIn || auth.user.role !== 'customer'"
            :title="slot.mine ? `Your booking: ${slot.service}` : slot.taken ? 'Taken' : 'Free'"
            @click="selectSlot(slot)"
          >
            {{ formatTime(slot.start) }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="!auth.isLoggedIn" class="alert alert-info mt-3 py-2">
      <RouterLink :to="{ path: '/login', query: { redirect: route.fullPath } }">Log in</RouterLink>
      as a customer to book.
    </div>

    <div v-if="selected" class="card mt-3">
      <div class="card-body">
        <h5 class="card-title">{{ formatDay(selected.start) }}, {{ formatTime(selected.start) }} – {{ formatTime(selected.end) }}</h5>

        <template v-if="selected.mine">
          <p class="card-text">Your booking: {{ selected.service }}</p>
          <div v-if="confirming === 'cancel'">
            <p class="card-text">
              Cancel your {{ selected.service }} booking on {{ formatDay(selected.start) }}, {{ formatTime(selected.start) }}?
            </p>
            <div class="d-flex gap-2">
              <button class="btn btn-danger" :disabled="submitting" @click="cancel">Yes, cancel it</button>
              <button class="btn btn-outline-secondary" :disabled="submitting" @click="confirming = null">No, keep it</button>
            </div>
          </div>
          <button v-else class="btn btn-outline-danger" @click="confirming = 'cancel'">Cancel booking</button>
        </template>

        <template v-else>
          <div v-if="confirming === 'book'">
            <p class="card-text">Book {{ formatDay(selected.start) }}, {{ formatTime(selected.start) }} for {{ service }}?</p>
            <div class="d-flex gap-2">
              <button class="btn btn-success" :disabled="submitting" @click="book">Yes, book it</button>
              <button class="btn btn-outline-secondary" :disabled="submitting" @click="confirming = null">No</button>
            </div>
          </div>
          <template v-else>
            <label for="service" class="form-label">Service</label>
            <select id="service" v-model="service" class="form-select mb-3">
              <option v-for="name in services" :key="name" :value="name">{{ name }}</option>
            </select>
            <button class="btn btn-success" @click="confirming = 'book'">Confirm booking</button>
          </template>
        </template>
      </div>
    </div>
  </section>
</template>
