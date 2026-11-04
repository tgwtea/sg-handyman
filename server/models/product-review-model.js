// Purpose: store product reviews separately from company/booking reviews.
import mongoose from 'mongoose';

const reviewModel = {};
const reviewSchema = new mongoose.Schema({
  productId: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
});
// Approved extra: the pair must be unique, even if two requests arrive together.
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
const Review = mongoose.model('ProductReview', reviewSchema, 'product_reviews');

reviewModel.findAll = function() {
  return Review.find();
};
reviewModel.findByProduct = function(productId) {
  return Review.find({ productId: productId });
};
reviewModel.findOwn = function(productId, userId) {
  return Review.findOne({ productId: productId, userId: userId });
};
reviewModel.create = async function(details) {
  // Wait for the unique index before accepting the first review.
  await Review.init();
  return Review.create(details);
};
reviewModel.updateOwn = function(productId, userId, rating, comment) {
  return Review.updateOne({ productId: productId, userId: userId }, { rating: rating, comment: comment }, { runValidators: true });
};
reviewModel.deleteOwn = function(productId, userId) {
  return Review.deleteOne({ productId: productId, userId: userId });
};

reviewModel.deleteById = function(id) { return Review.deleteOne({ _id: id }); };
export default reviewModel;

