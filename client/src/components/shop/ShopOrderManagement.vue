<script setup>
// Purpose: a company's package controls, or an admin's complete order list.
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const orders = ref([])
const loading = ref(false)
const busy = ref(false)
const message = ref('')
const selectedOrder = ref(null)
const selectedItem = ref(null)
const action = ref('')
const minutes = ref(5)
const reason = ref('')
const now = ref(Date.now())
let active = true
let timer

async function loadOrders() {
  loading.value = true
  try {
    const response = await api.get('/shop/manage/orders')
    if (active) orders.value = response.data
  } catch (error) {
    if (active) message.value = error.response ? error.response.data.message : 'Could not load orders.'
  } finally { if (active) loading.value = false }
}
function packageActive(order, parcel) {
  let remaining = false
  for (const item of order.items) if (item.companyId === parcel.companyId && !item.rejected) remaining = true
  //if new is less than now.value, package no moer active
  return remaining && now.value < new Date(order.createdAt).getTime() + (order.deliveryDurationSeconds + parcel.extraSeconds) * 1000
}
function canRejectOrder(order) {
  if (!order.packages.length) return false
  let remaining = false
  for (const item of order.items) {
    if (!item.rejected) {
      remaining = true
      for (const parcel of order.packages) if (parcel.companyId === item.companyId && !packageActive(order, parcel)) return false
    }
  }
  return remaining
}
function startAction(order, name, item = null) {
  selectedOrder.value = order
  selectedItem.value = item
  action.value = name
  reason.value = ''
  minutes.value = 5
  message.value = ''
}
async function confirmAction() {
  if (busy.value || !selectedOrder.value) return
  busy.value = true
  message.value = ''
  const order = selectedOrder.value
  let path = '/shop/manage/orders/' + order._id
  if (action.value === 'delay') path += '/delay'
  else if (action.value === 'item') path += '/items/' + selectedItem.value.id + '/reject'
  else path += '/reject'
  try {
    const response = await api.put(path, { reason: reason.value, minutes: minutes.value })
    if (!active) return
    message.value = response.data.message
    selectedOrder.value = null
    await loadOrders()
  } catch (error) {
    if (active) message.value = error.response ? error.response.data.message : 'Could not save. Refresh before retrying.'
  } finally { if (active) busy.value = false }
}
onMounted(() => { loadOrders(); timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { active = false; clearInterval(timer) })
</script>

<template>
  <section class="border rounded p-3 my-4">
    <h2>{{ auth.user.role === 'admin' ? 'Manage all orders' : 'Company orders' }}</h2>
    <p v-if="auth.user.role === 'business'">Only your company's items appear here. Delaying a package delays all its remaining items.</p>
    <button class="btn btn-outline-secondary mb-3" :disabled="loading || busy" @click="loadOrders">Refresh management orders</button>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="loading">Loading orders...</p>
    <p v-else-if="orders.length === 0">No orders to manage yet.</p>
    <article v-for="order in orders" :key="order._id" class="border-top py-3">
      <h3 class="h6">Order {{ order._id }}</h3>
      <p>{{ order.recipientName }} · {{ order.deliveryAddress }}</p>
      <p v-if="order.deliveryNote">Delivery note: {{ order.deliveryNote }}</p>
      <div v-for="parcel in order.packages" :key="parcel.companyId" class="border rounded p-2 mb-2">
        <strong>{{ parcel.companyName }}</strong>
        <p class="small">{{ packageActive(order, parcel) ? 'Delivery in progress' : 'Delivered or fully rejected' }} · Added delay: {{ parcel.extraSeconds / 60 }} minutes</p>
        <button v-if="auth.user.role === 'business'" class="btn btn-outline-secondary btn-sm mb-2" :disabled="busy || !packageActive(order, parcel)" @click="startAction(order, 'delay')">Delay package</button>
        <template v-for="item in order.items" :key="item.id">
          <div v-if="item.companyId === parcel.companyId" class="mb-2">
            {{ item.name }} × {{ item.quantity }} — ${{ (item.price * item.quantity).toFixed(2) }}
            <p v-if="item.rejected" class="text-danger">Rejected: {{ item.rejectionReason }}</p>
            <button v-else-if="auth.user.role === 'business'" class="btn btn-outline-danger btn-sm ms-2" :disabled="busy || !packageActive(order, parcel)" @click="startAction(order, 'item', item)">Reject {{ item.name }}</button>
          </div>
        </template>
      </div>
      <div v-if="!order.packages.length">
        <p>Older order: company package information was not saved. Read-only.</p>
        <ul><li v-for="item in order.items" :key="item.id">{{ item.name }} × {{ item.quantity }}</li></ul>
      </div>
      <p>Original {{ auth.user.role === 'business' ? 'company subtotal' : 'order total' }}: ${{ order.total.toFixed(2) }}</p>
      <p v-for="update in order.updates" :key="update._id" class="small">{{ update.message }}</p>
      <button v-if="auth.user.role === 'admin'" class="btn btn-outline-danger" :disabled="busy || !canRejectOrder(order)" @click="startAction(order, 'order')">Reject whole order</button>
      <form v-if="selectedOrder && selectedOrder._id === order._id" class="border rounded p-3 mt-3" @submit.prevent="confirmAction">
        <fieldset :disabled="busy">
          <legend class="h5">{{ action === 'delay' ? 'Delay this package' : action === 'item' ? 'Reject all units of ' + selectedItem.name : 'Reject all remaining items in this order' }}</legend>
          <label v-if="action === 'delay'" for="delay-minutes">Extra minutes (1–60)</label>
          <input v-if="action === 'delay'" id="delay-minutes" v-model.number="minutes" type="number" min="1" max="60" step="1" required class="form-control mb-2" />
          <label for="order-action-reason">Reason shown to the customer</label>
          <textarea id="order-action-reason" v-model.trim="reason" maxlength="300" required class="form-control mb-2"></textarea>
          <button class="btn btn-primary me-2" type="submit">Confirm {{ action === 'delay' ? 'delay' : 'rejection' }}</button>
          <button class="btn btn-outline-secondary" type="button" @click="selectedOrder = null">Cancel</button>
        </fieldset>
      </form>
    </article>
  </section>
</template>
