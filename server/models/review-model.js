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

export default reviewModel;
