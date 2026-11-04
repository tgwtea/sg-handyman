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
