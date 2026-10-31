<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { errorMessage } from '@/api'
import { formatDay, formatTime, formatTimeRange, toDateInput, toTimeInput, fromInputs } from '@/utils/sgTime'

const props = defineProps({
  companyId: { type: String, required: true },
})

// the public grid shows 14 days; a business can plan further ahead
const MANAGE_RANGE_DAYS = 90

const timeslots = ref([])
const message = ref(null) // { type, text }
const editingId = ref(null)
const form = ref(emptyForm())
const submitting = ref(false)

function emptyForm() {
  return { date: '', start: '09:00', end: '10:00' }
}

const formTitle = computed(() => (editingId.value ? 'Edit timeslot' : 'Add timeslot'))

async function loadTimeslots() {
  try {
    const to = new Date(Date.now() + MANAGE_RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const response = await api.get(`/companies/${props.companyId}/timeslots`, { params: { to } })
    timeslots.value = response.data
  } catch (error) {
    message.value = { type: 'danger', text: errorMessage(error) }
  }
}

onMounted(loadTimeslots)

function startEdit(slot) {
  message.value = null
  editingId.value = slot._id
  form.value = { date: toDateInput(slot.start), start: toTimeInput(slot.start), end: toTimeInput(slot.end) }
}

function resetForm() {
  editingId.value = null
  form.value = emptyForm()
}

async function save() {
  submitting.value = true
  message.value = null
  const body = {
    start: fromInputs(form.value.date, form.value.start),
    end: fromInputs(form.value.date, form.value.end),
  }
  try {
    if (editingId.value) {
      await api.put(`/timeslots/${editingId.value}`, body)
      message.value = { type: 'success', text: 'Timeslot updated.' }
    } else {
      await api.post('/timeslots', { ...body, companyId: props.companyId })
      message.value = { type: 'success', text: 'Timeslot added.' }
    }
    resetForm()
  } catch (error) {
    message.value = { type: 'danger', text: errorMessage(error) }
  } finally {
    submitting.value = false
    loadTimeslots()
  }
}

async function remove(slot) {
  if (!confirm(`Delete the timeslot on ${formatDay(slot.start)} at ${formatTime(slot.start)}?`)) return
  message.value = null
  try {
    await api.delete(`/timeslots/${slot._id}`)
    message.value = { type: 'success', text: 'Timeslot deleted.' }
    if (editingId.value === slot._id) resetForm()
  } catch (error) {
    message.value = { type: 'danger', text: errorMessage(error) }
  } finally {
    loadTimeslots()
  }
}
</script>

<template>
  <section class="card mt-4">
    <div class="card-body">
      <h3 class="card-title h5">Manage timeslots</h3>
      <div v-if="message" :class="['alert', `alert-${message.type}`, 'py-2']">{{ message.text }}</div>

      <form class="row g-2 align-items-end mb-3" @submit.prevent="save">
        <div class="col-12 fw-semibold">{{ formTitle }}</div>
        <div class="col-12 col-sm-4">
          <label for="slot-date" class="form-label small">Date</label>
          <input id="slot-date" v-model="form.date" type="date" class="form-control" required />
        </div>
        <div class="col-6 col-sm-3">
          <label for="slot-start" class="form-label small">Start</label>
          <input id="slot-start" v-model="form.start" type="time" step="900" class="form-control" required />
        </div>
        <div class="col-6 col-sm-3">
          <label for="slot-end" class="form-label small">End</label>
          <input id="slot-end" v-model="form.end" type="time" step="900" class="form-control" required />
        </div>
        <div class="col-12 col-sm-2 d-flex gap-2">
          <button class="btn btn-primary flex-fill" type="submit" :disabled="submitting">
            {{ editingId ? 'Save' : 'Add' }}
          </button>
          <button v-if="editingId" class="btn btn-outline-secondary" type="button" @click="resetForm">✕</button>
        </div>
      </form>

      <div class="table-responsive" style="max-height: 24rem">
        <table class="table table-sm align-middle mb-0">
          <thead class="sticky-top">
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Time</th>
              <th scope="col">Status</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in timeslots" :key="slot._id" :class="{ 'table-active': slot._id === editingId }">
              <td>{{ formatDay(slot.start) }}</td>
              <td>{{ formatTimeRange(slot.start, slot.end) }}</td>
              <td>
                <span :class="['badge', slot.taken ? 'text-bg-secondary' : 'text-bg-success']">
                  {{ slot.taken ? 'Booked' : 'Free' }}
                </span>
              </td>
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-outline-primary me-1" :disabled="slot.taken" @click="startEdit(slot)">
                  Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" :disabled="slot.taken" @click="remove(slot)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
