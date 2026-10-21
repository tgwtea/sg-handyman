import mongoose from 'mongoose';

const userModel = {};

const userSchema = new mongoose.Schema({
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

userModel.setCompanyId = function(username, companyId) {
  return User.updateOne({ username }, { companyId });
};

userModel.upsertUser = function(user) {
  return User.updateOne({ username: user.username }, user, { upsert: true });
};

export default userModel;
