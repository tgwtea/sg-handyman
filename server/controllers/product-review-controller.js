// Purpose: read ratings and allow purchasers to manage their own product review.
import Review from '../models/product-review-model.js';
import Product from '../models/product-model.js';
import Shop from '../models/shop-model.js';

const reviewController = {};

// Search saved order snapshots; the browser cannot grant itself purchase permission.
async function hasPurchased(userId, productId) {
  const orders = await Shop.findOrdersByUserId(userId);
  for (const order of orders) {
    for (const item of order.items) {
      if (item.id === productId) return true;
    }
  }
  return false;
}

function validateReview(body) {
  if (!body || typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5 || body.rating % 1 !== 0) return 'Choose a whole-star rating from 1 to 5.';
  if (typeof body.comment !== 'string' || !body.comment.trim() || body.comment.trim().length > 1000) return 'Write a review of 1 to 1000 characters.';
  return '';
}

// Public card summaries, calculated with ordinary loops instead of aggregation.
reviewController.getSummaries = async (req, res) => {
  try {
    const reviews = await Review.findAll();
    const summaries = [];
    for (const review of reviews) {
      let summary;
      for (const item of summaries) {
        if (item.productId === review.productId) summary = item;
      }
      if (!summary) {
        summary = { productId: review.productId, total: 0, count: 0, average: 0 };
        summaries.push(summary);
      }
      summary.total += review.rating;
      summary.count += 1;
      summary.average = summary.total / summary.count;
    }
    res.json(summaries);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Could not load product ratings.' });
  }
};

reviewController.getReviews = async (req, res) => {
  const id = Number(req.params.id);
  if (!(id >= 1) || id % 1 !== 0) return res.status(400).json({ message: 'Invalid product ID.' });
  try {
    const product = await Product.findProductById(id);
    if (!product || product.removed) return res.status(404).json({ message: 'Product unavailable.' });
    const reviews = await Review.findByProduct(id);
    const user = req.session.user;
    const result = [];
    let alreadyReviewed = false;
    for (const review of reviews) {
      const mine = !!user && String(review.userId) === user._id;
      if (mine) alreadyReviewed = true;
      result.push({ _id: review._id, rating: review.rating, comment: review.comment, username: review.username, createdAt: review.createdAt, mine: mine });
    }
    let purchased = false;
    if (user) purchased = await hasPurchased(user._id, id);
    res.json({ reviews: result, purchased: purchased, canReview: purchased && !alreadyReviewed });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Could not load product reviews.' });
  }
};

reviewController.createReview = async (req, res) => {
  const id = Number(req.params.id);
  if (!(id >= 1) || id % 1 !== 0) return res.status(400).json({ message: 'Invalid product ID.' });
  const invalid = validateReview(req.body);
  if (invalid) return res.status(400).json({ message: invalid });
  try {
    const product = await Product.findProductById(id);
    if (!product || product.removed) return res.status(404).json({ message: 'Product unavailable.' });
    const user = req.session.user;
    if (!await hasPurchased(user._id, id)) return res.status(403).json({ message: 'Purchase this product before reviewing it.' });
    const existing = await Review.findOwn(id, user._id);
    if (existing) return res.status(409).json({ message: 'You already reviewed this product. Edit your review instead.' });
    await Review.create({ productId: id, userId: user._id, username: user.username, rating: req.body.rating, comment: req.body.comment.trim() });
    res.status(201).json({ message: 'Review added.' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You already reviewed this product. Edit your review instead.' });
    console.error(error.message);
    res.status(500).json({ message: 'Could not save your review.' });
  }
};

// The model filters by BOTH product and session user. Other authors cannot be edited.
reviewController.updateReview = async (req, res) => {
  const id = Number(req.params.id);
  if (!(id >= 1) || id % 1 !== 0) return res.status(400).json({ message: 'Invalid product ID.' });
  const invalid = validateReview(req.body);
  if (invalid) return res.status(400).json({ message: invalid });
  try {
    const result = await Review.updateOwn(id, req.session.user._id, req.body.rating, req.body.comment.trim());
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Your review was not found.' });
    res.json({ message: 'Review updated.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Could not update your review.' });
  }
};

reviewController.deleteReview = async (req, res) => {
  const id = Number(req.params.id);
  if (!(id >= 1) || id % 1 !== 0) return res.status(400).json({ message: 'Invalid product ID.' });
  try {
    const result = await Review.deleteOwn(id, req.session.user._id);
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Your review was not found.' });
    res.json({ message: 'Review deleted.' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Could not delete your review.' });
  }
};
export default reviewController;
