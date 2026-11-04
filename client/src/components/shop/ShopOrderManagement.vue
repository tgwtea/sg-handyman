<script setup>
// Purpose: a company's package controls, or an admin's complete order list.
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderCategory, orderLabel, orderDate } from '@/utils/shop-orders'
import api from '@/api'
import ShopConfirmDialog from './ShopConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
const props = defineProps({ section: String })
const emit = defineEmits(['removed'])
const auth = useAuthStore()
const expandedOrderId = ref('')
const pendingRemovalId = ref('')
const confirmRejection = ref(false)
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
  expandedOrderId.value = order._id
  selectedOrder.value = order
  confirmRejection.value = false
  selectedItem.value = item
  action.value = name
  reason.value = ''
  minutes.value = 5
  message.value = ''
}
// Delay saves the existing form directly; rejections get the same final popup as removals.
function requestAction() {
  if (action.value === 'delay') confirmAction()
  else confirmRejection.value = true
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
// These computed values reuse the same status rules as the customer screen.
const heading = computed(() => {
  if (props.section === 'history') return 'Management order history'
  if (props.section === 'cancelled') return 'Cancelled management orders'
  return 'Active management orders'
})
function inSection(order) {
  const category = orderCategory(order, now.value)
  if (props.section === 'history') return category === 'history' || category === 'untracked'
  return category === props.section
}
const count = computed(() => {
  let total = 0
  for (const order of orders.value) if (inSection(order)) total++
  return total
})
function toggleDetails(order) {
  if (expandedOrderId.value === order._id) expandedOrderId.value = ''
  else expandedOrderId.value = order._id
}
function canRemove(order) {
  const category = orderCategory(order, now.value)
  return auth.user.role === 'admin' && (category === 'history' || category === 'cancelled')
}
async function removeOrder(order) {
  if (busy.value) return
  busy.value = true
  try {
    const response = await api.put('/shop/orders/' + order._id + '/hide')
    message.value = response.data.message
    pendingRemovalId.value = ''
    emit('removed', order._id)
    await loadOrders()
  } catch (error) {
    message.value = error.response ? error.response.data.message : 'Could not remove this order.'
  } finally { busy.value = false }
}
onMounted(() => { loadOrders(); timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { active = false; clearInterval(timer) })
</script>

<template>
  <section>
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div><h2 class="h4 mb-1">{{ heading }}</h2><p class="small text-muted mb-0">{{ count }} orders · {{ auth.user.role === 'admin' ? 'All companies' : 'Your company only' }}</p></div>
      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="loading || busy" @click="loadOrders">Refresh management orders</button>
    </div>
    <p v-if="auth.user.role === 'business'" class="small">Delaying a package delays all its remaining items.</p>
    <p v-if="message" class="alert alert-info" role="status">{{ message }}</p>
    <p v-if="count === 0 && !loading" class="border rounded p-4">No orders in this section.</p>
    <article v-for="order in orders" v-show="inSection(order)" :key="order._id" class="border rounded mb-3">
      <div class="p-3">
        <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
          <div><p class="small text-muted mb-1">ORDER REFERENCE</p><h3 class="h6 text-break mb-1">{{ order._id }}</h3><p class="small mb-0">{{ orderDate(order) }} · <strong>{{ order.recipientName }}</strong></p></div>
          <strong class="small">{{ orderLabel(orderCategory(order, now)) }}</strong>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-outline-primary btn-sm" @click="toggleDetails(order)">{{ expandedOrderId === order._id ? 'Hide details' : 'View details' }}</button>
          <button v-if="canRemove(order)" type="button" class="btn btn-outline-danger btn-sm" :disabled="busy" @click="pendingRemovalId = order._id">Remove from my list</button>
        </div>
        <ShopConfirmDialog v-if="pendingRemovalId === order._id" title="Confirm removal" message="Remove this completed order from your admin list?" note="Other admins, the customer and the company keep their records." confirm-label="✓ Yes, Remove Order" :busy="busy" @cancel="pendingRemovalId = ''" @confirm="removeOrder(order)" />
      </div>
      <div v-show="expandedOrderId === order._id" class="border-top p-3">
      <h4 class="h6">Delivery details</h4><p class="small"><strong>Recipient:</strong> {{ order.recipientName }}<br /><strong>Address:</strong> {{ order.deliveryAddress }}</p>
      <p v-if="order.deliveryNote" class="small"><strong>Delivery note:</strong> {{ order.deliveryNote }}</p>
      <div v-for="parcel in order.packages" :key="parcel.companyId" class="border rounded p-2 mb-2">
        <strong>{{ parcel.companyName }}</strong>
        <p class="small text-muted">{{ packageActive(order, parcel) ? 'Delivery in progress' : 'No active delivery' }} · Added delay: {{ parcel.extraSeconds / 60 }} minutes</p>
        <button v-if="auth.user.role === 'business'" class="btn btn-outline-secondary btn-sm mb-2" :disabled="busy || !packageActive(order, parcel)" @click="startAction(order, 'delay')">Delay package</button>
        <template v-for="item in order.items" :key="item.id">
          <div v-if="item.companyId === parcel.companyId" class="small mb-2">
            <strong>{{ item.name }}</strong> × {{ item.quantity }} — ${{ (item.price * item.quantity).toFixed(2) }}
            <p v-if="item.rejected" class="text-danger">Rejected: {{ item.rejectionReason }}</p>
            <button v-else-if="auth.user.role === 'business'" class="btn btn-outline-danger btn-sm ms-2" :disabled="busy || !packageActive(order, parcel)" @click="startAction(order, 'item', item)">Reject {{ item.name }}</button>
          </div>
        </template>
      </div>
      <div v-if="!order.packages.length">
        <p>Older order: company package information was not saved. Read-only.</p>
        <ul><li v-for="item in order.items" :key="item.id">{{ item.name }} × {{ item.quantity }}</li></ul>
      </div>
      <p class="small fw-bold">Original {{ auth.user.role === 'business' ? 'company subtotal' : 'order total' }}: ${{ order.total.toFixed(2) }}</p>
      <p v-for="update in order.updates" :key="update._id" class="small">{{ update.message }}</p>
      <button v-if="auth.user.role === 'admin'" class="btn btn-outline-danger" :disabled="busy || !canRejectOrder(order)" @click="startAction(order, 'order')">Reject whole order</button>
      <form v-if="selectedOrder && selectedOrder._id === order._id" class="border rounded p-3 mt-3" @submit.prevent="requestAction">
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
      </div>
    </article>
    <ShopConfirmDialog v-if="confirmRejection && selectedOrder" title="Confirm cancellation" :message="action === 'item' ? 'Reject all units of ' + selectedItem.name + '?' : 'Reject all remaining items in this order?'" :note="'Reason shown to the customer: ' + reason" confirm-label="✓ Yes, Reject Items" :busy="busy" :error="message" @cancel="confirmRejection = false" @confirm="confirmAction" />
  </section>
</template>
