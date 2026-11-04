import mongoose from 'mongoose';

const reviewModel = {};

// one optional photo, stored in the review like the images on forum posts
const imageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  data: {
    type: Buffer,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  }
});

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
  // the booking this review is for
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
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
  image: imageSchema,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// one review per booking: MongoDB rejects a second insert with error code 11000
reviewSchema.index({ bookingId: 1 }, { unique: true, partialFilterExpression: { bookingId: { $exists: true } } });

const Review = mongoose.model('Review', reviewSchema, 'reviews');

reviewModel.insertManyReviews = function(reviews) {
  return Review.insertMany(reviews);
};

reviewModel.deleteAllReviews = function() {
  return Review.deleteMany({});
};

// leaves out the photo data, which GET /reviews/:reviewId/image sends separately
reviewModel.findReviewsByCompanyId = function(companyId) {
  return Review.find({ companyId })
    .select('-image.data')
    .populate('userId', 'username')
    .sort({ createdAt: -1 });
};

// [{ companyId, average, count }]: one row per company that has reviews
reviewModel.findReviewSummaries = function() {
  return Review.aggregate([
    {
      $group: {
        _id: '$companyId',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
        latestReview: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        _id: 0,
        companyId: '$_id',
        average: 1,
        count: 1,
        latestReview: 1
      }
    }
  ]);
};

reviewModel.findReviewById = function(reviewId) {
  return Review.findById(reviewId);
};

reviewModel.findReviewImage = function(reviewId) {
  return Review.findById(reviewId).select('image');
};

reviewModel.findReviewByBookingId = function(bookingId) {
  return Review.findOne({ bookingId });
};

reviewModel.deleteReviewByBookingId = function(bookingId) {
  return Review.deleteOne({ bookingId });
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
