import express from 'express';
import shopController from '../controllers/shop-controller.js';
import management from '../controllers/shop-management-controller.js';
import productReviewController from '../controllers/product-review-controller.js';
import { requireLogin, requireRole} from '../middleware/auth.js';

const router = express.Router();

// GET /shop/products calls our getProducts function.
router.get('/products', shopController.getProducts);


// Managing orders / deliveries and managing review for admin
router.get('/manage/orders', requireRole('business','admin'), management.getOrders);
router.put('/manage/orders/:id/cancel', requireRole('business','admin'), management.cancelOrder);
router.get('/manage/reviews', requireRole('admin'), productReviewController.getAdminReviews);
router.delete('/manage/reviews/:reviewId', requireRole('admin'), productReviewController.deleteAdminReview);

// POST createorder
// only customers buy: business and admin accounts manage orders instead
router.post('/orders', requireRole('customer'), shopController.createOrder);
//check role first
router.post('/products', requireRole('business','admin'), shopController.createProduct);
//：id identifies the existing product, using the product id path as guide
router.put('/products/:id', requireRole('business','admin'), shopController.updateProduct);
router.delete('/products/:id', requireRole('business','admin'), shopController.removeProduct);

// personal order.
router.get('/orders', requireRole('customer','admin'), shopController.getMyOrders);
// Customer cancels their own order; the controller also checks ownership and arrival time.
router.put('/orders/:id/cancel', requireRole('customer','admin'), management.cancelOrder);
// Hide only a finished record from the signed-in customer's/admin's list.
router.put('/orders/:id/hide', requireRole('customer','business','admin'), management.hideOrder);

// Account carts use the same login session as orders.
router.get('/cart', requireRole('customer'), shopController.getCart);
router.put('/cart', requireRole('customer'), shopController.saveCart);

//for product review
router.get('/reviews/summary', productReviewController.getSummaries);
router.get('/products/:id/reviews', productReviewController.getReviews);
router.post('/products/:id/reviews', requireLogin, productReviewController.createReview);
router.put('/products/:id/reviews', requireLogin, productReviewController.updateReview);
router.delete('/products/:id/reviews', requireLogin, productReviewController.deleteReview);

export default router;
