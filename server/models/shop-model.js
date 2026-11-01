// Purpose: describe saved orders and provide the database functions used by our controller.
import mongoose from 'mongoose';

const shopModel = {};

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientName: { type: String, required: true, maxlength: 80 },
  deliveryAddress: { type: String, required: true, maxlength: 300 },
  deliveryNote: { type: String, default: '', maxlength: 200 },
  items: [{
    id: Number,
    name: String,
    price: Number,
    quantity: Number,
    companyId: { type: String, default: '' },
    rejected: { type: Boolean, default: false },
    rejectionReason: { type: String, default: '' }
  }],
    packages: [{
    companyId: String,
    companyName: String,
    extraSeconds: { type: Number, default: 0 }
  }],
  updates: [{ companyId: String, message: String, createdAt: { type: Date, default: Date.now } }],
  total: { type: Number, required: true },
  // Duration is chosen once by the server, not restarted by the browser.
  deliveryDurationSeconds: { type: Number, min: 60, max: 600 },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('ShopOrder', orderSchema, 'shop_orders');

shopModel.createOrder = function(order) {
  return Order.create(order);
};

shopModel.findOrdersByUserId = function(userId) {
  return Order.find({ userId: userId });
};

shopModel.deleteAllOrders = function() {
  return Order.deleteMany({});
};

//for admin
shopModel.findAllOrders = function() {
  return Order.find()
};

shopModel.findCompanyOrders = function(companyId) {
  return Order.find({'packages.companyId': companyId})
};

shopModel.findOrderById = function(id) {
  return Order.findById(id)
};

shopModel.saveManagement = function(order){
  return Order.updateOne({ _id: order._id }, {
    items: order.items, packages: order.packages, updates: order.updates
  }, { runValidators: true });
}
export default shopModel;
