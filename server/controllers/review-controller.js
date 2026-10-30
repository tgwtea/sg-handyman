import mongoose from 'mongoose';
import Review from '../models/review-model.js';
import Booking from '../models/booking-model.js';

const reviewController = {};

const MAX_COMMENT_LENGTH = 1000;
const ALREADY_REVIEWED_MESSAGE = 'You already reviewed this booking. Edit your review instead.';

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

reviewController.getReviewSummaries = async (req, res) => {
  try {
    const summaries = await Review.findReviewSummaries();
    res.send(summaries);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to load review summaries' });
  }
};

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

    // service and start of every booking, and each user's latest booking for seeded reviews
    const bookingDetails = new Map();
    const latestBooking = new Map();
    for (const booking of bookings) {
      const userId = String(booking.userId);
      const details = { service: booking.service, start: booking.timeslotId?.start ?? null };
      bookingDetails.set(String(booking._id), details);
      const current = latestBooking.get(userId);
      if (!current || (details.start && (!current.start || details.start > current.start))) {
        latestBooking.set(userId, details);
      }
    }
    const user = req.session.user;

    const result = reviews.map((review) => {
      const authorId = review.userId ? String(review.userId._id) : null;
      const booking = review.bookingId ? bookingDetails.get(String(review.bookingId)) : latestBooking.get(authorId);
      return {
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        username: review.userId?.username ?? 'Deleted user',
        booking: booking ?? null,
        mine: !!user && authorId === user._id
      };
    });

    // a customer can review each of their bookings once
    const isCustomer = user?.role === 'customer';
    const reviewedIds = new Set(reviews.map((review) => String(review.bookingId)));
    const reviewableBookings = isCustomer
      ? bookings
        .filter((booking) => String(booking.userId) === user._id && !reviewedIds.has(String(booking._id)))
        .map((booking) => ({ _id: booking._id, ...bookingDetails.get(String(booking._id)) }))
      : [];

    res.send({
      reviews: result,
      hasBooking: isCustomer && latestBooking.has(user._id),
      reviewableBookings
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to load reviews' });
  }
};

reviewController.createReview = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { bookingId } = req.body;
    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).send({ message: 'Invalid company id' });
    }
    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).send({ message: 'Choose a booking to review' });
    }

    const rating = Number(req.body.rating);
    const comment = String(req.body.comment ?? '').trim();
    const invalid = validateReview(rating, comment);
    if (invalid) {
      return res.status(400).send({ message: invalid });
    }

    const userId = req.session.user._id;
    const booking = await Booking.findBookingById(bookingId);
    if (!booking || String(booking.userId) !== userId || String(booking.companyId) !== companyId) {
      return res.status(403).send({ message: 'You can only review your own bookings at this company' });
    }
    if (await Review.findReviewByBookingId(booking._id)) {
      return res.status(409).send({ message: ALREADY_REVIEWED_MESSAGE });
    }

    const review = await Review.createReview({ userId, companyId, bookingId: booking._id, rating, comment });
    res.status(201).send(review);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).send({ message: ALREADY_REVIEWED_MESSAGE });
    }
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
