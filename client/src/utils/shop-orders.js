// Purpose: readable order labels shared by the customer and management screens.
// These are our functions, using ordinary loops, conditions and the existing Date APIs.
export function orderCategory(order, currentTime) {
  let remaining = false
  let travelling = false
  let untracked = false
  for (const item of order.items) {
    if (item.rejected) continue
    remaining = true
    let extraSeconds = 0
    for (const parcel of order.packages || []) {
      if (parcel.companyId === item.companyId) extraSeconds = parcel.extraSeconds
    }
    if (!order.deliveryDurationSeconds) untracked = true
    else {
      const finish = new Date(order.createdAt).getTime() + (order.deliveryDurationSeconds + extraSeconds) * 1000
      if (currentTime < finish) travelling = true
    }
  }
  if (!remaining) return 'cancelled'
  if (travelling) return 'active'
  if (untracked) return 'untracked'
  return 'history'
}

export function orderLabel(category) {
  if (category === 'active') return 'In progress'
  if (category === 'cancelled') return 'Cancelled'
  if (category === 'untracked') return 'Tracking unavailable'
  return 'Delivered'
}

export function orderDate(order) {
  return new Date(order.createdAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })
}

// Whole-order cancellation is allowed only before ANY non-cancelled package arrives.
// A company's response includes the full-order deadline, even though its items are filtered.
export function canCancelOrder(order, currentTime) {
  if (order.cancelUntil !== undefined) return currentTime < order.cancelUntil
  if (!order.packages || !order.packages.length || !order.deliveryDurationSeconds) return false
  let remaining = false
  for (const item of order.items) {
    if (item.rejected) continue
    remaining = true
    for (const parcel of order.packages) {
      if (parcel.companyId !== item.companyId) continue
      const finish = new Date(order.createdAt).getTime() + (order.deliveryDurationSeconds + parcel.extraSeconds) * 1000
      if (currentTime >= finish) return false
    }
  }
  return remaining
}

// Existing cancellation records already identify the actor at the start of their update.
export function cancellationText(order) {
  let message = 'Order cancelled.'
  for (const update of order.updates || []) {
    if (update.message.includes('cancelled the whole order')) message = update.message
  }
  // Earlier company cancellations could contain the customer's fixed form reason.
  if (message === 'Company cancelled the whole order: Cancelled by customer.') return 'Company cancelled the whole order.'
  if (message === 'Admin cancelled the whole order: Cancelled by customer.') return 'Admin cancelled the whole order.'
  return message
}
