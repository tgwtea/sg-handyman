import mongoose from 'mongoose';
import Review from '../models/review-model.js';
import Booking from '../models/booking-model.js';

const reviewController = {};

const MAX_COMMENT_LENGTH = 1000;

// returns an error message, or null when the rating and comment are valid
function validateReview(rating, comment) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return 'Rating must be a whole number from 1 to 5';
  }
  if (comment.length > MAX_COMMENT_LENGTH) {
    return `Comment must be at most ${MAX_COMMENT_LENGTH} characters`;
  }
  return null;
}

reviewController.getCompanyReviews = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).send({ message: 'Invalid company id' });
    }

    const [reviews, bookings] = await Promise.all([
      Review.findReviewsByCompanyId(companyId),
      Booking.findBookingsByCompanyId(companyId)
    ]);

    // each user's latest booking at the company, shown on their review
    const latestBooking = new Map();
    for (const booking of bookings) {
      const userId = String(booking.userId);
      const start = booking.timeslotId?.start ?? null;
      const current = latestBooking.get(userId);
      if (!current || (start && (!current.start || start > current.start))) {
        latestBooking.set(userId, { service: booking.service, start });
      }
    }
    const user = req.session.user;


    const result = reviews.map((review) => {
      const authorId = review.userId ? String(review.userId._id) : null;
      return {
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        username: review.userId?.username ?? 'Deleted user',
        booking: latestBooking.get(authorId) ?? null,
        mine: !!user && authorId === user._id
      };
    });

    // a customer can write a review once they have a booking, and only one review per company
    const hasBooking = user?.role === 'customer' && latestBooking.has(user._id);
    const canReview = hasBooking && !result.some((review) => review.mine);

    res.send({ reviews: result, hasBooking, canReview });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to load reviews' });
  }
};

reviewController.createReview = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).send({ message: 'Invalid company id' });
    }

    const rating = Number(req.body.rating);
    const comment = String(req.body.comment ?? '').trim();
    const invalid = validateReview(rating, comment);
    if (invalid) {
      return res.status(400).send({ message: invalid });
    }

    const userId = req.session.user._id;
    if (!await Booking.findBookingByUserAndCompany(userId, companyId)) {
      return res.status(403).send({ message: 'Only customers who booked this company can review it' });
    }
    if (await Review.findReviewByUserAndCompany(userId, companyId)) {
      return res.status(409).send({ message: 'You already reviewed this company. Edit your review instead.' });
    }

    const review = await Review.createReview({ userId, companyId, rating, comment });
    res.status(201).send(review);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to create review' });
  }
};

reviewController.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.isValidObjectId(reviewId)) {
      return res.status(400).send({ message: 'Invalid review id' });
    }

    const review = await Review.findReviewById(reviewId);
    if (!review) {
      return res.status(404).send({ message: 'Review not found' });
    }
    // only the author edits a review: the company cannot change it
    if (String(review.userId) !== req.session.user._id) {
      return res.status(403).send({ message: 'You can only edit your own review' });
    }

    const rating = Number(req.body.rating);
    const comment = String(req.body.comment ?? '').trim();
    const invalid = validateReview(rating, comment);
    if (invalid) {
      return res.status(400).send({ message: invalid });
    }

    const updated = await Review.updateReview(review._id, rating, comment);
    res.send(updated);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to update review' });
  }
};

reviewController.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    if (!mongoose.isValidObjectId(reviewId)) {
      return res.status(400).send({ message: 'Invalid review id' });
    }

    const review = await Review.findReviewById(reviewId);
    if (!review) {
      return res.status(404).send({ message: 'Review not found' });
    }
    // the author or an admin can delete a review; a business user cannot
    const user = req.session.user;
    if (user.role !== 'admin' && String(review.userId) !== user._id) {
      return res.status(403).send({ message: 'You can only delete your own review' });
    }

    await Review.deleteReviewById(review._id);
    res.send({ message: 'Review deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to delete review' });
  }
};

export default reviewController;
