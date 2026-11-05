<script setup>
// Purpose: company/admin order inspection, cancellation and completed-record removal.
import { useRoute } from 'vue-router'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderCategory, orderLabel, orderDate, canCancelOrder, cancellationText } from '@/utils/shop-orders'
import api, { errorMessage } from '@/api'
import DeleteDialog from '@/components/DeleteDialog.vue'
import { useAuthStore } from '@/stores/auth'
const props = defineProps({ section: String })
const emit = defineEmits(['removed', 'cancelled', 'order-notification'])
const auth = useAuthStore()
const route = useRoute()
const expandedOrderId = ref('')
const pendingRemovalId = ref('')
const confirmCancellation = ref(false)
const orders = ref([])
const loading = ref(false)
const busy = ref(false)
const message = ref('')
const selectedOrder = ref(null)
const reason = ref('')
const now = ref(Date.now())
let timer
let refreshTimer

async function loadOrders() {
  if (loading.value || busy.value) return
  loading.value = true
  try {
    const response = await api.get('/shop/manage/orders')
    // Notify a company only when a CUSTOMER newly cancels an order it already saw.
    if (auth.user.role === 'business') {
      for (const order of response.data) {
        let previous
        for (const old of orders.value) if (old._id === order._id) previous = old
        if (previous && orderCategory(previous, now.value) !== 'cancelled' && orderCategory(order, now.value) === 'cancelled') {
          const notice = cancellationText(order)
          if (notice.startsWith('Customer cancelled')) emit('order-notification', notice)
        }
      }
    }
    orders.value = response.data
  } catch (error) {
    message.value = errorMessage(error)
  } finally { loading.value = false }
}
function startAction(order) {
  expandedOrderId.value = order._id
  selectedOrder.value = order
  confirmCancellation.value = false
  reason.value = ''
  message.value = ''
}
async function confirmAction() {
  if (busy.value || !selectedOrder.value) return
  busy.value = true
  message.value = ''
  const order = selectedOrder.value
  try {
    await api.put('/shop/manage/orders/' + order._id + '/cancel', { reason: reason.value })
    selectedOrder.value = null
    emit('cancelled', order._id)
  } catch (error) {
    confirmCancellation.value = false
    message.value = errorMessage(error)
  } finally { busy.value = false }
  await loadOrders()
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
// Company responses already contain only that company's items.
function remainingTotal(order) {
  let total = 0
  for (const item of order.items) if (!item.rejected) total += item.price * item.quantity
  return total
}
function canRemove(order) {
  const category = orderCategory(order, now.value)
  return category === 'history' || category === 'cancelled'
}
async function removeOrder(order) {
  if (busy.value) return
  busy.value = true
  try {
    const response = await api.put('/shop/orders/' + order._id + '/hide')
    message.value = response.data.message
    pendingRemovalId.value = ''
    emit('removed', order._id)
  } catch (error) {
    pendingRemovalId.value = ''
    message.value = errorMessage(error)
  } finally { busy.value = false }
  await loadOrders()
}
onMounted(() => {
  loadOrders()
  timer = setInterval(() => { now.value = Date.now() }, 1000)
  refreshTimer = setInterval(() => {
    if (route.path === '/shop/orders') loadOrders()
  }, 10000)
})
onUnmounted(() => { clearInterval(timer); clearInterval(refreshTimer) })
</script>

<template>
  <section>
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div><h2 class="h4 mb-1">{{ heading }}</h2><p class="small text-muted mb-0">{{ count }} orders · {{ auth.user.role === 'admin' ? 'All companies' : 'Your company only' }} · Times shown in Singapore time</p></div>
      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="loading || busy" @click="loadOrders">Refresh management orders</button>
    </div>
    <p v-if="auth.user.role === 'business' && section === 'active'" class="small">Cancelling stops every company’s delivery for this order.</p>
    <p v-if="message" class="alert alert-info" role="status">{{ message }}</p>
    <p v-if="count === 0 && !loading" class="border rounded p-4">No orders in this section.</p>
    <article v-for="order in orders" v-show="inSection(order)" :key="order._id" class="pixel-card mb-4">
      <div class="p-3">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div><p class="small text-muted mb-1">ORDER REFERENCE</p><h3 class="h6 text-break mb-0">{{ order._id }}</h3></div>
          <span class="badge" :class="{ 'bg-success': orderCategory(order, now) === 'history', 'bg-danger': orderCategory(order, now) === 'cancelled', 'bg-primary': orderCategory(order, now) === 'active', 'bg-secondary': orderCategory(order, now) === 'untracked' }">{{ orderLabel(orderCategory(order, now)) }}</span>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-sm-5"><span class="small text-muted d-block">PLACED ON</span><strong class="small">{{ orderDate(order) }}</strong></div>
          <div class="col-6 col-sm-4"><span class="small text-muted d-block">RECIPIENT</span><strong class="text-break">{{ order.recipientName }}</strong></div>
          <div class="col-6 col-sm-3"><span class="small text-muted d-block">{{ auth.user.role === 'business' ? 'REMAINING SUBTOTAL' : 'REMAINING TOTAL' }}</span><strong>S${{ remainingTotal(order).toFixed(2) }}</strong></div>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-outline-primary btn-sm" @click="toggleDetails(order)">{{ expandedOrderId === order._id ? 'Hide details' : 'View details' }}</button>
          <button v-if="canCancelOrder(order, now)" type="button" class="btn btn-outline-danger btn-sm" :disabled="busy" @click="startAction(order)">Cancel order</button>
          <button v-if="canRemove(order)" type="button" class="btn btn-outline-danger btn-sm" :disabled="busy" @click="pendingRemovalId = order._id">Remove from my list</button>
        </div>
        <DeleteDialog v-if="pendingRemovalId === order._id" title="Confirm Removal" busy-label="Removing..." message="Remove this completed order from your list?" note="Only your list changes. The customer and other accounts keep their records." confirm-label="✓ Yes, Remove Order" :busy="busy" @cancel="!busy && (pendingRemovalId = '')" @confirm="removeOrder(order)" />
      </div>
      <div v-show="expandedOrderId === order._id" class="border-top p-3">
      <p v-if="orderCategory(order, now) === 'cancelled'" class="alert alert-danger">{{ cancellationText(order) }}</p>
      <h4 class="h6">Delivery details</h4><p class="small"><strong>Recipient:</strong> {{ order.recipientName }}<br /><strong>Address:</strong> {{ order.deliveryAddress }}</p>
      <p v-if="order.deliveryNote" class="small"><strong>Delivery note:</strong> {{ order.deliveryNote }}</p>
      <div v-for="parcel in order.packages" :key="parcel.companyId" class="border rounded p-2 mb-2">
        <strong>{{ parcel.companyName }}</strong>
        <template v-for="item in order.items" :key="item.id">
          <div v-if="item.companyId === parcel.companyId" class="small mb-2">
            <strong>{{ item.name }}</strong> × {{ item.quantity }} — ${{ (item.price * item.quantity).toFixed(2) }}
          </div>
        </template>
      </div>
      <div v-if="!order.packages?.length">
        <p>Older order: company package information was not saved. Read-only.</p>
        <ul><li v-for="item in order.items" :key="item.id">{{ item.name }} × {{ item.quantity }}</li></ul>
      </div>
      <p class="small fw-bold">Original {{ auth.user.role === 'business' ? 'company subtotal' : 'order total' }}: ${{ order.total.toFixed(2) }}</p>
      <template v-if="orderCategory(order, now) !== 'cancelled'">
        <p v-for="update in order.updates" :key="update._id" class="small">{{ update.message }}</p>
      </template>
      <form v-if="selectedOrder && selectedOrder._id === order._id" class="border rounded p-3 mt-3" @submit.prevent="confirmCancellation = true">
        <fieldset :disabled="busy">
          <legend class="h5">Cancel the whole order</legend>
          <label for="order-action-reason">Reason shown to the customer</label>
          <textarea id="order-action-reason" v-model.trim="reason" maxlength="300" required class="form-control mb-2"></textarea>
          <button class="btn btn-primary me-2" type="submit">Confirm cancellation</button>
          <button class="btn btn-outline-secondary" type="button" @click="selectedOrder = null">Cancel</button>
        </fieldset>
      </form>
      </div>
    </article>
    <DeleteDialog v-if="confirmCancellation && selectedOrder" title="Confirm Cancellation" busy-label="Cancelling..." message="Cancel all items in this order, including the other companies’ deliveries?" :note="'Reason shown to the customer: ' + reason" confirm-label="✓ Yes, Cancel Order" :busy="busy" @cancel="!busy && (confirmCancellation = false)" @confirm="confirmAction" />
  </section>
</template>
