import mongoose from 'mongoose';

const reviewModel = {};

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Review = mongoose.model('Review', reviewSchema, 'reviews');

reviewModel.insertManyReviews = function(reviews) {
  return Review.insertMany(reviews);
};

reviewModel.deleteAllReviews = function() {
  return Review.deleteMany({});
};

reviewModel.findReviewsByCompanyId = function(companyId) {
  return Review.find({ companyId })
    .populate('userId', 'username')
    .sort({ createdAt: -1 });
};

reviewModel.findReviewById = function(reviewId) {
  return Review.findById(reviewId);
};

reviewModel.findReviewByUserAndCompany = function(userId, companyId) {
  return Review.findOne({ userId, companyId });
};

reviewModel.createReview = function(review) {
  return Review.create(review);
};

reviewModel.updateReview = function(reviewId, rating, comment) {
  return Review.findByIdAndUpdate(reviewId, { rating, comment }, { returnDocument: 'after', runValidators: true });
};

reviewModel.deleteReviewById = function(reviewId) {
  return Review.findByIdAndDelete(reviewId);
};

export default reviewModel;
