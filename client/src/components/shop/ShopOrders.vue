<script setup>
// Purpose: customer order summaries, expandable details and personal removal of completed records.
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import { orderCategory, orderLabel, orderDate } from '@/utils/shop-orders'
import ShopDeliveryTracker from './ShopDeliveryTracker.vue'
import ShopConfirmDialog from './ShopConfirmDialog.vue'
const props = defineProps({ orders: Array, loading: Boolean, message: String, section: String })
const emit = defineEmits(['refresh', 'delivery-update', 'removed'])
const auth = useAuthStore()
const now = ref(Date.now())
const expandedOrderId = ref('')
const pendingRemovalId = ref('')
const removing = ref(false)
const removalMessage = ref('')
let timer

const heading = computed(() => {
  if (props.section === 'history') return 'Order history'
  if (props.section === 'cancelled') return 'Cancelled orders'
  return 'Active orders'
})
function inSection(order) {
  const category = orderCategory(order, now.value)
  if (props.section === 'history') return category === 'history' || category === 'untracked'
  return category === props.section
}
const count = computed(() => {
  let total = 0
  for (const order of props.orders) if (inSection(order)) total++
  return total
})
function toggleDetails(order) {
  if (expandedOrderId.value === order._id) expandedOrderId.value = ''
  else expandedOrderId.value = order._id
}
function packageItems(order, parcel) {
  const items = []
  for (const item of order.items) if (item.companyId === parcel.companyId) items.push(item)
  return items
}
function packageHasItems(order, parcel) {
  for (const item of packageItems(order, parcel)) if (!item.rejected) return true
  return false
}
function remainingTotal(order) {
  let total = 0
  for (const item of order.items) if (!item.rejected) total += item.price * item.quantity
  return total
}
function canRemove(order) {
  if (!auth.user || auth.user.role === 'business') return false
  const category = orderCategory(order, now.value)
  return category === 'history' || category === 'cancelled'
}
async function removeOrder(order) {
  if (removing.value) return
  removing.value = true
  removalMessage.value = ''
  try {
    const response = await api.put('/shop/orders/' + order._id + '/hide')
    removalMessage.value = response.data.message
    pendingRemovalId.value = ''
    emit('removed', order._id)
  } catch (error) {
    removalMessage.value = error.response ? error.response.data.message : 'Could not remove this order.'
  } finally { removing.value = false }
}
// Reuse the already approved interval pattern so orders move to History when time runs out.
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { clearInterval(timer) })
</script>

<template>
  <section>
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div><h2 class="h4 mb-1">{{ heading }}</h2><p class="small text-muted mb-0">{{ count }} orders · Times shown in Singapore time</p></div>
      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="loading || removing" @click="emit('refresh')">Refresh orders</button>
    </div>
    <p v-if="message" class="text-danger">{{ message }}</p>
    <p v-if="removalMessage" class="alert alert-info">{{ removalMessage }}</p>
    <p v-if="count === 0 && !loading && !message" class="border rounded p-4">No orders in this section.</p>
    <!-- v-show keeps the existing delivery trackers mounted when details/categories are hidden. -->
    <article v-for="order in orders" v-show="inSection(order)" :key="order._id" class="order-card border rounded mb-3">
      <div class="p-3">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div><p class="small text-muted mb-1">ORDER REFERENCE</p><h3 class="h6 text-break mb-0">{{ order._id }}</h3></div>
          <span class="badge" :class="{ 'bg-success': orderCategory(order, now) === 'history', 'bg-danger': orderCategory(order, now) === 'cancelled', 'bg-primary': orderCategory(order, now) === 'active', 'bg-secondary': orderCategory(order, now) === 'untracked' }">{{ orderLabel(orderCategory(order, now)) }}</span>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-sm-5"><span class="small text-muted d-block">PLACED ON</span><strong class="small">{{ orderDate(order) }}</strong></div>
          <div class="col-6 col-sm-4"><span class="small text-muted d-block">RECIPIENT</span><strong class="text-break">{{ order.recipientName }}</strong></div>
          <div class="col-6 col-sm-3"><span class="small text-muted d-block">REMAINING TOTAL</span><strong>S${{ remainingTotal(order).toFixed(2) }}</strong></div>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-outline-primary btn-sm" @click="toggleDetails(order)">{{ expandedOrderId === order._id ? 'Hide details' : 'View details' }}</button>
          <button v-if="canRemove(order)" type="button" class="btn btn-outline-danger btn-sm" :disabled="removing" @click="pendingRemovalId = order._id">Remove from my list</button>
        </div>
        <ShopConfirmDialog v-if="pendingRemovalId === order._id" title="Confirm removal" message="Remove this completed order from your list?" note="Only your list changes. Other accounts keep their order records." confirm-label="✓ Yes, Remove Order" :busy="removing" :error="removalMessage" @cancel="pendingRemovalId = ''" @confirm="removeOrder(order)" />
      </div>
      <div v-show="expandedOrderId === order._id" class="border-top p-3">
        <h4 class="h6">Delivery details</h4>
        <p v-if="order.deliveryAddress" class="small mb-1"><strong>Address:</strong> {{ order.deliveryAddress }}</p>
        <p v-if="order.deliveryNote" class="small"><strong>Delivery note:</strong> {{ order.deliveryNote }}</p>
        <div v-if="order.packages && order.packages.length" class="mt-3">
          <div v-for="parcel in order.packages" :key="parcel.companyId" class="border rounded p-3 mb-3">
            <h4 class="h6 mb-3">{{ parcel.companyName }} package</h4>
            <ul class="list-unstyled">
              <li v-for="item in packageItems(order, parcel)" :key="item.id" class="border-bottom py-2">
                <div class="d-flex justify-content-between gap-2"><strong class="small">{{ item.name }} × {{ item.quantity }}</strong><span class="small">S${{ (item.price * item.quantity).toFixed(2) }}</span></div>
                <p v-if="item.rejected" class="small text-danger mb-0">Cancelled — {{ item.rejectionReason }}</p>
              </li>
            </ul>
            <ShopDeliveryTracker v-if="packageHasItems(order, parcel)" :order="order" :parcel="parcel" @delivery-update="emit('delivery-update', $event)" />
            <p v-else class="small text-danger mb-0">All items in this package were cancelled.</p>
          </div>
        </div>
        <template v-else>
          <ul class="small mt-3"><li v-for="item in order.items" :key="item.id"><strong>{{ item.name }}</strong> × {{ item.quantity }} — S${{ (item.price * item.quantity).toFixed(2) }}</li></ul>
          <ShopDeliveryTracker v-if="order.deliveryDurationSeconds && orderCategory(order, now) !== 'cancelled'" :order="order" @delivery-update="emit('delivery-update', $event)" />
          <p v-else-if="!order.deliveryDurationSeconds" class="small text-muted">Delivery tracking is unavailable for this older order.</p>
        </template>
        <div class="border-top pt-3 small"><p class="mb-1"><strong>Original total:</strong> S${{ order.total.toFixed(2) }}</p><p class="mb-0"><strong>Non-cancelled items:</strong> S${{ remainingTotal(order).toFixed(2) }}</p></div>
        <div v-if="order.updates && order.updates.length" class="alert alert-info mt-3 mb-0">
          <h4 class="h6">Order updates</h4><p v-for="update in order.updates" :key="update._id" class="small mb-1">{{ update.message }}</p>
        </div>
      </div>
    </article>
  </section>
</template>
