// Purpose: whole-order cancellation and personal order removal.
import Shop from '../models/shop-model.js';
const management = {};


// The earliest remaining package arrival is the cancellation deadline for the whole order.
function cancellationDeadline(order) {
  if (!order.packages.length || !order.deliveryDurationSeconds) return 0;
  let deadline = 0;
  for (const item of order.items) {
    if (item.rejected) continue;
    let extraSeconds = 0;
    for (const parcel of order.packages) {
      if (parcel.companyId === item.companyId) extraSeconds = parcel.extraSeconds;
    }
    const finish = new Date(order.createdAt).getTime() + (order.deliveryDurationSeconds + extraSeconds) * 1000;
    if (deadline === 0 || finish < deadline) deadline = finish;
  }
  return deadline;
}
function validReason(body) {
  return body && typeof body.reason === 'string' && body.reason.trim().length > 0 && body.reason.trim().length <= 300;
}
function sendError(error, res) {
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid order reference.' });
  console.error(error.message);
  res.status(500).json({ message: 'Could not update orders. Please retry.' });
}

management.getOrders = async (req, res) => {
  try {
    const user = req.session.user;
    if (user.role === 'admin') {
      const orders = await Shop.findAllOrders();
      const visible = [];
      for (const order of orders) {
        if (!order.hiddenFor.includes(String(user._id))) visible.push(order);
      }
      return res.json(visible);
    }
    if (!user.companyId) return res.status(403).json({ message: 'Your account needs a linked company.' });
    const orders = await Shop.findCompanyOrders(String(user.companyId));
    const result = [];
    
    for (const order of orders) {
      if (order.hiddenFor.includes(String(user._id))) continue;
      const items = [];
      const packages = [];
      const updates = [];
      let total = 0;
      for (const item of order.items) {
        if (item.companyId === String(user.companyId)) {
          items.push(item);
          total += item.price * item.quantity;
        }
      }
      for (const parcel of order.packages) if (parcel.companyId === String(user.companyId)) packages.push(parcel);
      for (const update of order.updates) if (update.companyId === String(user.companyId) || update.companyId === '') updates.push(update);
      result.push({ _id: order._id, recipientName: order.recipientName, deliveryAddress: order.deliveryAddress,
        deliveryNote: order.deliveryNote, createdAt: order.createdAt, deliveryDurationSeconds: order.deliveryDurationSeconds,
        items: items, packages: packages, updates: updates, total: total, cancelUntil: cancellationDeadline(order) });
    }
    res.json(result);
  } catch (error) { sendError(error, res); }
};

// All cancellations now apply to the WHOLE order, regardless of which company starts it.
management.cancelOrder = async (req, res) => {
  if (!validReason(req.body)) return res.status(400).json({ message: 'Give a reason of 1–300 characters.' });
  try {
    const order = await Shop.findOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    const user = req.session.user;
    let allowed = user.role === 'admin' || String(order.userId) === String(user._id);
    if (user.role === 'business' && user.companyId) {
      for (const parcel of order.packages) {
        if (parcel.companyId === String(user.companyId)) allowed = true;
      }
    }
    if (!allowed) return res.status(403).json({ message: 'You may cancel only your own order or an order involving your company.' });
    if (!order.packages.length || !order.deliveryDurationSeconds) {
      return res.status(409).json({ message: 'This older order has no complete delivery timing and cannot be cancelled.' });
    }
    const deadline = cancellationDeadline(order);
    if (!deadline) return res.status(409).json({ message: 'This order is already cancelled.' });
    if (Date.now() >= deadline) return res.status(409).json({ message: 'A package has already arrived. This order can no longer be cancelled.' });
    let actor = 'Customer';
    if (user.role === 'admin') actor = 'Admin';
    else if (user.role === 'business') actor = 'Company';
    const reason = req.body.reason.trim();
    for (const item of order.items) {
      if (!item.rejected) {
        item.rejected = true;
        item.rejectionReason = 'Cancelled by ' + actor.toLowerCase() + '. Reason: ' + reason;
      }
    }
    // Empty companyId marks an order-wide update, visible to every participating company.
    order.updates.push({ companyId: '', message: actor + ' cancelled the whole order: ' + reason });
    const result = await Shop.saveManagement(order);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Order not found.' });
    res.json({ message: 'Order cancelled. All companies’ remaining deliveries have stopped.' });
  } catch (error) { sendError(error, res); }
};
// A completed order has no travelling, non-rejected items.
// No timing information means we cannot confirm completion for that older order.
function orderFinished(order, companyId = '') {
  for (const item of order.items) {
    if (companyId && item.companyId !== companyId) continue;
    if (item.rejected) continue;
    if (!order.deliveryDurationSeconds) return false;
    let extraSeconds = 0;
    for (const parcel of order.packages) {
      if (parcel.companyId === item.companyId) extraSeconds = parcel.extraSeconds;
    }
    const finish = new Date(order.createdAt).getTime() + (order.deliveryDurationSeconds + extraSeconds) * 1000;
    if (Date.now() < finish) return false;
  }
  return true;
}

// Removal hides a completed record only for this account; company ownership is checked too.
management.hideOrder = async (req, res) => {
  try {
    const order = await Shop.findOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    const user = req.session.user;
    let allowed = user.role === 'admin' || (user.role === 'customer' && String(order.userId) === String(user._id));
    let companyId = '';
    if (user.role === 'business' && user.companyId) {
      companyId = String(user.companyId);
      for (const parcel of order.packages) {
        if (parcel.companyId === companyId) allowed = true;
      }
    }
    if (!allowed) return res.status(403).json({ message: 'You may remove only your own order or an order involving your company.' });
    if (!orderFinished(order, companyId)) return res.status(409).json({ message: 'Only delivered or fully cancelled orders can be removed.' });
    const userId = String(user._id);
    if (!order.hiddenFor.includes(userId)) order.hiddenFor.push(userId);
    const result = await Shop.hideOrder(order._id, order.hiddenFor);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Order not found.' });
    res.json({ message: 'Order removed from your list. Other accounts keep their records.' });
  } catch (error) { sendError(error, res); }
};
export default management;
