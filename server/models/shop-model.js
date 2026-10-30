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
    quantity: Number
  }],
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

export default shopModel;
