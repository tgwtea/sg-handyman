// Purpose: company package delays/item rejections and admin order inspection/rejection.
import Shop from '../models/shop-model.js';
const management = {};


function hasArrived(order, parcel) {
  const seconds = order.deliveryDurationSeconds + parcel.extraSeconds;
  return Date.now() >= new Date(order.createdAt).getTime() + seconds * 1000;
}
function hasRemainingItems(order, companyId) {
  for (const item of order.items) {
    if (item.companyId === companyId && !item.rejected) return true;
  }
  return false;
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
    if (user.role === 'admin') return res.json(await Shop.findAllOrders());
    if (!user.companyId) return res.status(403).json({ message: 'Your account needs a linked company.' });
    const orders = await Shop.findCompanyOrders(String(user.companyId));
    const result = [];
    
    for (const order of orders) {
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
      for (const update of order.updates) if (update.companyId === String(user.companyId)) updates.push(update);
      result.push({ _id: order._id, recipientName: order.recipientName, deliveryAddress: order.deliveryAddress,
        deliveryNote: order.deliveryNote, createdAt: order.createdAt, deliveryDurationSeconds: order.deliveryDurationSeconds,
        items: items, packages: packages, updates: updates, total: total });
    }
    res.json(result);
  } catch (error) { sendError(error, res); }
};

management.delayPackage = async (req, res) => {
  if (!validReason(req.body)) return res.status(400).json({ message: 'Give a reason of 1–300 characters.' });
  const minutes = req.body.minutes;
  if (typeof minutes !== 'number' || !(minutes >= 1 && minutes <= 60) || minutes % 1 !== 0) {
    return res.status(400).json({ message: 'Add 1–60 whole minutes.' });
  }
  try {
    const order = await Shop.findOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    let parcel;
    for (const item of order.packages) if (item.companyId === String(req.session.user.companyId)) parcel = item;
    if (!parcel) return res.status(403).json({ message: 'This is not your company package.' });
    if (!hasRemainingItems(order, parcel.companyId) || hasArrived(order, parcel)) {
      return res.status(409).json({ message: 'This package is already delivered or fully rejected.' });
    }
    parcel.extraSeconds += minutes * 60;
    order.updates.push({ companyId: parcel.companyId, message: parcel.companyName + ' delayed its package by ' + minutes + ' minutes: ' + req.body.reason.trim() });
    const result = await Shop.saveManagement(order);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Order not found.' });
    res.json({ message: 'Package delayed. All its remaining items share the new arrival time.' });
  } catch (error) { 
    sendError(error, res);
  }
};

management.rejectItem = async (req, res) => {
  if (!validReason(req.body)) return res.status(400).json({ message: 'Give a reason of 1–300 characters.' });
  try {
    const order = await Shop.findOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    let selected;
    for (const item of order.items) if (item.id === Number(req.params.productId)) selected = item;
    if (!selected || selected.companyId !== String(req.session.user.companyId)) {
      return res.status(403).json({ message: 'You may reject only your own company items.' });
    }
    let parcel;
    for (const item of order.packages) if (item.companyId === selected.companyId) parcel = item;
    if (!parcel || selected.rejected || hasArrived(order, parcel)) {
      return res.status(409).json({ message: 'This item is already delivered or rejected.' });
    }
    selected.rejected = true;
    selected.rejectionReason = req.body.reason.trim();
    order.updates.push({ companyId: parcel.companyId, message: parcel.companyName + ' rejected ' + selected.name + ' (all ' + selected.quantity + '): ' + selected.rejectionReason });
    const result = await Shop.saveManagement(order);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Order not found.' });
    res.json({ message: 'Item rejected. Other items keep their delivery time.' });
  } catch (error) { sendError(error, res); }
};

management.rejectOrder = async (req, res) => {
  if (!validReason(req.body)) return res.status(400).json({ message: 'Give a reason of 1–300 characters.' });
  try {
    const order = await Shop.findOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!order.packages.length) return res.status(409).json({ message: 'This older order has no package records and is read-only.' });
    let remaining = false;
    for (const parcel of order.packages) {
      if (hasRemainingItems(order, parcel.companyId)) {
        remaining = true;
        if (hasArrived(order, parcel)) return res.status(409).json({ message: 'An active package is already delivered; the whole order cannot be rejected.' });
      }
    }
    if (!remaining) return res.status(409).json({ message: 'The order is already fully rejected.' });
    for (const parcel of order.packages) {
      if (hasRemainingItems(order, parcel.companyId)) {
        order.updates.push({ companyId: parcel.companyId, message: 'Admin rejected the remaining items in ' + parcel.companyName + "'s package: " + req.body.reason.trim() });
      }
    }
    for (const item of order.items) {
      if (!item.rejected) { item.rejected = true; item.rejectionReason = req.body.reason.trim(); }
    }
    const result = await Shop.saveManagement(order);
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Order not found.' });
    res.json({ message: 'Order rejected. Its history is retained.' });
  } catch (error) { sendError(error, res); }
};
export default management;
