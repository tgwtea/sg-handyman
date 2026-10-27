import mongoose from 'mongoose';

const userModel = {};

const userSchema = new mongoose.Schema({

  // Each account owns one shopping cart. Adress and payment information not yet
  shopCart: [{ id: Number, name: String, price: Number, quantity: { type: Number, min: 1 } }],
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['customer', 'business', 'admin'],
    default: 'customer'
  },
  // set for business users only: the company they manage
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }
});

const User = mongoose.model('User', userSchema, 'users');

userModel.findUserByUsername = function(username) {
  return User.findOne({ username });
};

userModel.findUserById = function(userId) {
  return User.findById(userId);
};

userModel.findUsersByRole = function(role) {
  return User.find({ role });
};

userModel.insertManyUsers = function(users) {
  return User.insertMany(users);
};

userModel.deleteAllUsers = function() {
  return User.deleteMany({});
};

// Update only the logged-in account's cart, not touching other account fields .
userModel.saveShopCart = function(userId, items) {
  return User.updateOne({ _id: userId }, { shopCart: items }, { runValidators: true });
};

export default userModel;
